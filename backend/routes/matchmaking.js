const express = require('express');
const router = express.Router();

// Dummy data for matchmaking queue
let matchmakingQueue = [];

// Enqueue endpoint: add a user to matchmaking
router.post('/enqueue', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required.' });
  }
  if (!matchmakingQueue.includes(userId)) {
    matchmakingQueue.push(userId);
  }
  res.json({ message: 'User enqueued for matchmaking.', queue: matchmakingQueue });
});

// Leave endpoint: remove a user from matchmaking
router.post('/leave', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required.' });
  }
  matchmakingQueue = matchmakingQueue.filter(id => id !== userId);
  res.json({ message: 'User removed from matchmaking queue.', queue: matchmakingQueue });
});

// Get current queue endpoint
router.get('/queue', (req, res) => {
  res.json({ queue: matchmakingQueue });
});

module.exports = router;
