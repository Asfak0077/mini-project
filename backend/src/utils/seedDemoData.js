const bcrypt = require('bcryptjs')
const Student = require('../models/Student')
const Teacher = require('../models/Teacher')

const seedDemoData = async () => {
  if (require('mongoose').connection.readyState !== 1) return
  // Seed demo student
  let student = await Student.findOne({ email: 'student@campusresolve.edu' })
  const defaultStudentHash = await bcrypt.hash('password123', 10)
  if (!student) {
    await Student.create({
      name: 'Student User',
      email: 'student@campusresolve.edu',
      passwordHash: defaultStudentHash,
      department: 'CSE',
      studentId: 'CR21CS001',
      role: 'student',
      isActive: true,
      isPasswordSet: true
    })
  } else {
    student.passwordHash = defaultStudentHash
    student.isPasswordSet = true
    await student.save()
  }

  // Seed admin
  let admin = await Student.findOne({ email: 'admin@campusresolve.edu' })
  const defaultAdminHash = await bcrypt.hash('password123', 10)
  if (!admin) {
    await Student.create({
      name: 'Admin Officer',
      email: 'admin@campusresolve.edu',
      passwordHash: defaultAdminHash,
      department: 'Administration',
      studentId: '',
      role: 'admin',
      isActive: true,
      isPasswordSet: true
    })
  } else {
    admin.passwordHash = defaultAdminHash
    admin.isPasswordSet = true
    await admin.save()
  }

  // Seed teachers for all 6 departments
  const departments = [
    { dept: 'CSE', teacherId: 'TCH-CSE-001', name: 'Dr. Rajesh Kumar', email: 'cse.teacher@campusresolve.edu' },
    { dept: 'ECE', teacherId: 'TCH-ECE-001', name: 'Dr. Priya Sharma', email: 'ece.teacher@campusresolve.edu' },
    { dept: 'MECH', teacherId: 'TCH-MECH-001', name: 'Dr. Arun Patel', email: 'mech.teacher@campusresolve.edu' },
    { dept: 'EEE', teacherId: 'TCH-EEE-001', name: 'Dr. Meena Iyer', email: 'eee.teacher@campusresolve.edu' },
    { dept: 'AIDS', teacherId: 'TCH-AIDS-001', name: 'Dr. Karthik Reddy', email: 'aids.teacher@campusresolve.edu' },
    { dept: 'IT', teacherId: 'TCH-IT-001', name: 'Dr. Lakshmi Nair', email: 'it.teacher@campusresolve.edu' }
  ]

  const defaultTeacherHash = await bcrypt.hash('teach123', 10)
  for (const { dept, teacherId, name, email } of departments) {
    let teacher = await Teacher.findOne({
      $or: [{ teacherId }, { email }]
    })
    if (!teacher) {
      await Teacher.create({
        teacherId,
        name,
        email,
        department: dept,
        designation: 'Professor',
        passwordHash: defaultTeacherHash,
        activeComplaints: 0,
        resolvedComplaints: 0,
        isActive: true,
        role: 'teacher'
      })
      console.log(`✓ Created ${dept} teacher: ${name} (${teacherId})`)
    } else {
      teacher.email = email
      teacher.passwordHash = defaultTeacherHash
      teacher.isActive = true
      teacher.role = 'teacher'
      await teacher.save()
      console.log(`✓ Updated ${dept} teacher: ${name} (${teacherId})`)
    }
  }

  // Seed a few demo complaints for the demo student to exercise dashboards
  const Complaint = require('../models/Complaint')
  const demoStudent = await Student.findOne({ email: 'student@campusresolve.edu' })
  if (demoStudent) {
    const existing = await Complaint.findOne({ studentEmail: demoStudent.email })
    if (!existing) {
      await Complaint.create({
        complaintId: 'CR-001',
        title: 'Broken Projector in Lab 3',
        category: 'Infrastructure',
        department: 'CSE',
        description: 'Projector stopped working during lecture',
        priority: 'high',
        status: 'Submitted',
        studentName: demoStudent.name,
        studentEmail: demoStudent.email,
        studentId: demoStudent.studentId || demoStudent._id.toString()
      })
      await Complaint.create({
        complaintId: 'CR-002',
        title: 'Request for extra lab session',
        category: 'Academic',
        department: 'CSE',
        description: 'Need additional lab session before midterms',
        priority: 'medium',
        status: 'Assigned',
        studentName: demoStudent.name,
        studentEmail: demoStudent.email,
        studentId: demoStudent.studentId || demoStudent._id.toString(),
        assignedTeacherId: 'TCH-CSE-001',
        assignedTeacherName: 'Dr. Rajesh Kumar',
        assignedTeacherDepartment: 'CSE',
        assignedDate: new Date(),
      })
      console.log('✓ Created demo complaints for demo student (CR-001, CR-002)')
    }
  }
}

module.exports = {
  seedDemoData
}
