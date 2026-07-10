require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat_app';
    console.log('Connecting to:', uri);
    
    // Connect without deprecated options
    await mongoose.connect(uri);
    console.log('✅ Connected successfully!');
    console.log('Database:', mongoose.connection.name);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();