const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound index for participants
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);