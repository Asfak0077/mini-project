const fs = require('fs')
const path = require('path')

// ── Persistent storage file path ──
const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

// ── Seed data (used only when no persistent file exists) ──

const seedStudents = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d1',
    id: 'CR21CS001',
    studentId: 'CR21CS001',
    name: 'Student User',
    email: 'student@campusresolve.edu',
    phone: '+91 98765 43210',
    department: 'CSE',
    semesterYear: '3rd Year',
    role: 'student',
    isActive: true,
    emailNotifications: true,
    preferences: { darkMode: true, language: 'en', emailNotifications: true },
    completionPercentage: 85,
    activityHistory: [
      { action: 'login', details: 'User logged in', timestamp: new Date().toISOString() }
    ],
    totalComplaints: 3,
    resolvedComplaints: 1,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0d2',
    id: 'ADM-001',
    studentId: 'ADM-001',
    name: 'Admin Officer',
    email: 'admin@campusresolve.edu',
    phone: '+91 99999 00000',
    department: 'Administration',
    role: 'admin',
    isActive: true,
    emailNotifications: true,
    preferences: { darkMode: true, language: 'en', emailNotifications: true },
    completionPercentage: 100,
    activityHistory: [],
    totalComplaints: 0,
    resolvedComplaints: 0,
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  }
]

const seedTeachers = [
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0t1',
    id: 'TCH-CSE-001',
    teacherId: 'TCH-CSE-001',
    name: 'Dr. Rajesh Kumar',
    email: 'cse.teacher@campusresolve.edu',
    phone: '+91 98123 45678',
    department: 'CSE',
    designation: 'Professor',
    specialization: 'Artificial Intelligence & Systems',
    officeLocation: 'Tech Block B, Room 304',
    activeComplaints: 2,
    resolvedComplaints: 5,
    role: 'teacher',
    isActive: true,
    emailNotifications: true,
    preferences: { darkMode: true, language: 'en', emailNotifications: true },
    activityHistory: []
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0t2',
    id: 'T-001',
    teacherId: 'T-001',
    name: 'Dr. Meena',
    email: 'meena@campusresolve.edu',
    phone: '+91 98234 56789',
    department: 'ECE',
    designation: 'Professor',
    specialization: 'VLSI & Signal Processing',
    officeLocation: 'ECE Block, Room 102',
    activeComplaints: 1,
    resolvedComplaints: 3,
    role: 'teacher',
    isActive: true,
    emailNotifications: true
  },
  {
    _id: '64f1a2b3c4d5e6f7a8b9c0t3',
    id: 'T-002',
    teacherId: 'T-002',
    name: 'Prof. Arun',
    email: 'arun@campusresolve.edu',
    phone: '+91 98345 67890',
    department: 'CSE',
    designation: 'Associate Professor',
    specialization: 'Database Systems & Cloud',
    officeLocation: 'Tech Block A, Room 210',
    activeComplaints: 1,
    resolvedComplaints: 4,
    role: 'teacher',
    isActive: true,
    emailNotifications: true
  }
]

const seedComplaints = []

const seedNotifications = [
  {
    _id: '64f1n0010000000000000001',
    id: '64f1n0010000000000000001',
    userId: 'CR21CS001',
    userRole: 'student',
    type: 'complaint_assigned',
    title: 'Complaint Assigned',
    message: 'Your complaint regarding Lab Computer Network has been assigned to Dr. Rajesh Kumar.',
    read: false,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    _id: '64f1n0010000000000000002',
    id: '64f1n0010000000000000002',
    userId: 'TCH-CSE-001',
    userRole: 'teacher',
    type: 'complaint_assigned',
    title: 'New Complaint Assigned',
    message: 'Complaint "Lab Computer Network Intermittent Disconnection" has been assigned to you.',
    read: false,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    _id: '64f1n0010000000000000003',
    id: '64f1n0010000000000000003',
    userId: 'ADM-001',
    userRole: 'admin',
    type: 'complaint_submitted',
    title: 'New Complaint Filed',
    message: 'Student User submitted a new complaint "Library Air Conditioning Noise".',
    read: false,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  }
]

const seedFeedback = []

// ── Persistent InMemoryStore ──

class InMemoryStore {
  constructor() {
    const loaded = this._loadFromDisk()
    if (loaded) {
      this.students = loaded.students || [...seedStudents]
      this.teachers = loaded.teachers || [...seedTeachers]
      this.complaints = loaded.complaints || [...seedComplaints]
      this.notifications = loaded.notifications || [...seedNotifications]
      this.feedback = loaded.feedback || [...seedFeedback]
      this.activityLogs = loaded.activityLogs || []
      console.log(`✅ Persistent data store loaded from ${DATA_FILE} (${this.students.length} users, ${this.complaints.length} complaints, ${this.feedback.length} feedback)`)
    } else {
      this.students = [...seedStudents]
      this.teachers = [...seedTeachers]
      this.complaints = [...seedComplaints]
      this.notifications = [...seedNotifications]
      this.feedback = [...seedFeedback]
      this.activityLogs = []
      console.log('📦 Persistent data store initialized with seed data (first run)')
      this._persist()
    }
  }

  // ── File I/O ──

  _loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.students)) {
          return parsed
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not load persistent store file, starting fresh:', err.message)
    }
    return null
  }

  _persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      }
      const snapshot = JSON.stringify({
        students: this.students,
        teachers: this.teachers,
        complaints: this.complaints,
        notifications: this.notifications,
        feedback: this.feedback,
        activityLogs: this.activityLogs,
        _savedAt: new Date().toISOString()
      }, null, 2)
      fs.writeFileSync(DATA_FILE, snapshot, 'utf-8')
    } catch (err) {
      console.error('❌ Failed to persist data store to disk:', err.message)
    }
  }

  // ── Student methods ──

  findStudentByEmail(email) {
    const norm = (email || '').toLowerCase().trim()
    return this.students.find(s => s.email.toLowerCase() === norm)
  }

  findStudentById(id) {
    return this.students.find(s => s.id === id || s._id === id || s.studentId === id)
  }

  updateStudent(id, updates) {
    const student = this.findStudentById(id)
    if (student) {
      Object.assign(student, updates)
      this._persist()
    }
    return student
  }

  // ── Teacher methods ──

  findTeacherByIdOrEmail(input) {
    const clean = (input || '').toLowerCase().trim()
    return this.teachers.find(t =>
      t.teacherId.toLowerCase() === clean ||
      t.id.toLowerCase() === clean ||
      (t.email && t.email.toLowerCase() === clean)
    )
  }

  getTeachers() {
    return this.teachers
  }

  createTeacher(data) {
    const teacherId = data.teacherId || `T-${Math.floor(100 + Math.random() * 900)}`
    const newTeacher = {
      _id: `64f1t${Date.now().toString(16)}`,
      id: teacherId,
      teacherId,
      name: data.name,
      email: data.email,
      department: data.department,
      designation: data.designation || 'Professor',
      activeComplaints: 0,
      resolvedComplaints: 0,
      role: 'teacher',
      isActive: true,
      emailNotifications: true,
      activityHistory: []
    }
    this.teachers.unshift(newTeacher)
    this._persist()
    return newTeacher
  }

  deleteTeacher(id) {
    this.teachers = this.teachers.filter(t => t.id !== id && t.teacherId !== id && t._id !== id)
    this._persist()
    return true
  }

  // ── Complaint methods ──

  getComplaints(filter = {}) {
    let list = [...this.complaints]

    if (filter.studentId) {
      const sid = filter.studentId.toLowerCase()
      list = list.filter(c =>
        (c.studentId && c.studentId.toLowerCase() === sid) ||
        (c.studentEmail && c.studentEmail.toLowerCase() === sid)
      )
    }

    if (filter.teacherId) {
      const tid = filter.teacherId.toLowerCase()
      list = list.filter(c =>
        (c.assignedTeacherId && c.assignedTeacherId.toLowerCase() === tid) ||
        (c.assignedTeacherEmail && c.assignedTeacherEmail.toLowerCase() === tid)
      )
    }

    if (filter.department && filter.department !== 'All') {
      list = list.filter(c => c.department === filter.department)
    }

    if (filter.status && filter.status !== 'All') {
      list = list.filter(c => c.status === filter.status)
    }

    if (filter.priority && filter.priority !== 'All') {
      list = list.filter(c => c.priority === filter.priority)
    }

    return list
  }

  getNextComplaintId() {
    let maxSeq = 0
    for (const c of this.complaints) {
      if (c.complaintId && /^CR-(\d+)$/i.test(c.complaintId)) {
        const num = parseInt(c.complaintId.replace(/^CR-/i, ''), 10)
        if (num > maxSeq) maxSeq = num
      }
    }
    const nextSeq = maxSeq + 1
    return `CR-${String(nextSeq).padStart(3, '0')}`
  }

  findComplaintById(id) {
    if (!id) return undefined
    const clean = String(id).trim().toLowerCase()
    return this.complaints.find(c =>
      (c._id && String(c._id).toLowerCase() === clean) ||
      (c.id && String(c.id).toLowerCase() === clean) ||
      (c.complaintId && String(c.complaintId).toLowerCase() === clean)
    )
  }

  createComplaint(data) {
    const complaintId = data.complaintId || this.getNextComplaintId()
    const newId = `64f1c${Date.now().toString(16)}`
    const complaint = {
      _id: newId,
      id: newId,
      complaintId,
      ticketNumber: complaintId,
      title: data.title || 'Untitled Complaint',
      category: data.category,
      department: data.department,
      description: data.description,
      priority: data.priority || 'medium',
      status: data.status || 'Submitted',
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      studentId: data.studentId,
      studentPhone: data.studentPhone || '',
      assignedTeacherId: data.assignedTeacherId || '',
      assignedTeacherName: data.assignedTeacherName || '',
      assignedTeacherEmail: data.assignedTeacherEmail || '',
      assignedTeacherDepartment: data.assignedTeacherDepartment || '',
      assignedDate: data.assignedTeacherId ? new Date().toISOString() : null,
      attachments: data.attachments || [],
      resolutionTimeline: [
        {
          status: 'Submitted',
          timestamp: new Date().toISOString(),
          updatedBy: 'System',
          notes: 'Complaint submitted'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (data.assignedTeacherId) {
      const teacher = this.findTeacherByIdOrEmail(data.assignedTeacherId)
      if (teacher) {
        complaint.assignedTeacherName = teacher.name
        complaint.assignedTeacherEmail = teacher.email
        complaint.assignedTeacherDepartment = teacher.department
        complaint.status = 'Assigned'
        complaint.resolutionTimeline.push({
          status: 'Assigned',
          timestamp: new Date().toISOString(),
          updatedBy: 'Student',
          notes: `Directly assigned to ${teacher.name}`
        })
        teacher.activeComplaints = (teacher.activeComplaints || 0) + 1
      }
    }

    this.complaints.unshift(complaint)
    this._persist()
    return complaint
  }

  updateComplaint(id, updates) {
    const complaint = this.findComplaintById(id)
    if (complaint) {
      Object.assign(complaint, updates, { updatedAt: new Date().toISOString() })
      this._persist()
    }
    return complaint
  }

  deleteComplaint(id) {
    this.complaints = this.complaints.filter(c => c._id !== id && c.id !== id)
    this._persist()
    return true
  }

  getComplaintStats() {
    const total = this.complaints.length
    const pending = this.complaints.filter(c => c.status === 'Submitted' || c.status === 'Assigned').length
    const inProgress = this.complaints.filter(c => c.status === 'In Progress').length
    const resolved = this.complaints.filter(c => c.status === 'Resolved').length
    const escalated = this.complaints.filter(c => c.status === 'Escalated').length

    const today = new Date().toISOString().split('T')[0]
    const todayCount = this.complaints.filter(c => (c.createdAt || '').startsWith(today)).length

    return {
      total,
      pending,
      inProgress,
      resolved,
      escalated,
      today: todayCount,
      urgent: this.complaints.filter(c => c.priority === 'high' || c.priority === 'Urgent').length
    }
  }

  // ── Notification methods ──

  getNotifications(userId) {
    if (!userId) return this.notifications
    const uid = userId.toLowerCase()
    return this.notifications.filter(n =>
      (n.userId && n.userId.toLowerCase() === uid) ||
      (n.userRole && n.userRole.toLowerCase() === uid)
    )
  }

  createNotification(data) {
    const newNotif = {
      _id: `64f1n${Date.now().toString(16)}`,
      id: `64f1n${Date.now().toString(16)}`,
      userId: data.userId || 'all',
      userRole: data.userRole || 'student',
      type: data.type || 'notification',
      title: data.title || 'Notification',
      message: data.message || '',
      read: false,
      metadata: data.metadata || null,
      createdAt: new Date().toISOString()
    }
    this.notifications.unshift(newNotif)
    this._persist()
    return newNotif
  }

  markNotificationRead(id) {
    const notif = this.notifications.find(n => n._id === id || n.id === id)
    if (notif) {
      notif.read = true
      this._persist()
    }
    return notif
  }

  markAllNotificationsRead(userId) {
    const uid = (userId || '').toLowerCase()
    this.notifications.forEach(n => {
      if (!userId || n.userId.toLowerCase() === uid) {
        n.read = true
      }
    })
    this._persist()
    return true
  }

  // ── Feedback methods ──

  getFeedback(teacherId) {
    if (!teacherId) return this.feedback
    return this.feedback.filter(f => f.teacherId === teacherId)
  }

  createFeedback(data) {
    const newFeedback = {
      _id: `64f1f${Date.now().toString(16)}`,
      id: `64f1f${Date.now().toString(16)}`,
      complaintId: data.complaintId,
      studentName: data.studentName,
      studentId: data.studentId,
      department: data.department,
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      rating: data.rating,
      category: data.category || 'General',
      comment: data.comment || '',
      createdAt: new Date().toISOString()
    }
    this.feedback.unshift(newFeedback)

    // Update complaint feedback
    const complaint = this.findComplaintById(data.complaintId)
    if (complaint) {
      complaint.studentFeedback = data.comment
      complaint.satisfactionRating = data.rating
    }

    this._persist()
    return newFeedback
  }
}

const inMemoryStore = new InMemoryStore()

module.exports = { inMemoryStore }
