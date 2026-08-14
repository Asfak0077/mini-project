const mongoose = require('mongoose')
require('dotenv').config()

const Complaint = require('./src/models/Complaint')
const Teacher = require('./src/models/Teacher')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campusresolve-redressal'

async function verify() {
    try {
        await mongoose.connect(MONGO_URI)
        console.log('✓ Connected to MongoDB')

        // 1. Verify Teacher exists and has correct info
        const cseTeacher = await Teacher.findOne({ email: 'cse.teacher@campusresolve.edu' })
        if (!cseTeacher) {
            console.error('❌ CSE Teacher not found!')
            process.exit(1)
        }
        console.log(`✓ CSE Teacher found: ${cseTeacher.name} (Role: ${cseTeacher.role})`)

        // 2. Create a test complaint to assign
        const newComplaint = await Complaint.create({
            category: 'Facilities',
            department: 'CSE',
            description: 'Test complaint data preservation',
            priority: 'low',
            studentName: 'Test Student',
            studentEmail: 'student@campusresolve.edu',
            studentId: 'STU001',
            status: 'Submitted'
        })
        console.log(`✓ Created test complaint: ${newComplaint._id}`)

        // 3. Assign the complaint (Simulate what the controller does)
        const updatedComplaint = await Complaint.findByIdAndUpdate(
            newComplaint._id,
            {
                $set: {
                    assignedTeacherId: cseTeacher.teacherId,
                    assignedTeacherName: cseTeacher.name,
                    assignedTeacherEmail: cseTeacher.email,
                    assignedTeacherDepartment: cseTeacher.department,
                    assignedDate: new Date(),
                    status: 'Assigned'
                }
            },
            { new: true }
        )

        // 4. Verify data was preserved
        if (updatedComplaint.description === 'Test complaint data preservation' &&
            updatedComplaint.studentName === 'Test Student' &&
            updatedComplaint.assignedTeacherId === cseTeacher.teacherId &&
            updatedComplaint.assignedTeacherEmail === cseTeacher.email &&
            updatedComplaint.status === 'Assigned') {
            console.log('✓ SUCCESS: Assigned Teacher ID, Email, Status set, and Description preserved.')
            console.log(`  Saved Email: ${updatedComplaint.assignedTeacherEmail}`)
        } else {
            console.error('❌ FAILED: Data was not preserved correctly or assignment failed.')
            console.log(updatedComplaint)
        }

        // Clean up
        await Complaint.deleteOne({ _id: newComplaint._id })
        console.log('✓ Test complaint cleaned up')

        await mongoose.disconnect()
        process.exit(0)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

verify()
