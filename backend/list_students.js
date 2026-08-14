
const mongoose = require('mongoose');
const Student = require('./src/models/Student');
require('dotenv').config();

async function listStudents() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const students = await Student.find({}, 'name email studentId googleId').limit(5);
        console.log('Students:', JSON.stringify(students, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listStudents();
