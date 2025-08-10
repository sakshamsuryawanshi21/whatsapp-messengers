/**
 * process_payloads.js
 *
 * Usage:
 *   MONGO_URI="your_mongo_uri" node process_payloads.js /path/to/payloads_folder
 *
 * What it does:
 * - Reads all JSON files in the provided folder
 * - Parses WhatsApp webhook-like payloads
 * - Inserts message documents into the `processed_messages` collection (db: whatsapp)
 * - Updates message status when status payloads are found (matching by id or meta_msg_id)
 *
 * Requirements:
 *   npm install mongoose dotenv
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp';
const PAYLOAD_DIR = process.argv[2];

if (!PAYLOAD_DIR) {
  console.error('Usage: MONGO_URI="..." node process_payloads.js /path/to/payloads');
  process.exit(1);
}

mongoose.set('strictQuery', false);

const processedMessageSchema = new mongoose.Schema({
  messageId: { type: String, unique: true, index: true, required: true },
  wa_id: String,
  contactName: String,
  text: String,
  timestamp: Date,
  direction: { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
  status: String,
  statusHistory: [
    {
      status: String,
      at: Date,
      raw: mongoose.Schema.Types.Mixed,
    },
  ],
  rawPayload: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

processedMessageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const ProcessedMessage = mongoose.model('processed_messages', processedMessageSchema);

async function connect() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
}

function toDateFromUnixSeconds(s) {
  if (!s) return null;
  const n = Number(s);
  if (isNaN(n)) return null;
  return new Date(n * 1000);
}

async function upsertMessage(msgObj, rawPayload, contacts = [], metadata = {}) {
  const messageId = msgObj.id || msgObj.message_id || msgObj.mid || msgObj._id;
  if (!messageId) {
    console.warn('Skipping message without id:', msgObj);
    return null;
  }

  const businessNumber = metadata.display_phone_number || metadata.phone_number || metadata.phone_number_id;
  const contact = contacts && contacts.length ? contacts[0] : null;
  const wa_id = contact ? contact.wa_id : msgObj.from || msgObj.to || null;
  const contactName = contact && contact.profile ? contact.profile.name : (contact && contact.name) || null;
  const text = (msgObj.text && (msgObj.text.body || msgObj.text)) || (msgObj.body || null);
  const timestamp = toDateFromUnixSeconds(msgObj.timestamp) || (msgObj.timestamp_ms ? new Date(Number(msgObj.timestamp_ms)) : null);

  const direction = businessNumber && msgObj.from && String(msgObj.from) === String(businessNumber) ? 'outbound' : 'inbound';

  // Document for first insert
  const doc = {
    messageId,
    wa_id,
    contactName,
    text,
    timestamp,
    direction,
    status: msgObj.status || (direction === 'outbound' ? 'sent' : 'received'),
    createdAt: new Date(),
  };

  try {
    const res = await ProcessedMessage.findOneAndUpdate(
      { messageId },
      {
        $setOnInsert: doc,        // only main fields go here
        $set: { rawPayload }      // rawPayload always updated here
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res;
  } catch (err) {
    console.error('Error upserting message', messageId, err.message);
    return null;
  }
}

async function applyStatus(statusObj, rawPayload, metadata = {}) {
  const metaMsgId = statusObj.meta_msg_id || statusObj.id || statusObj.message_id;
  if (!metaMsgId) {
    console.warn('Status without meta_msg_id/id, skipping', statusObj);
    return null;
  }
  const statusVal = statusObj.status;
  const at = toDateFromUnixSeconds(statusObj.timestamp);

  try {
    const res = await ProcessedMessage.findOneAndUpdate(
      { messageId: metaMsgId },
      {
        $set: { status: statusVal, updatedAt: new Date() },
        $push: {
          statusHistory: { status: statusVal, at, raw: statusObj },
        },
      },
      { new: true }
    );

    if (!res) {
      console.log(`Message ${metaMsgId} not found. Creating placeholder with status ${statusVal}.`);
      const placeholder = new ProcessedMessage({
        messageId: metaMsgId,
        wa_id: statusObj.recipient_id || (metadata && metadata.phone_number_id) || null,
        contactName: null,
        text: null,
        timestamp: at || new Date(),
        direction: 'outbound',
        status: statusVal,
        statusHistory: [{ status: statusVal, at, raw: statusObj }],
        rawPayload,
      });
      await placeholder.save();
      return placeholder;
    }

    return res;
  } catch (err) {
    console.error('Error applying status for', metaMsgId, err.message);
    return null;
  }
}

async function processFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    const entries = parsed.metaData && parsed.metaData.entry ? parsed.metaData.entry : (parsed.entry ? parsed.entry : []);
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const ch of changes) {
        const value = ch.value || ch;
        const contacts = value.contacts || [];
        const metadata = value.metadata || {};

        if (value.messages && Array.isArray(value.messages)) {
          for (const m of value.messages) {
            await upsertMessage(m, parsed, contacts, metadata);
          }
        }

        if (value.statuses && Array.isArray(value.statuses)) {
          for (const s of value.statuses) {
            await applyStatus(s, parsed, metadata);
          }
        }

        if (value.status && value.id) {
          await applyStatus(value, parsed, metadata);
        }
      }
    }
    console.log('Processed file:', path.basename(filePath));
  } catch (err) {
    console.error('Failed to process file', filePath, err.message);
  }
}

async function main() {
  await connect();
  const files = fs.readdirSync(PAYLOAD_DIR).filter((f) => f.toLowerCase().endsWith('.json'));
  console.log('Found', files.length, 'json files in', PAYLOAD_DIR);
  for (const f of files) {
    const fp = path.join(PAYLOAD_DIR, f);
    await processFile(fp);
  }
  console.log('Done processing all files.');
  mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
