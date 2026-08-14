const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Student = require('./src/models/Student')
const Teacher = require('./src/models/Teacher')
require('dotenv').config()

const MONGO_URI = process.env.MONGO_URI

async function testSyncLogic() {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI not found in .env')
        process.exit(1)
    }
    try {
        await mongoose.connect(MONGO_URI)
        console.log('✓ Connected to MongoDB')

        const testEmail = 'student@campusresolve.edu'
        const newPassword = 'newPassword123'
        
        // Find existing user
        const user = await Student.findOne({ email: testEmail })
        if (!user) {
            console.error('❌ Test student not found')
            process.exit(1)
        }

        console.log('--- Simulating Backend Sync Logic ---')
        
        // This simulates the logic inside /auth/reset-password-mongo
        const passwordHash = await bcrypt.hash(newPassword, 10)
        
        let updatedUser = await Student.findOneAndUpdate(
            { email: testEmail },
            { $set: { passwordHash: passwordHash, isPasswordSet: true } },
            { new: true }
        )

        if (!updatedUser) {
            updatedUser = await Teacher.findOneAndUpdate(
                { email: testEmail },
                { $set: { passwordHash: passwordHash, isPasswordSet: true } },
                { new: true }
            )
        }

        if (updatedUser) {
            const isMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash)
            if (isMatch) {
                console.log('✓ SUCCESS: MongoDB passwordHash updated and verified.')
                console.log(`  Updated email: ${updatedUser.email}`)
            } else {
                console.error('❌ FAILED: Password hash mismatch after update.')
            }
        } else {
            console.error('❌ FAILED: User not found during update.')
        }

        await mongoose.disconnect()
        process.exit(0)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

testSyncLogic()
