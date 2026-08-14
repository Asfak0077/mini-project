require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://asfakrahman43_db_user:ogR4BInjAyhGnzpz@cluster0.nvjmtrl.mongodb.net/?appName=Cluster0';

async function createAdmin() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const User = mongoose.connection.useDb('test').collection('users');
        let admin = await User.findOne({ email: 'admin@campusresolve.edu' });

        if (!admin) {
            console.log('Admin user not found, creating...');
            const hashedPassword = await bcrypt.hash('password123', 10);
            const newAdmin = {
                name: 'Admin User',
                email: 'admin@campusresolve.edu',
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const result = await User.insertOne(newAdmin);
            admin = await User.findOne({ _id: result.insertedId });
        }

        console.log('Admin User ID:', admin._id.toString());
        console.log('Email:', admin.email);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

createAdmin();
