require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function clearAndFix() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/chat_app');
    console.log('✅ Connected to MongoDB');
    
    // Delete all existing users
    const deleteResult = await User.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} users`);
    
    // Create a new test user with proper password hashing
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: '123456'
    });
    
    await testUser.save();
    console.log('✅ New test user created with hashed password');
    console.log('User ID:', testUser._id);
    console.log('Username:', testUser.username);
    console.log('Email:', testUser.email);
    console.log('Password hash:', testUser.password);
    
    // Verify the password works
    const isValid = await testUser.comparePassword('123456');
    console.log('Password verification test:', isValid ? '✅ SUCCESS' : '❌ FAILED');
    
    await mongoose.disconnect();
    console.log('✅ Database cleanup complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearAndFix();