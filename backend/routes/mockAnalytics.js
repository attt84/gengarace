const express = require('express');

module.exports = function() {
  const router = express.Router();
  
  // インメモリデータ
  const gameStats = {
    totalGames: 25,
    activePlayers: 12,
    averageGameDuration: 180, // seconds
    mostActiveTime: '18:00-20:00',
    popularGameTypes: [
      { type: 'standard', count: 15 },
      { type: 'speed', count: 7 },
      { type: 'challenge', count: 3 }
    ]
  };
  
  const leaderboard = [
    { userId: 'user1', username: 'player1', wins: 10, totalGames: 15, winRate: 0.67 },
    { userId: 'user2', username: 'player2', wins: 8, totalGames: 12, winRate: 0.67 },
    { userId: 'user3', username: 'player3', wins: 7, totalGames: 10, winRate: 0.70 },
    { userId: 'user4', username: 'player4', wins: 5, totalGames: 8, winRate: 0.63 },
    { userId: 'user5', username: 'player5', wins: 4, totalGames: 7, winRate: 0.57 }
  ];
  
  const userStats = {
    'user1': {
      gamesPlayed: 15,
      gamesWon: 10,
      winRate: 0.67,
      averageGameDuration: 165,
      favoriteGameType: 'standard',
      longestWinStreak: 4,
      achievements: ['First Win', 'Win Streak', 'Block Master']
    },
    'user2': {
      gamesPlayed: 12,
      gamesWon: 8,
      winRate: 0.67,
      averageGameDuration: 190,
      favoriteGameType: 'speed',
      longestWinStreak: 3,
      achievements: ['First Win', 'Speed Demon']
    }
  };

  // @route   GET api/analytics/overview
  // @desc    Get overall game statistics
  // @access  Public
  router.get('/overview', (req, res) => {
    try {
      res.json({ stats: gameStats });
    } catch (err) {
      console.error('Error getting analytics overview:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   GET api/analytics/leaderboard
  // @desc    Get player leaderboard
  // @access  Public
  router.get('/leaderboard', (req, res) => {
    try {
      const { limit, offset, sortBy } = req.query;
      
      let results = [...leaderboard];
      
      // ソート
      if (sortBy === 'winRate') {
        results.sort((a, b) => b.winRate - a.winRate);
      } else if (sortBy === 'totalGames') {
        results.sort((a, b) => b.totalGames - a.totalGames);
      } else {
        // デフォルトは勝利数でソート
        results.sort((a, b) => b.wins - a.wins);
      }
      
      // ページネーション
      const startIndex = parseInt(offset) || 0;
      const endIndex = startIndex + (parseInt(limit) || results.length);
      results = results.slice(startIndex, endIndex);
      
      res.json({ 
        leaderboard: results,
        total: leaderboard.length
      });
    } catch (err) {
      console.error('Error getting leaderboard:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   GET api/analytics/user/:userId
  // @desc    Get user statistics
  // @access  Private
  router.get('/user/:userId', (req, res) => {
    try {
      const userId = req.params.userId;
      
      // ユーザー統計を検索
      const stats = userStats[userId];
      if (!stats) {
        return res.status(404).json({ message: 'User stats not found' });
      }
      
      res.json({ stats });
    } catch (err) {
      console.error('Error getting user stats:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   GET api/analytics/games
  // @desc    Get game history and statistics
  // @access  Public
  router.get('/games', (req, res) => {
    try {
      const gameHistory = [
        {
          id: 'game1',
          type: 'standard',
          players: ['user1', 'user2'],
          winner: 'user1',
          duration: 150,
          date: '2025-02-25T10:30:00Z'
        },
        {
          id: 'game2',
          type: 'speed',
          players: ['user1', 'user3'],
          winner: 'user3',
          duration: 90,
          date: '2025-02-25T11:15:00Z'
        },
        {
          id: 'game3',
          type: 'standard',
          players: ['user2', 'user4'],
          winner: 'user2',
          duration: 180,
          date: '2025-02-25T12:00:00Z'
        }
      ];
      
      res.json({ games: gameHistory });
    } catch (err) {
      console.error('Error getting game history:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   POST api/analytics/track
  // @desc    Track user activity
  // @access  Private
  router.post('/track', (req, res) => {
    try {
      const { userId, event, data } = req.body;
      
      console.log(`Analytics event: ${event} from user ${userId}`, data);
      
      res.json({ success: true });
    } catch (err) {
      console.error('Error tracking analytics:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};
