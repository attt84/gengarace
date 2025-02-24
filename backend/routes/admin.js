const express = require('express');
const router = express.Router();

// GET /dashboard - Return dummy admin dashboard data
router.get('/dashboard', (req, res) => {
  const dashboardData = {
    totalUsers: 100,
    activeGames: 5,
    messagesSent: 2500
  };
  res.json({ dashboard: dashboardData });
});

// POST /banUser - Ban a user (dummy implementation)
router.post('/banUser', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required.' });
  }
  // A real implementation would update user status in database
  res.json({ message: `User ${userId} has been banned.` });
});

module.exports = router;
