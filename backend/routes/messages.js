const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { v4: uuidv4 } = require('uuid');

router.post('/send', async (req, res) => {
  try {
    const io = req.app.get('io'); // Socket.io instance
    const { wa_id, contactName, text, status, messageId } = req.body;

    if (!wa_id || !text) {
      return res.status(400).json({ error: 'wa_id and text are required' });
    }

    const newMessage = new Message({
      messageId: messageId || `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      wa_id,
      contactName: contactName || 'Unknown',
      text,
      status: status || 'sent',
      timestamp: new Date(),
      direction: 'outbound',
      createdAt: new Date(),
    });

    const saved = await newMessage.save();

    io.emit('newMessage', saved);

    res.status(201).json(saved);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/chats', async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: '$wa_id',
          contactName: { $first: '$contactName' },
          lastMessage: { $last: '$text' },
          lastTimestamp: { $last: '$timestamp' },
          lastStatus: { $last: '$status' },
        },
      },
      { $sort: { lastTimestamp: -1 } },
    ]);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/chats/:wa_id', async (req, res) => {
  try {
    const messages = await Message.find({ wa_id: req.params.wa_id })
      .sort({ timestamp: 1 })
      .select('messageId wa_id text timestamp status direction contactName');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
