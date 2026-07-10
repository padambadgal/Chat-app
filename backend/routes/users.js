const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');

// Search users
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

// Get user conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    })
    .populate('participants', '-password')
    .populate('lastMessage')
    .sort('-updatedAt');
    
    const formatted = conversations.map(conv => {
      const otherUser = conv.participants.find(
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
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (username) user.username = username;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;
    
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

module.exports = router;