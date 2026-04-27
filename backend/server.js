const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

// Load env variables
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

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat_app';
console.log('Attempting to connect to MongoDB at:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('\nPlease make sure MongoDB is running.');
  console.log('Start MongoDB with: mongod\n');
});

// Import Models
const User = require('./models/User.js');
const Message = require('./models/Message.js');
const Conversation = require('./models/Conversation');

// Import Routes (with error handling)
let authRoutes, userRoutes, messageRoutes;

try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded');
} catch (err) {
  console.error('❌ Failed to load auth routes:', err.message);
}

try {
  userRoutes = require('./routes/users');
  console.log('✅ User routes loaded');
} catch (err) {
  console.error('❌ Failed to load user routes:', err.message);
}

try {
  messageRoutes = require('./routes/messages');
  console.log('✅ Message routes loaded');
} catch (err) {
  console.error('❌ Failed to load message routes:', err.message);
}

// Use routes if they exist
if (authRoutes) app.use('/api/auth', authRoutes);
if (userRoutes) app.use('/api/users', userRoutes);
if (messageRoutes) app.use('/api/messages', messageRoutes);


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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    next(new Error('Authentication error'));
  }
});

const userSockets = new Map();

io.on('connection', (socket) => {
  console.log(`✅ User ${socket.userId} connected`);
  userSockets.set(socket.userId, socket.id);
  
  socket.on('disconnect', () => {
    console.log(`❌ User ${socket.userId} disconnected`);
    userSockets.delete(socket.userId);
  });

  socket.on('private_message', async (data) => {
  try {
    console.log('📩 Incoming message:', data);

    const { receiverId, content } = data;

    // ✅ Save to DB
    const newMessage = await Message.create({
      sender: socket.userId,
      receiver: receiverId,
      text: content
    });

    // ✅ Populate sender & receiver
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar');

    // ✅ Send back to sender
    socket.emit('message_sent', populatedMessage);

    // ✅ Send to receiver if online
    const receiverSocketId = userSockets.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('private_message', populatedMessage);
    }

  } catch (err) {
    console.error('❌ Socket message error:', err);
  }
});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API test: http://localhost:${PORT}/api/test`);
  console.log(`📍 Auth endpoint: http://localhost:${PORT}/api/auth/register\n`);
});