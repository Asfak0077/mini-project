require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://asfakrahman43_db_user:ogR4BInjAyhGnzpz@cluster0.nvjmtrl.mongodb.net/?appName=Cluster0';

async function updateAdminPassword() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const User = mongoose.connection.useDb('test').collection('users');
        const adminEmail = 'admin@campusresolve.edu';

        // Check if admin exists
        const admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log('Admin user not found. Creating one...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const newAdmin = {
                name: 'Admin User',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await User.insertOne(newAdmin);
            console.log('Admin user created with password "admin123".');
        } else {
            console.log('Admin user found. Updating password...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.updateOne(
                { email: adminEmail },
                { $set: { password: hashedPassword, updatedAt: new Date() } }
            );
            console.log('Admin password updated to "admin123".');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

updateAdminPassword();
