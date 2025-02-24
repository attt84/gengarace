const express = require('express');
const router = express.Router();

// Dummy storage for chat messages
let chatMessages = [];

// POST /message - Send a chat message
router.post('/message', (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ message: 'userId and message are required.' });
  }
  const chatEntry = { userId, message, timestamp: new Date() };
  chatMessages.push(chatEntry);
  res.json({ message: 'Chat message sent successfully.', chatEntry });
});

// GET /messages - Get list of chat messages
router.get('/messages', (req, res) => {
  res.json({ messages: chatMessages });
});

module.exports = router;
