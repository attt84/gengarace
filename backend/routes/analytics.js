const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// In-memory analytics storage (would use a database in production)
const analyticsData = {
  totalVisits: 5000,
  dailyActiveUsers: 300,
  averageSessionDuration: "5m",
  pageViews: {
    home: 3200,
    play: 4500,
    profile: 1800,
    rankings: 2100
  },
  gameStats: {
    totalGamesPlayed: 1250,
    averageGameDuration: 180, // seconds
    blocksRemovedAverage: 15,
    towerCollapseHeight: 12
  },
  userRetention: {
    day1: 75, // percentage
    day7: 45,
    day30: 28
  }
};

// Track game events for analytics
const gameEvents = [];

// @route   GET api/analytics/usage
// @desc    Get general usage analytics
// @access  Public
router.get('/usage', (req, res) => {
  res.json({ analytics: analyticsData });
});

// @route   GET api/analytics/games
// @desc    Get game-specific analytics
// @access  Public
router.get('/games', (req, res) => {
  res.json({ 
    gameStats: analyticsData.gameStats,
    userRetention: analyticsData.userRetention
  });
});

// @route   GET api/analytics/leaderboard
// @desc    Get leaderboard data
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    // Get top players by wins (limit to 10)
    const topPlayers = await User.find({})
      .sort({ 'stats.gamesWon': -1 })
      .limit(10)
      .select('username stats.gamesPlayed stats.gamesWon stats.fastestWin -_id');
    
    res.json({ leaderboard: topPlayers });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/analytics/user-stats
// @desc    Get authenticated user's statistics
// @access  Private
router.get('/user-stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('stats -_id');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate win rate
    const winRate = user.stats.gamesPlayed > 0 
      ? (user.stats.gamesWon / user.stats.gamesPlayed * 100).toFixed(1) 
      : 0;
    
    // Add calculated stats
    const enhancedStats = {
      ...user.stats.toObject(),
      winRate: `${winRate}%`,
      fastestWinFormatted: user.stats.fastestWin 
        ? `${Math.floor(user.stats.fastestWin / 60)}m ${user.stats.fastestWin % 60}s` 
        : 'N/A'
    };
    
    res.json({ stats: enhancedStats });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/analytics/track
// @desc    Track an analytics event
// @access  Public
router.post('/track', (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ message: 'Event type is required' });
    }
    
    // Record event with timestamp
    const event = {
      eventType,
      data: data || {},
      timestamp: Date.now(),
      ip: req.ip // In production, you'd want to anonymize this
    };
    
    // Store event
    gameEvents.push(event);
    
    // Update relevant analytics based on event type
    switch (eventType) {
      case 'pageView':
        if (data.page && analyticsData.pageViews[data.page] !== undefined) {
          analyticsData.pageViews[data.page]++;
        }
        break;
      case 'gameStart':
        analyticsData.gameStats.totalGamesPlayed++;
        break;
      case 'gameEnd':
        if (data.duration) {
          // Update average game duration (simple moving average)
          const currentTotal = analyticsData.gameStats.averageGameDuration * 
            (analyticsData.gameStats.totalGamesPlayed - 1);
          const newAverage = (currentTotal + data.duration) / 
            analyticsData.gameStats.totalGamesPlayed;
          analyticsData.gameStats.averageGameDuration = Math.round(newAverage);
        }
        break;
    }
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error tracking analytics event:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/analytics/events
// @desc    Get recent analytics events (admin only)
// @access  Private/Admin
router.get('/events', auth, async (req, res) => {
  try {
    // In a real app, you'd check if the user is an admin
    // For now, we'll just return the most recent 50 events
    const recentEvents = gameEvents
      .slice(-50)
      .reverse(); // newest first
    
    res.json({ events: recentEvents });
  } catch (err) {
    console.error('Error fetching analytics events:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
