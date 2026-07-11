const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  content: {
    type: String,
    required: true
  },

  type: {
    type: String,
    default: "text"
  },

  read: {
    type: Boolean,
    default: false
  },

  edited: {
    type: Boolean,
    default: false
  },

  // NEW
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  deletedAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });

messageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });
messageSchema.index({ receiver: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);