const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const Message = require('../models/Message.js');
const bcrypt = require('bcryptjs');
// Upload avatar
const multer = require('multer');
const path = require('path');

router.get('/conversations', auth, async (req, res) => {
  try {
    console.log('USER ID:', req.userId);

    const conversations = await Conversation.find({
      participants: req.userId
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const formatted = conversations.map(conv => {
      const otherUser = (conv.participants || []).find(
        p => p._id.toString() !== req.userId
      );

      return {
        _id: conv._id,
        user: otherUser || null,
        lastMessage: conv.lastMessage || null,
        updatedAt: conv.updatedAt
      };
    });

    res.json(formatted);

  } catch (error) {
    console.error('🔥 ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ 2. search
router.get('/search', auth, async (req, res) => {
  try {
    const { q = '' } = req.query;

    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
      .select('-password')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, avatar, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update basic info
    if (username) user.username = username;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;

    // Update password if provided
    if (currentPassword && newPassword) {
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      user.password = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    res.json({ avatar: avatarUrl });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ❌ 3. dynamic route LAST
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;