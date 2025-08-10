const express = require('express');
const router = express.Router();
const ProcessedMessage = require('../models/Message'); // Your Mongoose model
const io = require('../socket').getIO(); // Socket.io instance

function toDateFromUnixSeconds(s) {
  if (!s) return null;
  const n = Number(s);
  if (isNaN(n)) return null;
  return new Date(n * 1000);
}

async function upsertMessage(msgObj, rawPayload, contacts = [], metadata = {}) {
  const messageId = msgObj.id || msgObj.message_id || msgObj.mid || msgObj._id;
  if (!messageId) return;

  const businessNumber = metadata.display_phone_number || metadata.phone_number || metadata.phone_number_id;
  const contact = contacts.length ? contacts[0] : null;
  const wa_id = contact ? contact.wa_id : msgObj.from || msgObj.to || null;
  const contactName = contact?.profile?.name || contact?.name || null;
  const text = msgObj.text?.body || msgObj.body || null;
  const timestamp = toDateFromUnixSeconds(msgObj.timestamp) || (msgObj.timestamp_ms ? new Date(Number(msgObj.timestamp_ms)) : null);

  const direction = businessNumber && msgObj.from && String(msgObj.from) === String(businessNumber) ? 'outbound' : 'inbound';

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

  const updatedDoc = await ProcessedMessage.findOneAndUpdate(
    { messageId },
    { $setOnInsert: doc, $set: { rawPayload } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  io.emit('newMessage', updatedDoc);
  return updatedDoc;
}

async function applyStatus(statusObj, rawPayload, metadata = {}) {
  const metaMsgId = statusObj.meta_msg_id || statusObj.id || statusObj.message_id;
  if (!metaMsgId) return;
  const statusVal = statusObj.status;
  const at = toDateFromUnixSeconds(statusObj.timestamp);

  const res = await ProcessedMessage.findOneAndUpdate(
    { messageId: metaMsgId },
    {
      $set: { status: statusVal, updatedAt: new Date() },
      $push: { statusHistory: { status: statusVal, at, raw: statusObj } },
    },
    { new: true }
  );

  if (res) {
    io.emit('messageStatusUpdate', { messageId: metaMsgId, status: statusVal });
  } else {
    const newDoc = await new ProcessedMessage({
      messageId: metaMsgId,
      wa_id: statusObj.recipient_id || metadata?.phone_number_id || null,
      contactName: null,
      text: null,
      timestamp: at || new Date(),
      direction: 'outbound',
      status: statusVal,
      statusHistory: [{ status: statusVal, at, raw: statusObj }],
      rawPayload,
    }).save();

    io.emit('messageStatusUpdate', { messageId: metaMsgId, status: statusVal });
  }
}

router.post('/', async (req, res) => {
  try {
    const parsed = req.body;
    const entries = parsed.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const ch of changes) {
        const value = ch.value || ch;
        const contacts = value.contacts || [];
        const metadata = value.metadata || {};

        if (value.messages?.length) {
          for (const m of value.messages) {
            await upsertMessage(m, parsed, contacts, metadata);
          }
        }

        if (value.statuses?.length) {
          for (const s of value.statuses) {
            await applyStatus(s, parsed, metadata);
          }
        }

        if (value.status && value.id) {
          await applyStatus(value, parsed, metadata);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

module.exports = router;
