const express = require('express');
const router = express.Router();

// Dummy item data
let items = [
  { id: 1, name: "Block Adhesive", effect: "Glue blocks together" },
  { id: 2, name: "Gravity Shift", effect: "Reduce gravity effect" },
  { id: 3, name: "Extra Time", effect: "Provides extra move time" }
];

// GET /list - Return list of available items
router.get('/list', (req, res) => {
  res.json({ items });
});

// POST /use - Record that a user used an item
router.post('/use', (req, res) => {
  const { userId, itemId } = req.body;
  if (!userId || !itemId) {
    return res.status(400).json({ message: 'userId and itemId are required.' });
  }
  // In production, record the usage in database
  res.json({ message: 'Item used successfully', userId, itemId });
});

module.exports = router;
