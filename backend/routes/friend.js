const express = require('express');
const router = express.Router();

// 友達管理のためのダミーデータ（本番ではDBに保存する）
let friends = {}; // キー: userId, 値: 友達のユーザーIDの配列

// 友達追加エンドポイント
router.post('/add', (req, res) => {
  const { userId, friendId } = req.body;
  if (!userId || !friendId) {
    return res.status(400).json({ message: 'userId と friendId は必須です' });
  }
  if (!friends[userId]) {
    friends[userId] = [];
  }
  if (!friends[userId].includes(friendId)) {
    friends[userId].push(friendId);
  }
  res.json({ message: '友達を追加しました', friends: friends[userId] });
});

// 友達削除エンドポイント
router.post('/remove', (req, res) => {
  const { userId, friendId } = req.body;
  if (!userId || !friendId) {
    return res.status(400).json({ message: 'userId と friendId は必須です' });
  }
  if (!friends[userId]) {
    return res.status(400).json({ message: 'ユーザーの友達リストが存在しません' });
  }
  friends[userId] = friends[userId].filter(id => id !== friendId);
  res.json({ message: '友達を削除しました', friends: friends[userId] });
});

// 友達リスト取得エンドポイント
router.get('/list', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: 'userId は必須です' });
  }
  res.json({ friends: friends[userId] || [] });
});

module.exports = router;
