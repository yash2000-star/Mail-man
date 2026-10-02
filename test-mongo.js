require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

console.log("Connecting to MongoDB...");
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
