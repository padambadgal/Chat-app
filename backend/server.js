const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat_app';
console.log('Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Models
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Socket.IO with authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    next(new Error('Authentication error'));
  }
});

const userSockets = new Map();

io.on('connection', async (socket) => {
  console.log(`✅ User ${socket.userId} connected`);
  userSockets.set(socket.userId, socket.id);
  
  // Update user status to online
  try {
    await User.findByIdAndUpdate(socket.userId, { 
      status: 'online',
      lastSeen: new Date()
    });
    io.emit('user_status_change', { 
      userId: socket.userId, 
      status: 'online' 
    });
  } catch (error) {
    console.error('Error updating user status:', error);
  }

  socket.join(`user_${socket.userId}`);

  // Handle private message
  socket.on('private_message', async (data) => {
    try {
      const { receiverId, content, type = 'text' } = data;
      
      const message = new Message({
        sender: socket.userId,
        receiver: receiverId,
        content,
        type,
        timestamp: new Date()
      });
      await message.save();

      let conversation = await Conversation.findOne({
        participants: { $all: [socket.userId, receiverId] }
      });
      
      if (!conversation) {
        conversation = new Conversation({
          participants: [socket.userId, receiverId],
          lastMessage: message._id,
          updatedAt: new Date()
        });
      } else {
        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
      }
      await conversation.save();

      await message.populate('sender', 'username avatar email');
      
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('private_message', message);
      }
      
      socket.emit('message_sent', message);
      
    } catch (error) {
      console.error('Message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing_start', ({ receiverId }) => {
    const receiverSocketId = userSockets.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { 
        userId: socket.userId, 
        isTyping: true 
      });
    }
  });

  socket.on('typing_end', ({ receiverId }) => {
    const receiverSocketId = userSockets.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { 
        userId: socket.userId, 
        isTyping: false 
      });
    }
  });

  // Handle message read receipt
  socket.on('mark_read', async ({ messageId, senderId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { read: true });
      const senderSocketId = userSockets.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_read', { messageId });
      }
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // 🗑️ Handle delete single message
  socket.on('delete_message', async ({ messageId }) => {
    try {
      console.log(`🗑️ Delete message request: ${messageId} from user ${socket.userId}`);
      
      const message = await Message.findOne({
        _id: messageId,
        sender: socket.userId
      }).populate('sender', 'username avatar')
        .populate('receiver', 'username avatar');
      
      if (!message) {
        console.log('❌ Message not found or unauthorized');
        socket.emit('delete_error', { error: 'Message not found or unauthorized' });
        return;
      }
      
      // Delete the message
      await message.deleteOne();
      
      // Create deleted message data
      const deletedMessageData = {
        messageId: message._id,
        deletedBy: socket.userId,
        senderId: message.sender._id,
        receiverId: message.receiver._id,
        deletedAt: new Date(),
        isDeleted: true
      };
      
      // Notify sender
      const senderSocketId = userSockets.get(message.sender._id.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_deleted', deletedMessageData);
        console.log('📤 Delete notification sent to sender');
      }
      
      // Notify receiver
      const receiverSocketId = userSockets.get(message.receiver._id.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_deleted', deletedMessageData);
        console.log('📤 Delete notification sent to receiver');
      }
      
      console.log(`✅ Message ${messageId} deleted successfully`);
      
    } catch (error) {
      console.error('❌ Delete message error:', error);
      socket.emit('delete_error', { error: 'Failed to delete message' });
    }
  });

  // ✏️ Handle edit single message
  socket.on('edit_message', async ({ messageId, newContent }) => {
    try {
      console.log(`✏️ Edit message request: ${messageId} from user ${socket.userId}`);
      console.log(`📝 New content: ${newContent}`);
      
      const message = await Message.findOne({
        _id: messageId,
        sender: socket.userId
      }).populate('sender', 'username avatar')
        .populate('receiver', 'username avatar');
      
      if (!message) {
        console.log('❌ Message not found or unauthorized');
        socket.emit('edit_error', { error: 'Message not found or unauthorized' });
        return;
      }
      
      // Update the message
      message.content = newContent;
      message.edited = true;
      await message.save();
      
      const editedMessageData = {
        messageId: message._id,
        newContent: newContent,
        edited: true,
        senderId: message.sender._id,
        receiverId: message.receiver._id,
        updatedAt: new Date()
      };
      
      // Notify sender
      const senderSocketId = userSockets.get(message.sender._id.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_edited', editedMessageData);
        console.log('📤 Edit notification sent to sender');
      }
      
      // Notify receiver
      const receiverSocketId = userSockets.get(message.receiver._id.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_edited', editedMessageData);
        console.log('📤 Edit notification sent to receiver');
      }
      
      console.log(`✅ Message ${messageId} edited successfully`);
      
    } catch (error) {
      console.error('❌ Edit message error:', error);
      socket.emit('edit_error', { error: 'Failed to edit message' });
    }
  });


  // 🗑️ Handle clear chat
  socket.on('clear_chat', async ({ userId }) => {
    try {
      console.log(`🗑️ Clear chat request between ${socket.userId} and ${userId}`);
      
      const result = await Message.deleteMany({
        $or: [
          { sender: socket.userId, receiver: userId },
          { sender: userId, receiver: socket.userId }
        ]
      });
      
      console.log(`✅ Deleted ${result.deletedCount} messages`);
      
      await Conversation.findOneAndUpdate(
        {
          participants: { $all: [socket.userId, userId] }
        },
        {
          lastMessage: null,
          updatedAt: new Date()
        }
      );
      
      // Notify receiver
      const receiverSocketId = userSockets.get(userId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('chat_cleared', { 
          userId: socket.userId,
          clearedBy: socket.userId
        });
      }
      
      // Notify sender
      socket.emit('chat_cleared_success', { 
        userId: userId,
        deletedCount: result.deletedCount 
      });
      
    } catch (error) {
      console.error('❌ Clear chat error:', error);
      socket.emit('clear_chat_error', { error: 'Failed to clear chat' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`❌ User ${socket.userId} disconnected`);
    userSockets.delete(socket.userId);
    
    try {
      await User.findByIdAndUpdate(socket.userId, { 
        status: 'offline',
        lastSeen: new Date()
      });
      io.emit('user_status_change', { 
        userId: socket.userId, 
        status: 'offline' 
      });
    } catch (error) {
      console.error('Error updating user status on disconnect:', error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API test: http://localhost:${PORT}/api/test`);
});