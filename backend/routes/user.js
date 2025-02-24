const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ユーザー登録エンドポイント
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }
    const user = new User({ email, username, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error('Error in /register:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ログインエンドポイント
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    res.json({ message: 'Login successful.' });
  } catch (err) {
    console.error('Error in /login:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Protected route to get current user profile
const { authenticateToken } = require('../middleware/auth');
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
