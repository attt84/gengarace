const express = require('express');
const router = express.Router();

// GET /usage - Return dummy usage analytics data
router.get('/usage', (req, res) => {
  const analyticsData = {
    totalVisits: 5000,
    dailyActiveUsers: 300,
    averageSessionDuration: "5m"
  };
  res.json({ analytics: analyticsData });
});

module.exports = router;
