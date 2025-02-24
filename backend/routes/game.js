const express = require('express');
const router = express.Router();

// ゲーム関連のエンドポイント
router.post('/start', (req, res) => {
  // ゲーム開始のロジックをここに実装
  res.json({ message: 'Game started.' });
});

router.post('/join', (req, res) => {
  // ゲーム参加のロジックをここに実装
  res.json({ message: 'Joined game.' });
});

module.exports = router;
