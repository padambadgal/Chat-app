const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');


// ================= REGISTER =================
router.post('/register', async (req, res) => {
  console.log('=== REGISTRATION REQUEST ===');
  console.log('Request body:', req.body);

  try {
    const { username, email, password } = req.body;

    // 🔒 Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // 🔍 Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // ✅ Create user
    const user = new User({
      username,
      email,
      password // ⚠️ must be hashed in model pre-save
    });

    await user.save();

    console.log('User created:', user._id);
    console.log('Stored password:', user.password);

    // 🔑 Token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        password: user.password // ⚠️ for debugging only
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: error.message });
  }
});


// ================= LOGIN =================
router.post('/login', async (req, res) => {
  console.log('=== LOGIN REQUEST ===');
  console.log('Request body:', req.body);

  try {
    const { email, password } = req.body;

    // 🔒 Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 🔍 Find user
    const user = await User.findOne({ email });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Stored hash:', user.password);

    // 🔑 Compare password
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🔐 Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;