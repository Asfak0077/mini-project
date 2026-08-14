require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://asfakrahman43_db_user:ogR4BInjAyhGnzpz@cluster0.nvjmtrl.mongodb.net/?appName=Cluster0';

async function getAdminId() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const User = mongoose.connection.useDb('test').collection('users');
        const admin = await User.findOne({ email: 'admin@campusresolve.edu' });

        if (admin) {
            console.log('Admin User Found:');
            console.log('ID:', admin._id.toString());
            console.log('Email:', admin.email);
        } else {
            console.log('Admin user not found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

getAdminId();
