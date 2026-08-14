const express = require('express');
const complaintController = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { complaintSchemas } = require('../utils/validationSchemas');

const router = express.Router();

// ============ STUDENT COMPLAINT ROUTES ============
router.post('/create', protect, authorize('student'), validate(complaintSchemas.create), complaintController.createComplaint);
router.get('/student/:studentId', protect, authorize('student', 'admin'), complaintController.getStudentComplaints);
router.get('/details/:complaintId', protect, complaintController.getComplaintDetails);
router.put('/:complaintId/feedback', protect, authorize('student'), complaintController.addComplaintFeedback);
router.delete('/:complaintId', protect, authorize('student'), complaintController.deleteComplaint);

// ============ ADMIN COMPLAINT ROUTES ============
router.get('/admin/all-complaints', protect, authorize('admin'), complaintController.getAllComplaints);
router.put('/:complaintId/assign', protect, authorize('admin'), complaintController.assignComplaint);
router.get('/admin/analytics', protect, authorize('admin'), complaintController.getAdminAnalytics);
router.get('/admin/activity-logs', protect, authorize('admin'), (req, res) => res.status(501).json({message: 'Not fully implemented in controller yet'}));

// ============ TEACHER COMPLAINT ROUTES ============
router.get('/teacher/:teacherId', protect, authorize('teacher'), (req, res) => res.status(501).json({message: 'Not fully implemented in controller yet'}));
router.put('/:complaintId/update-status', protect, authorize('teacher', 'admin'), complaintController.updateComplaintStatus);

module.exports = router;

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

    const complaint = await Complaint.create({
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

    return res.json(mapComplaint(complaint))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Assignment failed, try again' })
  }
})

module.exports = router
