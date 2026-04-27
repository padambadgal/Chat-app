// require('dotenv').config();
// const mongoose = require('mongoose');
// const User = require('./models/User');
// const bcrypt = require('bcryptjs');

// async function testPassword() {
//   try {
//     await mongoose.connect('mongodb://localhost:27017/chat_app');
//     console.log('Connected to MongoDB');
    
//     // Create a test user
//     const testUser = {
//       username: 'directtest',
//       email: 'direct@test.com',
//       password: 'password123'
//     };
    
//     const user = new User(testUser);
//     await user.save();
//     console.log('User created with ID:', user._id);
//     console.log('Stored password hash:', user.password);
    
//     // Test password comparison
//     const isMatch = await bcrypt.compare('password123', user.password);
//     console.log('Password match test:', isMatch ? '✅ Works' : '❌ Fails');
    
//     // Test login via model method
//     const foundUser = await User.findOne({ email: 'direct@test.com' });
//     const isValid = await foundUser.comparePassword('password123');
//     console.log('Model comparePassword test:', isValid ? '✅ Works' : '❌ Fails');
    
//     await mongoose.disconnect();
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

// testPassword();