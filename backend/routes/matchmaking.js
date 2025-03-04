const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Matchmaking queue with player data
let matchmakingQueue = [];

// Matchmaking settings
const MATCH_SKILL_RANGE = 200; // Maximum skill difference for matching
const MAX_QUEUE_TIME = 60000; // Max time in queue before expanding skill range (1 minute)
const QUEUE_CHECK_INTERVAL = 5000; // Check for matches every 5 seconds

// Enqueue endpoint: add a user to matchmaking
router.post('/enqueue', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user is already in queue
    const existingQueueEntry = matchmakingQueue.find(entry => entry.userId === userId);
    if (existingQueueEntry) {
      return res.json({ 
        message: 'User already in matchmaking queue.', 
        position: matchmakingQueue.indexOf(existingQueueEntry) + 1,
        estimatedWaitTime: getEstimatedWaitTime(existingQueueEntry)
      });
    }
    
    // Get user data for skill-based matching
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Add user to queue with timestamp and skill rating
    const queueEntry = {
      userId,
      username: user.username,
      skill: user.stats.rank || 1000, // Default skill if not ranked
      joinedAt: Date.now(),
      expandedSkillRange: false
    };
    
    matchmakingQueue.push(queueEntry);
    
    // Try to find a match immediately
    const match = findMatch(queueEntry);
    if (match) {
      // Match found, remove both players from queue
      matchmakingQueue = matchmakingQueue.filter(
        entry => entry.userId !== userId && entry.userId !== match.userId
      );
      
      // Return match data
      return res.json({
        message: 'Match found!',
        match: {
          opponent: {
            userId: match.userId,
            username: match.username
          },
          gameId: generateGameId(userId, match.userId),
          timestamp: Date.now()
        }
      });
    }
    
    // No immediate match, return queue position
    return res.json({ 
      message: 'User enqueued for matchmaking.', 
      position: matchmakingQueue.length,
      estimatedWaitTime: getEstimatedWaitTime(queueEntry)
    });
  } catch (err) {
    console.error('Error in matchmaking enqueue:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Leave endpoint: remove a user from matchmaking
router.post('/leave', auth, (req, res) => {
  const userId = req.user.id;
  
  // Remove user from queue
  const initialLength = matchmakingQueue.length;
  matchmakingQueue = matchmakingQueue.filter(entry => entry.userId !== userId);
  
  const wasRemoved = initialLength > matchmakingQueue.length;
  
  res.json({ 
    message: wasRemoved ? 'User removed from matchmaking queue.' : 'User was not in queue.',
    queue: matchmakingQueue.length
  });
});

// Get current queue status endpoint
router.get('/status', auth, (req, res) => {
  const userId = req.user.id;
  const userEntry = matchmakingQueue.find(entry => entry.userId === userId);
  
  if (userEntry) {
    res.json({
      inQueue: true,
      position: matchmakingQueue.indexOf(userEntry) + 1,
      waitTime: Date.now() - userEntry.joinedAt,
      estimatedWaitTime: getEstimatedWaitTime(userEntry),
      queueSize: matchmakingQueue.length
    });
  } else {
    res.json({
      inQueue: false,
      queueSize: matchmakingQueue.length
    });
  }
});

// Admin endpoint to view full queue (protected)
router.get('/queue', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized access.' });
    }
    
    res.json({ 
      queue: matchmakingQueue,
      queueSize: matchmakingQueue.length,
      averageWaitTime: calculateAverageWaitTime()
    });
  } catch (err) {
    console.error('Error accessing queue data:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Helper function to find a match for a player
function findMatch(player) {
  // Sort queue by join time (oldest first)
  const sortedQueue = [...matchmakingQueue].sort((a, b) => a.joinedAt - b.joinedAt);
  
  // Don't match player with themselves
  const potentialMatches = sortedQueue.filter(entry => entry.userId !== player.userId);
  
  for (const potentialMatch of potentialMatches) {
    // Check if skill difference is within range
    const skillDiff = Math.abs(player.skill - potentialMatch.skill);
    
    // Use expanded skill range if player has been waiting too long
    const useExpandedRange = 
      player.expandedSkillRange || 
      potentialMatch.expandedSkillRange ||
      (Date.now() - player.joinedAt > MAX_QUEUE_TIME) ||
      (Date.now() - potentialMatch.joinedAt > MAX_QUEUE_TIME);
    
    if (skillDiff <= (useExpandedRange ? MATCH_SKILL_RANGE * 2 : MATCH_SKILL_RANGE)) {
      return potentialMatch;
    }
  }
  
  return null;
}

// Helper function to generate a unique game ID
function generateGameId(userId1, userId2) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `game_${timestamp}_${randomStr}`;
}

// Helper function to estimate wait time
function getEstimatedWaitTime(queueEntry) {
  // Base wait time on queue position and historical data
  const queuePosition = matchmakingQueue.indexOf(queueEntry) + 1;
  const averageWaitTime = calculateAverageWaitTime();
  
  // Adjust based on skill level (higher/lower skill = longer wait)
  const skillFactor = calculateSkillFactor(queueEntry.skill);
  
  return Math.round(averageWaitTime * queuePosition * skillFactor);
}

// Helper function to calculate average wait time
function calculateAverageWaitTime() {
  // Default to 30 seconds if no data
  if (matchmakingQueue.length === 0) return 30000;
  
  const now = Date.now();
  const waitTimes = matchmakingQueue.map(entry => now - entry.joinedAt);
  const totalWaitTime = waitTimes.reduce((sum, time) => sum + time, 0);
  
  return totalWaitTime / matchmakingQueue.length;
}

// Helper function to calculate skill factor
function calculateSkillFactor(skill) {
  // Players with very high or very low skill may wait longer
  const averageSkill = 1000;
  const skillDiff = Math.abs(skill - averageSkill);
  
  // Skill factor ranges from 1.0 to 2.0
  return 1.0 + (skillDiff / 1000);
}

// Periodically check for matches and expand skill ranges for waiting players
setInterval(() => {
  // Update expanded skill range flag for players waiting too long
  matchmakingQueue.forEach(entry => {
    if (Date.now() - entry.joinedAt > MAX_QUEUE_TIME && !entry.expandedSkillRange) {
      entry.expandedSkillRange = true;
    }
  });
  
  // Try to match players
  for (let i = 0; i < matchmakingQueue.length; i++) {
    const player = matchmakingQueue[i];
    const match = findMatch(player);
    
    if (match) {
      // Remove both players from queue
      matchmakingQueue = matchmakingQueue.filter(
        entry => entry.userId !== player.userId && entry.userId !== match.userId
      );
      
      // In a real implementation, we would notify both players via WebSocket
      console.log(`Match found: ${player.username} vs ${match.username}`);
      
      // Adjust loop counter since we removed elements
      i--;
    }
  }
}, QUEUE_CHECK_INTERVAL);

module.exports = router;
