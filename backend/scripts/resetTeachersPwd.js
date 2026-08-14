require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Teacher = require('../src/models/Teacher');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const newHash = await bcrypt.hash('teach123', 10);
    const res = await Teacher.updateMany({}, { passwordHash: newHash, isPasswordSet: true });
    console.log(`Updated ${res.modifiedCount} teachers to use password 'teach123'`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
