const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Student = require('../models/Student')
const { connectDatabase } = require('../config/db')

const resetPassword = async () => {
    try {
        await connectDatabase()

        const email = 'asf28146@gmail.com'
        const newPassword = 'password123'

        console.log(`Resetting password for ${email}...`)

        let student = await Student.findOne({ email })

        if (!student) {
            console.log(`User ${email} not found in Student collection. Creating new student...`)
            const hashedPassword = await bcrypt.hash(newPassword, 10)
            student = await Student.create({
                name: 'Asfak Rahman',
                email: email,
                passwordHash: hashedPassword,
                isPasswordSet: true,
                role: 'student',
                studentId: 'TEMP001',
                department: 'CSE'
            })
            console.log(`User created successfully with password: ${newPassword}`)
        } else {
            console.log(`User found. Updating password...`)
            const hashedPassword = await bcrypt.hash(newPassword, 10)
            student.passwordHash = hashedPassword
            student.isPasswordSet = true
            await student.save()
            console.log(`Password for ${email} has been reset to: ${newPassword}`)
        }

    } catch (error) {
        console.error('Reset failed:', error)
    } finally {
        // Force close connection
        try {
            await mongoose.disconnect()
        } catch (e) { }
        process.exit()
    }
}

resetPassword()
