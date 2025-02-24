const express = require('express');
const router = express.Router();

// Dummy data to simulate rankings
let globalRanking = [
  { userId: "user1", score: 1000 },
  { userId: "user2", score: 900 },
  { userId: "user3", score: 800 }
];

// Globalランキング取得エンドポイント
router.get('/global', (req, res) => {
  // 本番ではDBからスコアを集計してソートする
  res.json({ ranking: globalRanking });
});

// フレンドランキング取得エンドポイント
router.get('/friend', (req, res) => {
  const { userId, friendIds } = req.query; // friendIds should be comma-separated string
  if (!userId || !friendIds) {
    return res.status(400).json({ message: 'userId と friendIds は必須です' });
  }
  const friendIdsArray = friendIds.split(',');
  // Include the user's own score in friend ranking
  const ranking = globalRanking.filter(item => item.userId === userId || friendIdsArray.includes(item.userId));
  res.json({ ranking });
});

module.exports = router;
