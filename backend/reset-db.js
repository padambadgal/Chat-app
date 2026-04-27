// require('dotenv').config();
// const mongoose = require('mongoose');

// async function resetDatabase() {
//   try {
//     await mongoose.connect('mongodb://localhost:27017/chat_app');
//     console.log('Connected to MongoDB');
    
//     // Drop the users collection
//     await mongoose.connection.db.dropCollection('users');
//     console.log('Users collection dropped');
    
//     console.log('Database reset complete!');
//     await mongoose.disconnect();
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

// resetDatabase();