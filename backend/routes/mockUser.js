const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = function(inMemoryDB) {
  const router = express.Router();

  // @route   POST api/users/register
  // @desc    Register a user
  // @access  Public
  router.post('/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Simple validation
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
      }

      // Check for existing user
      const userExists = inMemoryDB.users.find(user => user.email === email);
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create salt & hash
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // Create user
      const newUser = {
        id: `user${inMemoryDB.users.length + 1}`,
        username,
        email,
        password: hash,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          fastestWin: null
        }
      };

      // Add to in-memory DB
      inMemoryDB.users.push(newUser);

      // Create token
      const token = jwt.sign(
        { user: { id: newUser.id } },
        process.env.JWT_SECRET || 'jenga_race_secret_key_2025',
        { expiresIn: '1h' }
      );

      res.json({
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          stats: newUser.stats
        }
      });
    } catch (err) {
      console.error('Error in register:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   POST api/users/login
  // @desc    Login a user
  // @access  Public
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Simple validation
      if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
      }

      // Check for existing user
      const user = inMemoryDB.users.find(user => user.email === email);
      if (!user) {
        return res.status(400).json({ message: 'User does not exist' });
      }

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Create token
      const token = jwt.sign(
        { user: { id: user.id } },
        process.env.JWT_SECRET || 'jenga_race_secret_key_2025',
        { expiresIn: '1h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          stats: user.stats
        }
      });
    } catch (err) {
      console.error('Error in login:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // @route   GET api/users/me
  // @desc    Get user data
  // @access  Private
  router.get('/me', (req, res) => {
    try {
      // Get token from header
      const token = req.header('x-auth-token');

      // Check if no token
      if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jenga_race_secret_key_2025');
      
      // Get user
      const user = inMemoryDB.users.find(user => user.id === decoded.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          stats: user.stats
        }
      });
    } catch (err) {
      console.error('Error in get user:', err);
      res.status(401).json({ message: 'Token is not valid' });
    }
  });

  // @route   PUT api/users/profile
  // @desc    Update user profile
  // @access  Private
  router.put('/profile', (req, res) => {
    try {
      // Get token from header
      const token = req.header('x-auth-token');

      // Check if no token
      if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jenga_race_secret_key_2025');
      
      // Get user
      const userIndex = inMemoryDB.users.findIndex(user => user.id === decoded.user.id);
      if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user
      const { username } = req.body;
      if (username) {
        inMemoryDB.users[userIndex].username = username;
      }

      res.json({
        user: {
          id: inMemoryDB.users[userIndex].id,
          username: inMemoryDB.users[userIndex].username,
          email: inMemoryDB.users[userIndex].email,
          stats: inMemoryDB.users[userIndex].stats
        }
      });
    } catch (err) {
      console.error('Error in update profile:', err);
      res.status(401).json({ message: 'Token is not valid' });
    }
  });

  return router;
};
