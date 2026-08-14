const express = require('express')
const mongoose = require('mongoose')
const Complaint = require('../models/Complaint')
const Student = require('../models/Student')
const Teacher = require('../models/Teacher')
const ActivityLog = require('../models/ActivityLog')
const { mapComplaint } = require('../utils/mapDocs')
const { createNotification } = require('../utils/notificationHelper')
const { emitToRole, emitToUser } = require('../utils/socketService')
const { logActivity } = require('../utils/loggerService')
const { inMemoryStore } = require('../utils/inMemoryStore')
const { protect } = require('../middleware/authMiddleware')
const { getNextComplaintId } = require('../utils/complaintIdService')
const {
  sendComplaintConfirmation,
  sendComplaintAdminNotification,
  sendComplaintAssignment,
  sendStatusUpdate,
  sendResolutionNotification,
  sendComplaintSubmittedEmails,
  sendComplaintAssignedEmails,
  sendComplaintResolvedEmail
} = require('../services/emailService')

const router = express.Router()

// ============ STUDENT COMPLAINT ROUTES ============

// Create complaint
router.post('/create', protect, async (req, res) => {
  try {
    const { title, category, department, description, priority, studentData, attachments, assignedTeacherId } = req.body

    if (!category || !department || !description || !studentData) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (mongoose.connection.readyState !== 1) {
      const complaint = inMemoryStore.createComplaint({
        title,
        category,
        department,
        description,
        priority,
        studentName: studentData.name,
        studentEmail: studentData.email,
        studentId: studentData.studentId,
        studentPhone: studentData.phone,
        assignedTeacherId,
        attachments
      })
      inMemoryStore.createNotification({
        userId: studentData.studentId,
        userRole: 'student',
        type: 'complaint_submitted',
        title: 'Complaint Submitted',
        message: `Your complaint about "${category}" has been submitted successfully.`,
        metadata: { complaintId: complaint._id, complaintCategory: category }
      })
      emitToRole('admin', 'new_complaint', complaint)
      return res.status(201).json({
        message: 'Complaint created successfully',
        complaint: {
          id: complaint._id,
          complaintId: complaint.complaintId || 'CR-001',
          ticketNumber: complaint.complaintId || 'CR-001',
          status: complaint.status,
          category: complaint.category,
          priority: complaint.priority,
          assignedTeacherId: complaint.assignedTeacherId
        }
      })
    }

    // If possible, resolve student's MongoDB _id to store as complaint.studentId
    let resolvedStudentMongoId = null
    try {
      const foundStudent = await Student.findOne({ email: (studentData.email || '').toLowerCase() }).catch(() => null)
      if (foundStudent) resolvedStudentMongoId = foundStudent._id.toString()
    } catch (e) {
      // ignore
    }

    const complaintId = await getNextComplaintId()

    const complaint = new Complaint({
      complaintId,
      title: title || 'Untitled Complaint',
      category,
      department,
      description,
      priority: priority || 'medium',
      studentName: studentData.name,
      studentEmail: studentData.email,
      // Prefer storing the student's MongoDB _id string; fallback to provided studentId
      studentId: resolvedStudentMongoId || studentData.studentId || '',
      studentPhone: studentData.phone || '',
      attachments: Array.isArray(attachments)
        ? attachments.map((file) => ({ filename: file.filename || 'attachment', url: file.url || '' }))
        : [],
      status: 'Submitted',
      resolutionTimeline: [
        {
          status: 'Submitted',
          timestamp: new Date(),
          updatedBy: 'System',
          notes: 'Complaint submitted by student'
        }
      ]
    })

    // Handle direct assignment if teacher selected by student
    let teacherAssigned = null;
    if (assignedTeacherId) {
      const teacher = await Teacher.findOne({ teacherId: assignedTeacherId })
      if (teacher) {
        complaint.assignedTeacherId = teacher.teacherId
        complaint.assignedTeacherName = teacher.name
        complaint.assignedTeacherEmail = teacher.email
        complaint.assignedTeacherDepartment = teacher.department
        complaint.assignedDate = new Date()
        complaint.status = 'Assigned'
        
        complaint.resolutionTimeline.push({
          status: 'Assigned',
          timestamp: new Date(),
          updatedBy: 'Student',
          notes: `Directly assigned to ${teacher.name} upon submission`
        })

        // Update teacher active complaints count
        await Teacher.updateOne(
          { teacherId: teacher.teacherId },
          { $inc: { activeComplaints: 1 } }
        )
        
        teacherAssigned = teacher;
      }
    }

    await complaint.save()

    // Log Activity
    await logActivity(
      complaint._id,
      'created',
      { userId: studentData.studentId, name: studentData.name, role: 'student' },
      { category, department, priority: complaint.priority, title: complaint.title },
      'Initial complaint submission'
    )

    // Update student complaint count (use MongoDB _id if available)
    try {
      if (resolvedStudentMongoId) {
        await Student.updateOne({ _id: resolvedStudentMongoId }, { $inc: { totalComplaints: 1 } })
      } else {
        await Student.updateOne({ email: studentData.email }, { $inc: { totalComplaints: 1 } })
      }
    } catch (e) {
      console.warn('Failed to update student complaint count:', e.message)
    }

    // Create in-app notification
    // Look up student's MongoDB _id to match JWT token's id field
    const studentDoc = await Student.findOne({ email: studentData.email }).catch(() => null)
    const studentUserId = studentDoc ? studentDoc._id.toString() : (resolvedStudentMongoId || studentData.studentId)
    await createNotification({
      userId: studentUserId,
      userRole: 'student',
      type: 'complaint_submitted',
      title: 'Complaint Submitted',
      message: `Your complaint about "${category}" has been submitted successfully.`,
      metadata: {
        complaintId: complaint._id.toString(),
        complaintCategory: category
      }
    })

    const admins = await Student.find({ role: 'admin', isActive: true }).select('_id')
    await Promise.all(admins.map((admin) =>
      createNotification({
        userId: admin._id.toString(),
        userRole: 'admin',
        type: 'complaint_submitted',
        title: 'New Complaint Filed',
        message: `${studentData.name} submitted "${complaint.title}".`,
        metadata: {
          complaintId: complaint._id.toString(),
          complaintCategory: category
        }
      })
    ))

    // Emit Socket.io event to admin
    emitToRole('admin', 'new_complaint', {
      complaintId: complaint._id,
      studentName: studentData.name,
      category,
      department,
      priority: complaint.priority
    })

    // Send email notification
    await sendComplaintSubmittedEmails(complaint)

    if (teacherAssigned) {
      await createNotification({
        userId: teacherAssigned.teacherId,
        userRole: 'teacher',
        type: 'complaint_assigned',
        title: 'New Complaint Assigned',
        message: `A new complaint from ${studentData.name} has been directly assigned to you.`,
        metadata: {
          complaintId: complaint._id.toString(),
          complaintCategory: category
        }
      })
      emitToUser(teacherAssigned.teacherId, 'new_assignment', {
        complaintId: complaint._id,
        studentName: studentData.name,
        category: complaint.category
      })
      await sendComplaintAssignedEmails(complaint, teacherAssigned)
    }

    res.status(201).json({
      message: 'Complaint created successfully',
      complaint: {
        id: complaint._id,
        complaintId: complaint.complaintId || complaintId,
        ticketNumber: complaint.complaintId || complaintId,
        status: complaint.status,
        category: complaint.category,
        priority: complaint.priority,
        assignedTeacherId: complaint.assignedTeacherId
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error creating complaint' })
  }
})

// Get student's complaints - supports authenticated user (preferred) or param fallback
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const paramStudentId = req.params.studentId
    const { status, priority } = req.query

    if (mongoose.connection.readyState !== 1) {
      const complaints = inMemoryStore.getComplaints({ studentId: paramStudentId, status, priority })
      return res.json({ total: complaints.length, complaints })
    }

    // Determine search identifiers: prefer authenticated user's MongoDB _id, studentId, and email
    const identifiers = new Set()
    if (req.user && req.user._id) identifiers.add(req.user._id.toString())
    if (req.user && req.user.studentId) identifiers.add(req.user.studentId)
    if (req.user && req.user.email) identifiers.add((req.user.email || '').toLowerCase())
    // Also include the route param if different
    if (paramStudentId) identifiers.add(paramStudentId)

    const idArray = Array.from(identifiers).filter(Boolean)

    // Build flexible query to match by studentId or studentEmail
    const orClauses = []
    if (idArray.length > 0) {
      orClauses.push(...idArray.map(v => ({ studentId: v })))
      orClauses.push(...idArray.map(v => ({ studentEmail: v })))
    }

    let query = orClauses.length > 0 ? { $or: orClauses } : {}

    if (status) query.status = status
    if (priority) query.priority = priority

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .lean()

    res.json({
      total: complaints.length,
      complaints
    })
  } catch (error) {
    console.error(error)
    const complaints = inMemoryStore.getComplaints({ studentId: req.params.studentId })
    res.json({ total: complaints.length, complaints })
  }
})

// Get complaint details
router.get('/details/:complaintId', protect, async (req, res) => {
  try {
    const { complaintId } = req.params

    if (mongoose.connection.readyState !== 1) {
      const complaint = inMemoryStore.findComplaintById(complaintId)
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' })
      return res.json(complaint)
    }

    const complaint = await Complaint.findById(complaintId).lean()

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    res.json(complaint)
  } catch (error) {
    console.error(error)
    const complaint = inMemoryStore.findComplaintById(req.params.complaintId)
    if (complaint) return res.json(complaint)
    res.status(500).json({ message: 'Error fetching complaint' })
  }
})

// Add feedback to complaint
router.put('/:complaintId/feedback', protect, async (req, res) => {
  try {
    const { complaintId } = req.params
    const { feedback, satisfactionRating } = req.body

    if (!feedback || !satisfactionRating) {
      return res.status(400).json({ message: 'Feedback and rating are required' })
    }

    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      {
        studentFeedback: feedback,
        satisfactionRating: Math.min(5, Math.max(1, satisfactionRating))
      },
      { new: true }
    )

    res.json({
      message: 'Feedback added successfully',
      complaint
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error adding feedback' })
  }
})

// Delete complaint (Student / Owner / Admin)
router.delete('/:complaintId', protect, async (req, res) => {
  try {
    const { complaintId } = req.params
    const bodyStudentId = req.body?.studentId

    // 1. In-Memory store fallback if MongoDB is not connected
    if (mongoose.connection.readyState !== 1) {
      const complaint = inMemoryStore.findComplaintById(complaintId)
      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' })
      }

      const reqUserEmail = (req.user?.email || '').toLowerCase()
      const reqUserId = String(req.user?.id || req.user?._id || req.user?.studentId || bodyStudentId || '')
      const complaintEmail = (complaint.studentEmail || '').toLowerCase()
      const complaintStudentId = String(complaint.studentId || '')

      const isOwner =
        req.user?.role === 'admin' ||
        (reqUserEmail && complaintEmail && reqUserEmail === complaintEmail) ||
        (reqUserId && complaintStudentId && (reqUserId === complaintStudentId || reqUserId === String(complaint.id || ''))) ||
        (bodyStudentId && (bodyStudentId === complaint.studentId || bodyStudentId === complaint.studentEmail))

      if (!isOwner) {
        return res.status(403).json({ message: 'Unauthorized: You can only delete your own complaints' })
      }

      inMemoryStore.deleteComplaint(complaintId)
      return res.json({ message: 'Complaint deleted successfully', id: complaintId })
    }

    // 2. MongoDB query
    const complaint = await Complaint.findById(complaintId)
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    const reqUserEmail = (req.user?.email || '').toLowerCase()
    const reqUserId = String(req.user?.id || req.user?._id || req.user?.studentId || bodyStudentId || '')
    const complaintEmail = (complaint.studentEmail || '').toLowerCase()
    const complaintStudentId = String(complaint.studentId || '')

    const isOwner =
      req.user?.role === 'admin' ||
      (reqUserEmail && complaintEmail && reqUserEmail === complaintEmail) ||
      (reqUserId && complaintStudentId && (reqUserId === complaintStudentId || reqUserId === String(complaint._id || ''))) ||
      (bodyStudentId && (bodyStudentId === complaint.studentId || bodyStudentId === complaint.studentEmail))

    if (!isOwner) {
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own complaints' })
    }

    // Log Activity
    await logActivity(
      complaintId,
      'deleted',
      { userId: complaint.studentId, name: complaint.studentName, role: 'student' },
      { category: complaint.category, department: complaint.department },
      'Student deleted their own complaint'
    ).catch(() => null)

    await Complaint.findByIdAndDelete(complaintId)

    // Decrement student count
    if (complaint.studentEmail) {
      await Student.updateOne(
        { email: complaint.studentEmail },
        { $inc: { totalComplaints: -1 } }
      ).catch(() => null)
    }

    return res.json({ message: 'Complaint deleted successfully', id: complaintId })
  } catch (error) {
    console.error('Delete complaint error:', error)
    res.status(500).json({ message: 'Error deleting complaint' })
  }
})

// ============ ADMIN COMPLAINT ROUTES ============

// Get all complaints with filters
router.get('/admin/all-complaints', async (req, res) => {
  try {
    const { status, priority, department, search } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    if (mongoose.connection.readyState !== 1) {
      const all = inMemoryStore.getComplaints({ status, priority, department })
      return res.json({
        total: all.length,
        page: 1,
        pages: 1,
        complaints: all
      })
    }

    let query = {}

    if (status) query.status = status
    if (priority) query.priority = priority
    if (department) query.department = department
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } },
        { assignedTeacherName: { $regex: search, $options: 'i' } },
        { assignedTeacherId: { $regex: search, $options: 'i' } }
      ]
      if (search.match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: search })
      }
    }

    const total = await Complaint.countDocuments(query)
    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      complaints
    })
  } catch (error) {
    console.error(error)
    const all = inMemoryStore.getComplaints()
    res.json({ total: all.length, page: 1, pages: 1, complaints: all })
  }
})

// Assign complaint to teacher (enhanced with reassign support and activity logging)
router.put('/:complaintId/assign', async (req, res) => {
  try {
    const { complaintId } = req.params
    const { assignedTeacherId, assignedTeacherName, teacherId } = req.body

    // Support both formats: { teacherId } or { assignedTeacherId, assignedTeacherName }
    const resolvedTeacherId = assignedTeacherId || teacherId
    if (!resolvedTeacherId) {
      return res.status(400).json({ message: 'Select a teacher first' })
    }

    // Look up teacher to get full info
    const teacher = await Teacher.findOne({ teacherId: resolvedTeacherId })
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' })
    }

    const resolvedTeacherName = assignedTeacherName || teacher.name

    // Fetch existing complaint to check for reassignment
    const existingComplaint = await Complaint.findById(complaintId)
    if (!existingComplaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    const isReassign = existingComplaint.assignedTeacherId && existingComplaint.assignedTeacherId !== resolvedTeacherId
    const previousTeacherId = existingComplaint.assignedTeacherId || null
    const previousTeacherName = existingComplaint.assignedTeacherName || null
    const previousTeacherEmail = existingComplaint.assignedTeacherEmail || null
    const previousTeacherDept = existingComplaint.assignedTeacherDepartment || null
    const now = new Date()

    // Build the update object using $set and $push (safe - no overwrite of existing data)
    const updateOps = {
      $set: {
        assignedTeacherId: resolvedTeacherId,
        assignedTeacherName: resolvedTeacherName,
        assignedTeacherEmail: teacher.email,
        assignedTeacherDepartment: teacher.department,
        assignedDate: now,
        status: 'Assigned'
      },
      $push: {
        resolutionTimeline: {
          status: 'Assigned',
          timestamp: now,
          updatedBy: 'Admin',
          notes: isReassign
            ? `Reassigned from ${previousTeacherName} to ${resolvedTeacherName}`
            : `Assigned to ${resolvedTeacherName}`
        }
      }
    }

    // Update the complaint in DB
    const updatedComplaint = await Complaint.findByIdAndUpdate(complaintId, updateOps, { new: true })

    // Log Activity
    await logActivity(
      complaintId,
      isReassign ? 'reassigned' : 'assigned',
      { userId: 'admin', name: 'Admin User', role: 'admin' },
      { 
        teacherId: resolvedTeacherId, 
        teacherName: resolvedTeacherName,
        previousTeacherId: previousTeacherId
      },
      isReassign 
        ? `Reassigned from ${previousTeacherName} to ${resolvedTeacherName}` 
        : `Assigned to ${resolvedTeacherName}`
    )

    // If reassigning, log previous teacher in assignmentHistory
    if (isReassign) {
      updateOps.$push.assignmentHistory = {
        teacherId: previousTeacherId,
        teacherName: previousTeacherName,
        teacherEmail: previousTeacherEmail,
        department: previousTeacherDept,
        assignedDate: existingComplaint.assignedDate || existingComplaint.updatedAt,
        removedDate: now,
        assignedBy: 'Admin'
      }
    }

    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      updateOps,
      { new: true, runValidators: true }
    )

    if (!complaint) {
      return res.status(404).json({ message: 'Assignment failed, try again' })
    }

    // Update teacher active complaint counts
    if (isReassign && previousTeacherId) {
      // Decrement previous teacher's count
      await Teacher.updateOne(
        { teacherId: previousTeacherId },
        { $inc: { activeComplaints: -1 } }
      )
    }
    // Increment new teacher's count
    await Teacher.updateOne(
      { teacherId: resolvedTeacherId },
      { $inc: { activeComplaints: 1 } }
    )

    // Create activity log entry
    await ActivityLog.create({
      complaintId: complaint._id,
      action: isReassign ? 'reassigned' : 'assigned',
      assignedBy: 'Admin',
      assignedTo: {
        teacherId: resolvedTeacherId,
        teacherName: resolvedTeacherName,
        department: teacher.department
      },
      previousTeacher: isReassign ? {
        teacherId: previousTeacherId,
        teacherName: previousTeacherName,
        department: previousTeacherDept
      } : { teacherId: null, teacherName: null, department: null },
      notes: isReassign
        ? `Reassigned from ${previousTeacherName} to ${resolvedTeacherName}`
        : `Assigned to ${resolvedTeacherName}`
    })

    // Create notification for student
    const studentForNotif = await Student.findOne({ email: complaint.studentEmail })
    const studentNotifUserId = studentForNotif ? studentForNotif._id.toString() : complaint.studentId
    await createNotification({
      userId: studentNotifUserId,
      userRole: 'student',
      type: 'complaint_assigned',
      title: 'Complaint Assigned',
      message: `Your complaint has been assigned to ${resolvedTeacherName}.`,
      metadata: {
        complaintId: complaint._id.toString(),
        assignedTeacherName: resolvedTeacherName
      }
    })

    // Create notification for new teacher
    await createNotification({
      userId: resolvedTeacherId,
      userRole: 'teacher',
      type: 'complaint_assigned',
      title: 'New Complaint Assigned',
      message: `A new complaint from ${complaint.studentName} has been assigned to you.`,
      metadata: {
        complaintId: complaint._id.toString(),
        complaintCategory: complaint.category
      }
    })

    // Emit Socket.io events
    emitToUser(complaint.studentId, 'complaint_assigned', {
      complaintId: complaint._id,
      teacherName: resolvedTeacherName
    })
    emitToUser(resolvedTeacherId, 'new_assignment', {
      complaintId: complaint._id,
      studentName: complaint.studentName,
      category: complaint.category
    })
    // Also emit to teacher role room so all teacher dashboards refresh
    emitToRole('teacher', 'new_assignment', {
      complaintId: complaint._id,
      assignedTeacherId: resolvedTeacherId
    })

    // Send email notification
    await sendComplaintAssignedEmails(complaint, teacher)

    res.json({
      message: isReassign ? 'Complaint reassigned successfully' : 'Complaint assigned successfully',
      complaint
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Assignment failed, try again' })
  }
})

// Get dashboard analytics
router.get('/admin/analytics', async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments().catch(() => 0)
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' }).catch(() => 0)
    const pendingComplaints = await Complaint.countDocuments({ status: 'Submitted' }).catch(() => 0)
    const inProgressComplaints = await Complaint.countDocuments({ status: 'In Progress' }).catch(() => 0)

    // Complaints by department
    const complaintsByDept = await Complaint.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Complaints by priority
    const complaintsByPriority = await Complaint.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ])

    // Complaints by category
    const complaintsByCategory = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])

    // Satisfaction rating average
    const satisfactionData = await Complaint.aggregate([
      { $match: { satisfactionRating: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$satisfactionRating' },
          count: { $sum: 1 }
        }
      }
    ]).catch(() => [])

    res.json({
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolutionRate: totalComplaints > 0 ? (resolvedComplaints / totalComplaints * 100).toFixed(2) : 0,
      complaintsByDept,
      complaintsByPriority,
      complaintsByCategory,
      avgSatisfaction: satisfactionData[0]?.avgRating || 0,
      feedbackCount: satisfactionData[0]?.count || 0
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error fetching analytics' })
  }
})

// Get activity logs for admin (all) or filtered by teacher
router.get('/admin/activity-logs', async (req, res) => {
  try {
    const { limit: queryLimit, teacherId } = req.query
    const logLimit = parseInt(queryLimit) || 50

    // Optionally populate complaintId to get department/category
    let query = {}
    if (teacherId) {
      query['performedBy.userId'] = teacherId
    }

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(logLimit)
      .populate('complaintId', 'category department title studentName')
      .lean()

    res.json({ logs })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error fetching activity logs' })
  }
})

// Get activity logs for a specific teacher
router.get('/teacher/:teacherId/activity-logs', async (req, res) => {
  try {
    const { teacherId } = req.params
    const logLimit = parseInt(req.query.limit) || 20

    const logs = await ActivityLog.find({ 'performedBy.userId': teacherId })
      .sort({ createdAt: -1 })
      .limit(logLimit)
      .populate('complaintId', 'category department title studentName')
      .lean()

    res.json({ logs })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error fetching teacher activity logs' })
  }
})

// ============ TEACHER COMPLAINT ROUTES ============

// Get teacher's assigned complaints (by assignedTeacherId) + department pool
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params
    const { status } = req.query

    if (mongoose.connection.readyState !== 1) {
      const teacher = inMemoryStore.findTeacherByIdOrEmail(teacherId)
      const complaints = inMemoryStore.getComplaints({ teacherId, status })
      return res.json({
        total: complaints.length,
        complaints,
        teacherDepartment: teacher ? teacher.department : 'CSE'
      })
    }

    // First find the teacher to get their department
    const teacher = await Teacher.findOne({
      $or: [{ teacherId }, { email: teacherId.toLowerCase() }]
    }).catch(() => null)
    
    // Fetch complaints assigned specifically to this teacher or in their department pool
    let query = teacher
      ? { $or: [{ assignedTeacherId: teacher.teacherId }, { department: teacher.department, status: 'Submitted' }] }
      : { assignedTeacherId: teacherId }

    // Apply status filter if provided
    if (status) {
      query.status = status
    }

    const complaints = await Complaint.find(query).sort({ createdAt: -1 }).lean().catch(() => [])

    res.json({
      total: complaints.length,
      complaints,
      teacherDepartment: teacher ? teacher.department : 'Faculty'
    })
  } catch (error) {
    console.error(error)
    const complaints = inMemoryStore.getComplaints({ teacherId: req.params.teacherId })
    res.json({ total: complaints.length, complaints, teacherDepartment: 'CSE' })
  }
})

// Update complaint status (Teacher)
router.put('/:complaintId/update-status', async (req, res) => {
  try {
    const { complaintId } = req.params
    const { newStatus, resolutionNotes, updatedBy } = req.body

    if (!newStatus) {
      return res.status(400).json({ message: 'New status is required' })
    }

    if (mongoose.connection.readyState !== 1) {
      const complaint = inMemoryStore.updateComplaint(complaintId, {
        status: newStatus,
        resolutionNotes: resolutionNotes || '',
        resolutionDate: newStatus === 'Resolved' ? new Date().toISOString() : null
      })
      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' })
      }
      if (!complaint.resolutionTimeline) complaint.resolutionTimeline = []
      complaint.resolutionTimeline.push({
        status: newStatus,
        timestamp: new Date().toISOString(),
        updatedBy: updatedBy || 'Teacher',
        notes: resolutionNotes || `Status updated to ${newStatus}`
      })
      inMemoryStore.createNotification({
        userId: complaint.studentId,
        userRole: 'student',
        type: newStatus === 'Resolved' ? 'complaint_resolved' : 'status_changed',
        title: `Complaint ${newStatus}`,
        message: `Your complaint "${complaint.title}" is now ${newStatus}.`,
        metadata: { complaintId: complaint._id, oldStatus: complaint.status, newStatus }
      })
      emitToUser(complaint.studentId, 'status_updated', {
        complaintId: complaint._id,
        newStatus,
        isResolved: newStatus === 'Resolved'
      })
      return res.json({ message: 'Status updated successfully', complaint })
    }

    const existingComplaint = await Complaint.findById(complaintId)
    if (!existingComplaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }
    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      {
        status: newStatus,
        resolutionNotes: resolutionNotes || existingComplaint.resolutionNotes,
        $push: {
          resolutionTimeline: {
            status: newStatus,
            timestamp: new Date(),
            updatedBy: updatedBy || 'Teacher',
            notes: resolutionNotes
          }
        },
        ...(newStatus === 'Resolved' && {
          resolutionDate: new Date(),
          notificationsSent: { resolved: true }
        })
      },
      { new: true }
    )

    // Log Activity
    await logActivity(
      complaintId,
      'status_changed',
      { 
        userId: updatedBy || complaint.assignedTeacherId || 'Teacher', 
        name: updatedBy || complaint.assignedTeacherName || 'Teacher', 
        role: updatedBy === 'Admin' ? 'admin' : 'teacher' 
      },
      { oldStatus: existingComplaint.status, newStatus },
      resolutionNotes || ''
    )

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    // Update teacher's active/resolved complaints count
    if (newStatus === 'Resolved') {
      await Teacher.updateOne(
        { teacherId: complaint.assignedTeacherId },
        {
          $inc: { activeComplaints: -1, resolvedComplaints: 1 }
        }
      )
    }

    // Create notification for student
    const notificationType = newStatus === 'Resolved' ? 'complaint_resolved' : 'status_changed'
    const notificationTitle = newStatus === 'Resolved' ? 'Complaint Resolved' : 'Status Updated'
    // Look up student's MongoDB _id to match JWT token's id field
    const studentForStatusNotif = await Student.findOne({ email: complaint.studentEmail })
    const statusNotifUserId = studentForStatusNotif ? studentForStatusNotif._id.toString() : complaint.studentId
    await createNotification({
      userId: statusNotifUserId,
      userRole: 'student',
      type: notificationType,
      title: notificationTitle,
      message: `Your complaint status has been updated to "${newStatus}".`,
      metadata: {
        complaintId: complaint._id.toString(),
        oldStatus: existingComplaint.status,
        newStatus
      }
    })

    // Emit Socket.io event
    emitToUser(complaint.studentId, 'status_updated', {
      complaintId: complaint._id,
      oldStatus: existingComplaint.status,
      newStatus,
      isResolved: newStatus === 'Resolved'
    })

    // Send email notification (non-blocking)
    if (newStatus === 'Resolved' && existingComplaint.status !== 'Resolved') {
      sendResolutionNotification(complaint).catch((err) =>
        console.error('[RESOLUTION_EMAIL_ERROR]', err.message)
      )
    } else if (newStatus !== existingComplaint.status) {
      sendStatusUpdate(complaint, existingComplaint.status, newStatus, resolutionNotes).catch((err) =>
        console.error('[STATUS_UPDATE_EMAIL_ERROR]', err.message)
      )
    }

    res.json({
      message: 'Complaint status updated successfully',
      complaint
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error updating complaint' })
  }
})

// ============ LEGACY-COMPATIBLE ROUTES (USED BY CURRENT FRONTEND) ============

router.get('/', async (_req, res) => {
  try {
    const complaints = await Complaint.find({}).sort({ createdAt: -1 })
    return res.json(complaints.map(mapComplaint))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error fetching complaints' })
  }
})

router.post('/', async (req, res) => {
  try {
    const payload = req.body

    // Validation
    if (!payload.category || !payload.department || !payload.description || !payload.studentEmail) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const complaintId = await getNextComplaintId()

    const complaint = await Complaint.create({
      complaintId,
      category: payload.category,
      department: payload.department,
      description: payload.description,
      priority: payload.priority || 'medium',
      studentName: payload.studentName || 'Student',
      studentEmail: payload.studentEmail,
      studentId: payload.studentId || '',
      phone: payload.phone || '',
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments.map((file) => ({ filename: file.filename || 'attachment', url: file.url || '' }))
        : [],
      status: 'Submitted',
      resolutionTimeline: [
        {
          status: 'Submitted',
          timestamp: new Date(),
          updatedBy: payload.studentName || 'Student',
          notes: 'Complaint submitted'
        }
      ]
    })

    await Student.updateOne(
      { email: payload.studentEmail },
      { $inc: { totalComplaints: 1 } }
    )

    return res.status(201).json(mapComplaint(complaint))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error creating complaint' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, adminRemarks, resolutionNotes } = req.body

    const validStatuses = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Escalated']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const existingComplaint = await Complaint.findById(id)
    if (!existingComplaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }
    const oldStatus = existingComplaint.status

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        ...(status ? { status } : {}),
        ...(adminRemarks ? { adminRemarks } : {}),
        ...(resolutionNotes ? { resolutionNotes } : {}),
        ...(status
          ? {
            $push: {
              resolutionTimeline: {
                status,
                timestamp: new Date(),
                updatedBy: 'System',
                notes: resolutionNotes || adminRemarks || `${status} updated`
              }
            }
          }
          : {}),
        ...(status === 'Resolved' ? { resolutionDate: new Date() } : {})
      },
      { new: true }
    )

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    // Trigger email notifications
    if (status) {
      if (status === 'Resolved' && oldStatus !== 'Resolved') {
        sendResolutionNotification(complaint).catch((err) =>
          console.error('[RESOLUTION_EMAIL_ERROR]', err.message)
        )
      } else if (status !== oldStatus) {
        sendStatusUpdate(complaint, oldStatus, status, resolutionNotes || adminRemarks).catch((err) =>
          console.error('[STATUS_UPDATE_EMAIL_ERROR]', err.message)
        )
      }
    }

    return res.json(mapComplaint(complaint))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error updating complaint' })
  }
})

router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params
    const { teacherId } = req.body

    if (!teacherId) {
      return res.status(400).json({ message: 'Select a teacher first' })
    }

    const teacher = await Teacher.findOne({ teacherId })
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' })
    }

    // Fetch existing to check for reassignment
    const existingComplaint = await Complaint.findById(id)
    if (!existingComplaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    const isReassign = existingComplaint.assignedTeacherId && existingComplaint.assignedTeacherId !== teacherId
    const previousTeacherId = existingComplaint.assignedTeacherId || null
    const previousTeacherName = existingComplaint.assignedTeacherName || null
    const previousTeacherDept = existingComplaint.assignedTeacherDepartment || null
    const now = new Date()

    const updateOps = {
      $set: {
        assignedTeacherId: teacher.teacherId,
        assignedTeacherName: teacher.name,
        assignedTeacherDepartment: teacher.department,
        assignedDate: now,
        status: 'Assigned'
      },
      $push: {
        resolutionTimeline: {
          status: 'Assigned',
          timestamp: now,
          updatedBy: 'Admin',
          notes: isReassign
            ? `Reassigned from ${previousTeacherName} to ${teacher.name}`
            : `Assigned to ${teacher.name}`
        }
      }
    }

    if (isReassign) {
      updateOps.$push.assignmentHistory = {
        teacherId: previousTeacherId,
        teacherName: previousTeacherName,
        department: previousTeacherDept,
        assignedDate: existingComplaint.assignedDate || existingComplaint.updatedAt,
        removedDate: now,
        assignedBy: 'Admin'
      }
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      updateOps,
      { new: true, runValidators: true }
    )

    if (!complaint) {
      return res.status(404).json({ message: 'Assignment failed, try again' })
    }

    // Update teacher counts
    if (isReassign && previousTeacherId) {
      await Teacher.updateOne(
        { teacherId: previousTeacherId },
        { $inc: { activeComplaints: -1 } }
      )
    }
    await Teacher.updateOne({ teacherId }, { $inc: { activeComplaints: 1 } })

    // Create activity log
    await ActivityLog.create({
      complaintId: complaint._id,
      action: isReassign ? 'reassigned' : 'assigned',
      assignedBy: 'Admin',
      assignedTo: {
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        department: teacher.department
      },
      previousTeacher: isReassign ? {
        teacherId: previousTeacherId,
        teacherName: previousTeacherName,
        department: previousTeacherDept
      } : { teacherId: null, teacherName: null, department: null },
      notes: isReassign
        ? `Reassigned from ${previousTeacherName} to ${teacher.name}`
        : `Assigned to ${teacher.name}`
    })

    // Emit to teacher room for real-time
    emitToUser(teacher.teacherId, 'new_assignment', {
      complaintId: complaint._id,
      studentName: complaint.studentName,
      category: complaint.category
    })
    emitToRole('teacher', 'new_assignment', {
      complaintId: complaint._id,
      assignedTeacherId: teacher.teacherId
    })

    // Send email notification to faculty
    sendComplaintAssignment(complaint, teacher).catch((err) =>
      console.error('[ASSIGNMENT_EMAIL_ERROR]', err.message)
    )

    return res.json(mapComplaint(complaint))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Assignment failed, try again' })
  }
})

module.exports = router
