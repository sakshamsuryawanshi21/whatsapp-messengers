const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messageId: { type: String, unique: true, required: true },
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
}, { collection: 'processed_messages' });  // <--- Important

module.exports = mongoose.model('Message', messageSchema);
