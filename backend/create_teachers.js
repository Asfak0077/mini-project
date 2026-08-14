#!/usr/bin/env node

/**
 * Script to create teacher accounts for all 6 departments
 * Run: node create_teachers.js
 */

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const Teacher = require('./src/models/Teacher')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campusresolve-redressal'

const departments = [
    { dept: 'CSE', teacherId: 'TCH-CSE-001', name: 'CSE Teacher', email: 'cse.teacher@campusresolve.edu', password: 'CSE@123' },
    { dept: 'ECE', teacherId: 'TCH-ECE-001', name: 'ECE Teacher', email: 'ece.teacher@campusresolve.edu', password: 'ECE@123' },
    { dept: 'MECH', teacherId: 'TCH-MECH-001', name: 'MECH Teacher', email: 'mech.teacher@campusresolve.edu', password: 'MECH@123' },
    { dept: 'EEE', teacherId: 'TCH-EEE-001', name: 'EEE Teacher', email: 'eee.teacher@campusresolve.edu', password: 'EEE@123' },
    { dept: 'AIDS', teacherId: 'TCH-AIDS-001', name: 'AIDS Teacher', email: 'aids.teacher@campusresolve.edu', password: 'AIDS@123' },
    { dept: 'IT', teacherId: 'TCH-IT-001', name: 'IT Teacher', email: 'it.teacher@campusresolve.edu', password: 'IT@123' }
]

async function createTeachers() {
    try {
        console.log('Connecting to MongoDB...')
        await mongoose.connect(MONGO_URI)
        console.log('✓ Connected to MongoDB\n')

        console.log('Creating demo teacher accounts for all departments...\n')
        console.log('='.repeat(70))

        for (const { dept, teacherId, name, email, password } of departments) {
            // Check by email or teacherId to avoid duplicates
            const teacherExists = await Teacher.findOne({ $or: [{ email }, { teacherId }] })

            if (!teacherExists) {
                const passwordHash = await bcrypt.hash(password, 10)
                await Teacher.create({
                    teacherId,
                    name,
                    email,
                    department: dept,
                    designation: 'Teacher',
                    passwordHash,
                    activeComplaints: 0,
                    resolvedComplaints: 0,
                    phone: '',
                    specialization: dept,
                    emailNotifications: true,
                    isActive: true,
                    role: 'teacher'
                })
                console.log(`✓ Created ${dept.padEnd(6)} teacher: ${name}`)
                console.log(`  Email: ${email}`)
                console.log(`  Password: ${password}`)
                console.log('-'.repeat(70))
            } else {
                console.log(`✓ ${dept.padEnd(6)} teacher already exists with Email: ${email}`)
                
                // Update their password and role to match the new requirements
                const passwordHash = await bcrypt.hash(password, 10)
                teacherExists.passwordHash = passwordHash
                teacherExists.role = 'teacher'
                teacherExists.name = name // Ensure name is the simplified demo name
                await teacherExists.save()
                
                console.log(`  Updated password to: ${password}`)
                console.log('-'.repeat(70))
            }
        }

        console.log('\n✓ All teacher accounts processed successfully!')
        console.log('\nTeacher Login Credentials:')
        console.log('='.repeat(70))
        departments.forEach(({ dept, email, password }) => {
            console.log(`${dept.padEnd(6)}: ${email.padEnd(30)} | Password: ${password}`)
        })
        console.log('='.repeat(70))

        await mongoose.disconnect()
        console.log('✓ Disconnected from MongoDB')
        process.exit(0)
    } catch (error) {
        console.error('Error creating teachers:', error)
        await mongoose.disconnect()
        process.exit(1)
    }
}

createTeachers()
