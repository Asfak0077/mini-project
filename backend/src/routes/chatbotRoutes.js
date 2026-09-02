const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Complaint = require('../models/Complaint')
const Student = require('../models/Student')
const Teacher = require('../models/Teacher')
const ChatLog = require('../models/ChatLog')
const Feedback = require('../models/Feedback')
const { protect, authorize } = require('../middleware/authMiddleware')
const { getNextComplaintId } = require('../utils/complaintIdService')
const { createNotification } = require('../utils/notificationHelper')
const { emitToRole, emitToUser } = require('../utils/socketService')
const { logActivity } = require('../utils/loggerService')
const { inMemoryStore } = require('../utils/inMemoryStore')
const {
  sendComplaintSubmittedEmails,
  sendFeedbackNotification,
  sendFeedbackAdminNotification
} = require('../services/emailService')

const {
  analyzeSentiment,
  generateQuickReplies,
  autoSuggestCategory,
  predictPriority,
  generateSummary,
  enhanceFeedbackText,
  generateBio,
  generateFeedbackAnalyticsInsight,
  answerChatbotQuestion,
  extractComplaintDraft,
  evaluateComplaintQuality,
  answerWithLiveContext,
  analyzeFeedback,
  generateAggregatedFeedbackInsight
} = require('../utils/aiSimulator')

const { orchestrateChat } = require('../utils/aiOrchestrator')
const { joinExistingComplaint, findDuplicateComplaints } = require('../utils/duplicateDetectionEngine')

const router = express.Router()

// ─── Intent Regular Expressions ───────────────────────────────────────────────
const INTENTS = {
  GREETING:           /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/i,
  THANKS:             /\b(thank|thanks|appreciate|helpful)\b/i,
  LOGIN_HELP:         /\b(how.*login|how.*sign in|login help|sign in help|credentials)\b/i,
  GOOGLE_LOGIN:       /\b(google.*sign|google.*login|oauth|continue with google)\b/i,
  RESET_PASSWORD:     /\b(reset|forgot|change|recover).*(password|passcode)\b/i,
  STATUS_LOOKUP:      /\b(status of|check status|track my|my complaint status|what is the status|track complaint|status)\b/i,
  MY_COMPLAINTS:      /\b(my complaints|my pending|unresolved complaints|show my complaints|list my complaints|my tickets)\b/i,
  ASSIGNED_COMPLAINTS:/\b(assigned to me|my assigned|assigned complaints|workload)\b/i,
  CAMPUS_STATS:       /\b(stats|statistics|analytics|total complaints|campus stats|overall numbers)\b/i,
  FEEDBACK_REPORT:    /\b(feedback report|feedback analytics|student rating|satisfaction rate|feedback stats|feedback summary)\b/i,
  ESCALATIONS:        /\b(escalations|escalated complaints|pending over 7 days|bottlenecks)\b/i,
  SEARCH_QUERY:       /\b(search|find|show|lookup|filter)\s+(complaint|issue|grievance|ticket)/i,
  GIVE_FEEDBACK:      /\b(give feedback|submit feedback|rate complaint|rate teacher|rate faculty|feedback for|rate resolution|my feedback|star rating)\b/i,
  FEEDBACK_STATEMENT: /\b(was fixed|was resolved|fixed but|took too long|not receive updates|satisfaction|unsatisfactory|terrible service|poor response|good service|great work on resolving|rating for)\b/i,
  COMPLAINT_CREATION: /\b(submit|create|file|make|report|broken|not working|flickering|leak|leaking|damaged|stinking|dirty|noise|issue with|problem with)\b/i,
  FRUSTRATED:         /\b(urgent|ignored|no response|not resolved|worst|still pending|nobody|please fix|help me now|so frustrated|very frustrated)\b/i
}

// ─── Helper: Safely Decode Auth Token From Header ────────────────────────────
const extractAuthContext = async (req) => {
  let user = null
  let role = 'guest'
  let isAuthenticated = false

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]
      if (token && token !== 'null' && token !== 'undefined') {
        const secret = process.env.SECRET_KEY || process.env.JWT_SECRET || 'dev-secret'
        const decoded = jwt.verify(token, secret)
        const lookupId = decoded.id || decoded.userId || decoded.sub || decoded.email
        const tokenRole = decoded.role || decoded.userRole || 'student'

        if (mongoose.connection.readyState === 1) {
          if (tokenRole === 'teacher') {
            user = await Teacher.findOne({ $or: [{ teacherId: lookupId }, { email: (lookupId || '').toLowerCase() }] }).lean()
          } else {
            user = await Student.findOne({
              $or: [
                mongoose.Types.ObjectId.isValid(lookupId) ? { _id: lookupId } : null,
                { studentId: lookupId },
                { email: (lookupId || '').toLowerCase() }
              ].filter(Boolean)
            }).lean()
          }
        } else {
          if (tokenRole === 'teacher') {
            user = inMemoryStore.findTeacherByIdOrEmail(lookupId)
          } else {
            user = inMemoryStore.findStudentById(lookupId) || inMemoryStore.findStudentByEmail(lookupId)
          }
        }

        if (user) {
          role = tokenRole
          isAuthenticated = true
        }
      }
    } catch (e) {
      // Invalid/expired token -> remain as guest
    }
  }

  return { user, role, isAuthenticated }
}


// ─── Helper: Fetch Student's Eligible Resolved Complaints ─────────────────────
const getEligibleResolvedComplaints = async (studentId, studentEmail) => {
  try {
    let resolved = []
    if (mongoose.connection.readyState === 1) {
      resolved = await Complaint.find({
        $or: [
          studentId ? { studentId } : null,
          studentEmail ? { studentEmail: studentEmail.toLowerCase() } : null
        ].filter(Boolean),
        status: 'Resolved'
      }).sort({ updatedAt: -1 }).limit(10).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      resolved = inMemoryStore.complaints.filter(c =>
        c.status === 'Resolved' &&
        (c.studentId === studentId || (c.studentEmail && c.studentEmail.toLowerCase() === studentEmail.toLowerCase()))
      )
    }

    // Filter out complaints that already have feedback
    const existingFeedbackIds = new Set()
    if (mongoose.connection.readyState === 1) {
      const feedbacks = await Feedback.find({
        complaintId: { $in: resolved.map(r => r.complaintId || r._id.toString()) }
      }).select('complaintId').lean()
      feedbacks.forEach(f => existingFeedbackIds.add(f.complaintId))
    } else if (inMemoryStore && Array.isArray(inMemoryStore.feedback)) {
      inMemoryStore.feedback.forEach(f => existingFeedbackIds.add(f.complaintId))
    }

    return resolved.map(c => ({
      id: c._id,
      complaintId: c.complaintId || c._id.toString(),
      title: c.title || c.category,
      category: c.category,
      department: c.department,
      assignedTeacherId: c.assignedTeacherId || '',
      assignedTeacherName: c.assignedTeacherName || 'Faculty Team',
      resolutionNotes: c.resolutionNotes || '',
      hasFeedback: existingFeedbackIds.has(c.complaintId) || existingFeedbackIds.has(c._id.toString())
    }))
  } catch (err) {
    console.error('[AI] Fetch resolved complaints error:', err.message)
    return []
  }
}

// ─── POST /api/chatbot/message ────────────────────────────────────────────────
router.post('/message', async (req, res) => {
  try {
    const {
      message,
      sessionId,
      conversationState,
      complaintDraft,
      feedbackDraft,
      history = [],
      actionType = null,
      requestId = null,
      previousAssistantMessage = ''
    } = req.body

    if (!message && !actionType) {
      return res.status(400).json({ error: 'Message or action is required' })
    }

    const { user, role, isAuthenticated } = await extractAuthContext(req)

    const response = await orchestrateChat({
      message: message || '',
      sessionId,
      user,
      role,
      isAuthenticated,
      conversationState,
      complaintDraft,
      feedbackDraft,
      history,
      actionType,
      requestId,
      previousAssistantMessage
    })

    // Async chat log persistence
    setImmediate(async () => {
      try {
        if (response.sessionId && mongoose.connection.readyState === 1) {
          const studentId = user?.studentId || user?._id?.toString() || 'guest'
          await ChatLog.updateOne(
            { sessionId: response.sessionId },
            {
              $set: { userId: studentId, userRole: role || 'guest' },
              $push: {
                messages: {
                  $each: [
                    { sender: 'user', text: message || actionType || '' },
                    { sender: 'bot', text: response.text || '' }
                  ]
                }
              }
            },
            { upsert: true }
          )
        }
      } catch (logErr) {
        // non-blocking
      }
    })

    return res.json(response)
  } catch (error) {
    console.error('[AI] Chatbot message error:', error)
    return res.status(500).json({
      error: 'AI is temporarily unavailable. Please try again.',
      text: 'AI assistance is temporarily unavailable, but I can still help you check complaints and use available CampusResolve features.'
    })
  }
})

// ─── GET /api/chatbot/eligible-resolved-complaints ───────────────────────────
router.get('/eligible-resolved-complaints', protect, async (req, res) => {
  try {
    const studentUser = req.user
    if (!studentUser) return res.status(401).json({ message: 'Authentication required' })

    const studentId = studentUser.studentId || studentUser._id?.toString()
    const studentEmail = (studentUser.email || '').toLowerCase()

    const resolved = await getEligibleResolvedComplaints(studentId, studentEmail)
    res.json({ complaints: resolved })
  } catch (err) {
    console.error('Eligible complaints error:', err)
    res.status(500).json({ message: 'Failed to fetch eligible resolved complaints' })
  }
})

// ─── POST /api/chatbot/submit-feedback ───────────────────────────────────────
// Authenticated endpoint when student confirms feedback submission from preview card
router.post('/submit-feedback', protect, async (req, res) => {
  try {
    const { complaintId, rating, comment, category, aiAnalysis } = req.body

    if (!complaintId || !rating) {
      return res.status(400).json({ success: false, message: 'Complaint ID and rating are required.' })
    }

    const studentUser = req.user
    if (!studentUser) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const studentName = studentUser.name || 'Student'
    const studentEmail = (studentUser.email || '').toLowerCase()
    const studentId = studentUser.studentId || studentUser._id?.toString()

    // 1. Verify complaint exists and belongs to student & is Resolved
    let complaint = null
    if (mongoose.connection.readyState === 1) {
      complaint = await Complaint.findOne({
        $or: [
          { complaintId: complaintId },
          mongoose.Types.ObjectId.isValid(complaintId) ? { _id: complaintId } : null
        ].filter(Boolean)
      })
    } else if (inMemoryStore) {
      complaint = inMemoryStore.complaints.find(c =>
        (c.complaintId && c.complaintId === complaintId) || String(c._id) === complaintId
      )
    }

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' })
    }

    // Verify ownership
    const isOwner = (complaint.studentId && complaint.studentId === studentId) ||
                    (complaint.studentEmail && complaint.studentEmail.toLowerCase() === studentEmail)
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You can only submit feedback for your own complaints.' })
    }

    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ success: false, message: 'Feedback can only be submitted for resolved complaints.' })
    }

    // 2. Check for duplicate feedback
    if (mongoose.connection.readyState === 1) {
      const existing = await Feedback.findOne({ complaintId: complaint.complaintId || complaintId })
      if (existing) {
        return res.status(400).json({ success: false, message: 'Feedback has already been submitted for this complaint.' })
      }
    }

    const assignedTeacherId = complaint.assignedTeacherId || 'TCH-CSE-001'
    const assignedTeacherName = complaint.assignedTeacherName || 'Faculty Member'
    const department = complaint.department || 'CSE'
    const finalRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5))

    const isLowRating = finalRating <= 2 || (aiAnalysis && aiAnalysis.sentiment === 'Negative')

    const feedbackData = {
      complaintId: complaint.complaintId || complaintId,
      studentName,
      studentId,
      studentEmail,
      department,
      teacherId: assignedTeacherId,
      teacherName: assignedTeacherName,
      rating: finalRating,
      category: category || complaint.category || 'Resolution Satisfaction',
      comment: comment || '',
      aiAnalysis: aiAnalysis ? {
        sentiment: aiAnalysis.sentiment || 'Neutral',
        confidence: aiAnalysis.confidence || 0.9,
        topics: aiAnalysis.topics || ['Overall Experience'],
        resolutionQuality: aiAnalysis.resolutionQuality || 'Satisfactory',
        responseTime: aiAnalysis.responseTime || 'Moderate',
        communication: aiAnalysis.communication || 'Moderate',
        summary: aiAnalysis.summary || '',
        suggestedFollowUp: aiAnalysis.suggestedFollowUp || '',
        isLowRatingAlert: isLowRating
      } : undefined,
      date: new Date()
    }

    let savedFeedback = null
    if (mongoose.connection.readyState === 1) {
      const feedbackDoc = new Feedback(feedbackData)
      savedFeedback = await feedbackDoc.save()

      // Update complaint
      complaint.studentFeedback = comment || ''
      complaint.satisfactionRating = finalRating
      await complaint.save()
    } else if (inMemoryStore) {
      savedFeedback = inMemoryStore.createFeedback(feedbackData)
    }

    // 3. Dispatch Notifications
    if (isLowRating) {
      // Alert Faculty & Admin for Low Rating / Dissatisfaction Attention
      await createNotification({
        userId: assignedTeacherId,
        userRole: 'teacher',
        type: 'feedback',
        title: '⚠️ Low Rating Feedback Alert',
        message: `Low satisfaction (${finalRating}/5 ⭐) reported by ${studentName} on ${complaint.complaintId || complaintId}.`,
        metadata: {
          complaintId: complaint.complaintId || complaintId,
          rating: finalRating,
          suggestedFollowUp: aiAnalysis?.suggestedFollowUp || ''
        }
      }).catch(() => {})

      if (mongoose.connection.readyState === 1) {
        const admins = await Student.find({ role: 'admin', isActive: true }).select('_id').catch(() => [])
        await Promise.all(admins.map(admin =>
          createNotification({
            userId: admin._id.toString(),
            userRole: 'admin',
            type: 'feedback',
            title: '⚠️ Feedback Attention Required',
            message: `Low rating (${finalRating}/5 ⭐) on ${complaint.complaintId || complaintId}: "${aiAnalysis?.summary || comment}"`,
            metadata: {
              complaintId: complaint.complaintId || complaintId,
              rating: finalRating,
              suggestedFollowUp: aiAnalysis?.suggestedFollowUp || ''
            }
          }).catch(() => {})
        ))
      }
    } else {
      // Standard Feedback Notification
      await createNotification({
        userId: assignedTeacherId,
        userRole: 'teacher',
        type: 'feedback',
        title: 'New Feedback Received ⭐',
        message: `${studentName} provided ${finalRating}/5 ⭐ rating on ${complaint.title || complaint.complaintId}.`,
        metadata: {
          complaintId: complaint.complaintId || complaintId,
          rating: finalRating
        }
      }).catch(() => {})
    }

    // Email notifications asynchronously
    let teacherDoc = null
    if (mongoose.connection.readyState === 1) {
      teacherDoc = await Teacher.findOne({ teacherId: assignedTeacherId }).catch(() => null)
    }
    sendFeedbackNotification(savedFeedback, teacherDoc).catch(e => console.warn('[AI] Feedback teacher email error:', e.message))
    sendFeedbackAdminNotification(savedFeedback, teacherDoc).catch(e => console.warn('[AI] Feedback admin email error:', e.message))

    // Activity Log
    logActivity(
      complaint._id || complaint.complaintId || complaintId,
      'feedback_submitted',
      { userId: studentId, name: studentName, role: 'student' },
      { rating: finalRating, comment, sentiment: aiAnalysis?.sentiment },
      `Student submitted feedback with ${finalRating}/5 stars`
    ).catch(() => {})

    return res.status(201).json({
      success: true,
      message: `Feedback for ${complaint.complaintId || complaintId} submitted successfully!`,
      feedback: savedFeedback
    })

  } catch (err) {
    console.error('[AI] Submit feedback error:', err)
    return res.status(500).json({ success: false, message: 'Failed to submit feedback' })
  }
})

// ─── POST /api/chatbot/join-complaint ─────────────────────────────────────────
router.post('/join-complaint', protect, async (req, res) => {
  try {
    const { complaintId } = req.body
    if (!complaintId) {
      return res.status(400).json({ success: false, message: 'complaintId is required' })
    }

    const studentUser = req.user
    if (!studentUser) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const result = await joinExistingComplaint(complaintId, studentUser)
    if (!result.success) {
      return res.status(400).json(result)
    }

    // Send notifications to admins
    if (mongoose.connection.readyState === 1 && !result.alreadyJoined) {
      const admins = await Student.find({ role: 'admin', isActive: true }).select('_id').catch(() => [])
      await Promise.all(admins.map(admin =>
        createNotification({
          userId: admin._id.toString(),
          userRole: 'admin',
          type: 'complaint_updated',
          title: 'Additional Student Joined Ticket',
          message: `${studentUser.name || 'A student'} reported being affected by ${result.complaintId}: "${result.title}" (Total affected: ${result.affectedCount}).`,
          metadata: {
            complaintId: result.complaintId,
            ticketNumber: result.complaintId
          }
        }).catch(() => {})
      ))
    }

    return res.json(result)
  } catch (err) {
    console.error('[AI] join-complaint route error:', err)
    return res.status(500).json({ success: false, message: 'Failed to join complaint' })
  }
})

// ─── POST /api/chatbot/create-complaint ───────────────────────────────────────
router.post('/create-complaint', protect, async (req, res) => {
  try {
    const { title, category, department, description, priority, location, duplicateDetection, duplicateDecision } = req.body

    if (!category || !description) {
      return res.status(400).json({ message: 'Category and description are required' })
    }

    const studentUser = req.user
    if (!studentUser) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const studentName = studentUser.name || 'Student'
    const studentEmail = (studentUser.email || '').toLowerCase()
    const studentId = studentUser.studentId || studentUser._id?.toString() || 'CR-STUDENT'
    const studentPhone = studentUser.phone || ''
    const assignedDept = department || studentUser.department || 'CSE'

    const fullDescription = location && !description.toLowerCase().includes(location.toLowerCase())
      ? `[Location: ${location}]\n${description}`
      : description

    const complaintId = await getNextComplaintId()
    let savedComplaint = null

    const duplicateMeta = {
      similarityScore: duplicateDetection?.similarityScore || 0,
      matchedComplaintId: duplicateDetection?.matchedComplaintId || '',
      duplicateType: duplicateDetection?.duplicateType || (duplicateDecision === 'CREATED_ANYWAY' ? 'POSSIBLE_DUPLICATE' : 'NONE'),
      detectionTimestamp: duplicateDetection ? new Date() : null,
      userDecision: duplicateDecision || 'NONE'
    }

    if (mongoose.connection.readyState !== 1) {
      const created = inMemoryStore.createComplaint({
        complaintId,
        title: title || `${category} Issue`,
        category,
        department: assignedDept,
        description: fullDescription,
        location: location || '',
        priority: priority || 'medium',
        studentName,
        studentEmail,
        studentId,
        studentPhone,
        affectedCount: 1,
        affectedUsers: [{ studentId, studentName, studentEmail, joinedAt: new Date().toISOString() }],
        duplicateDetection: duplicateMeta
      })
      savedComplaint = created
    } else {
      const complaintDoc = new Complaint({
        complaintId,
        title: title || `${category} Issue`,
        category,
        department: assignedDept,
        description: fullDescription,
        location: location || '',
        priority: (priority || 'medium').toLowerCase() === 'urgent' ? 'Urgent' : (priority || 'medium').toLowerCase(),
        studentName,
        studentEmail,
        studentId: studentUser._id ? studentUser._id.toString() : studentId,
        studentPhone,
        status: 'Submitted',
        affectedCount: 1,
        affectedUsers: [
          {
            studentId: studentUser._id ? studentUser._id.toString() : studentId,
            studentName,
            studentEmail,
            joinedAt: new Date()
          }
        ],
        duplicateDetection: duplicateMeta,
        resolutionTimeline: [
          {
            status: 'Submitted',
            timestamp: new Date(),
            updatedBy: 'CampusResolve AI Assistant',
            notes: 'Complaint submitted via AI Assistant conversation'
          }
        ]
      })

      savedComplaint = await complaintDoc.save()

      if (studentUser._id) {
        await Student.updateOne({ _id: studentUser._id }, { $inc: { totalComplaints: 1 } }).catch(() => {})
      }
    }

    const notifUserId = studentUser._id ? studentUser._id.toString() : studentId
    await createNotification({
      userId: notifUserId,
      userRole: 'student',
      type: 'complaint_submitted',
      title: 'Complaint Submitted via AI Assistant',
      message: `Your complaint **${complaintId}** (${category}) has been logged successfully.`,
      metadata: {
        complaintId: savedComplaint._id ? savedComplaint._id.toString() : complaintId,
        ticketNumber: complaintId,
        complaintCategory: category
      }
    }).catch(() => {})

    if (mongoose.connection.readyState === 1) {
      const admins = await Student.find({ role: 'admin', isActive: true }).select('_id').catch(() => [])
      await Promise.all(admins.map(admin =>
        createNotification({
          userId: admin._id.toString(),
          userRole: 'admin',
          type: 'complaint_submitted',
          title: 'New Complaint Filed via AI',
          message: `${studentName} filed ${complaintId}: "${title || category}".`,
          metadata: {
            complaintId: savedComplaint._id ? savedComplaint._id.toString() : complaintId,
            ticketNumber: complaintId,
            complaintCategory: category
          }
        }).catch(() => {})
      ))
    }

    emitToRole('admin', 'new_complaint', {
      complaintId: savedComplaint._id || complaintId,
      ticketNumber: complaintId,
      studentName,
      category,
      department: assignedDept,
      priority: savedComplaint.priority
    })

    sendComplaintSubmittedEmails(savedComplaint).catch(err => {
      console.warn('[AI] Email dispatch warning:', err.message)
    })

    logActivity(
      savedComplaint._id || complaintId,
      'created',
      { userId: studentId, name: studentName, role: 'student' },
      { category, department: assignedDept, priority: savedComplaint.priority, title: savedComplaint.title, source: 'ai_assistant' },
      'Complaint created via CampusResolve AI Assistant'
    ).catch(() => {})

    return res.status(201).json({
      success: true,
      message: `Complaint ${complaintId} created successfully!`,
      complaint: {
        id: savedComplaint._id,
        complaintId,
        ticketNumber: complaintId,
        title: savedComplaint.title,
        category: savedComplaint.category,
        department: savedComplaint.department,
        priority: savedComplaint.priority,
        status: savedComplaint.status,
        createdAt: savedComplaint.createdAt || new Date()
      }
    })

  } catch (err) {
    console.error('[AI] Create complaint from chat error:', err)
    return res.status(500).json({ message: 'Failed to create complaint from AI Assistant' })
  }
})

// ─── GET /api/chatbot/logs (Admin only) ───────────────────────────────────────
router.get('/logs', protect, authorize('admin'), async (req, res) => {
  try {
    const logs = await ChatLog.find().sort({ updatedAt: -1 }).limit(100)
    res.json(logs)
  } catch (error) {
    console.error('Failed to fetch chat logs:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// ─── POST /api/chatbot/enhance-text ──────────────────────────────────────────
router.post('/enhance-text', async (req, res) => {
  try {
    const { text, mode } = req.body
    if (!text) return res.status(400).json({ error: 'Text is required' })
    const enhanced = await enhanceFeedbackText(text, mode || 'improve')
    res.json({ enhanced })
  } catch (error) {
    console.error('Enhance text error:', error)
    res.status(500).json({ error: 'Failed to enhance text' })
  }
})


// ─── POST /api/chatbot/generate-bio ──────────────────────────────────────────
router.post('/generate-bio', async (req, res) => {
  try {
    const { name, role, department } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const bio = await generateBio(name, role || 'student', department || '')
    res.json({ bio })
  } catch (error) {
    console.error('Generate bio error:', error)
    res.status(500).json({ error: 'Failed to generate bio' })
  }
})

// ─── POST /api/chatbot/user-context ──────────────────────────────────────────
router.post('/user-context', async (req, res) => {
  try {
    const { userId, userRole } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })
    if (mongoose.connection.readyState !== 1) {
      return res.json({ role: userRole, total: 0, resolved: 0, pending: 0, inProgress: 0 })
    }
    let contextData = { role: userRole }
    if (userRole === 'student') {
      const [total, resolved, pending, inProgress, resolvedWithoutFeedback] = await Promise.all([
        Complaint.countDocuments({ studentId: userId }).catch(() => 0),
        Complaint.countDocuments({ studentId: userId, status: 'Resolved' }).catch(() => 0),
        Complaint.countDocuments({ studentId: userId, status: { $in: ['Submitted', 'Assigned'] } }).catch(() => 0),
        Complaint.countDocuments({ studentId: userId, status: 'In Progress' }).catch(() => 0),
        Complaint.find({ studentId: userId, status: 'Resolved', $or: [{ studentFeedback: '' }, { studentFeedback: null }, { studentFeedback: { $exists: false } }] })
          .select('_id title category complaintId').limit(3).lean().catch(() => [])
      ])
      contextData = { role: userRole, total, resolved, pending, inProgress, resolvedWithoutFeedback }
    } else if (userRole === 'admin') {
      const [total, resolved, pending] = await Promise.all([
        Complaint.countDocuments().catch(() => 0),
        Complaint.countDocuments({ status: 'Resolved' }).catch(() => 0),
        Complaint.countDocuments({ status: { $in: ['Submitted', 'Assigned'] } }).catch(() => 0),
      ])
      contextData = { role: userRole, total, resolved, pending }
    } else if (userRole === 'teacher') {
      const [assigned, resolved] = await Promise.all([
        Complaint.countDocuments({ assignedTeacherId: userId }).catch(() => 0),
        Complaint.countDocuments({ assignedTeacherId: userId, status: 'Resolved' }).catch(() => 0)
      ])
      contextData = { role: userRole, assigned, resolved }
    }
    res.json(contextData)
  } catch (error) {
    console.error('User context error:', error)
    res.status(500).json({ error: 'Failed to fetch user context' })
  }
})

module.exports = router
