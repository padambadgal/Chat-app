const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');

// Get messages between users
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: userId },
        { sender: userId, receiver: req.userId }
      ]
    })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar')
    .sort('-createdAt')
    .limit(parseInt(limit));
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a single message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findOne({
      _id: messageId,
      sender: req.userId
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }
    
    await message.deleteOne();
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit a message
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const message = await Message.findOne({
      _id: messageId,
      sender: req.userId
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }
    
    message.content = content;
    message.edited = true;
    await message.save();
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear all messages between two users
router.delete('/clear/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;
    
    console.log(`🗑️ Clearing chat between ${currentUserId} and ${userId}`);
    
    const result = await Message.deleteMany({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    });
    
    console.log(`✅ Deleted ${result.deletedCount} messages`);
    
    await Conversation.findOneAndUpdate(
      {
        participants: { $all: [currentUserId, userId] }
      },
      {
        lastMessage: null,
        updatedAt: new Date()
      }
    );
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Cleared ${result.deletedCount} messages` 
    });
    
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;