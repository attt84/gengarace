const express = require('express');
const router = express.Router();

// Dummy storage for replay data
let replays = [];

// Save replay endpoint
router.post('/save', (req, res) => {
  const replayData = req.body;
  if (!replayData || Object.keys(replayData).length === 0) {
    return res.status(400).json({ message: 'Replay data is required.' });
  }
  replays.push(replayData);
  res.json({ message: 'Replay saved successfully.', replayId: replays.length - 1 });
});

// Get list of replays endpoint
router.get('/list', (req, res) => {
  res.json({ replays });
});

module.exports = router;
