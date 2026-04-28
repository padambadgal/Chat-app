const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// ✅ Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Messages route working ✅' });
});

// ✅ Main route
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('Logged user:', req.userId);
    console.log('Chat with:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: userId },
        { sender: userId, receiver: req.userId }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages.reverse());

  } catch (error) {
    console.error('MESSAGE ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/messages/:id', auth, async (req, res) => {
  try {
    const { text } = req.body;

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can edit
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    message.text = text;
    message.edited = true;

    await message.save();

    res.json(message);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;