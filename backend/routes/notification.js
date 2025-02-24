const express = require('express');
const router = express.Router();

// Dummy notifications storage
let notifications = [];

// POST /send - Send a notification to a specified user
router.post('/send', (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ message: 'userId and message are required.' });
  }
  // In production, insert notification into database or dispatch it
  const notification = { userId, message, sentAt: new Date() };
  notifications.push(notification);
  res.json({ message: 'Notification sent successfully.', notification });
});

module.exports = router;
