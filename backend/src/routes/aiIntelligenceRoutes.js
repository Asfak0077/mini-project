const express = require('express')
const mongoose = require('mongoose')
const Complaint = require('../models/Complaint')
const ComplaintAIAnalysis = require('../models/ComplaintAIAnalysis')
const { inMemoryStore } = require('../utils/inMemoryStore')
const { protect, authorize } = require('../middleware/authMiddleware')
const {
  analyzeComplaintIntelligence,
  getCampusIntelligenceSummary
} = require('../services/aiIntelligenceService')

const router = express.Router()

/**
 * Helper to fetch complaint by ID or ticket ID from DB or inMemoryStore
 */
const getComplaintRecord = async (id) => {
  if (!id) return null
  if (mongoose.connection.readyState === 1) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const byId = await Complaint.findById(id).lean()
      if (byId) return byId
    }
    const byTicket = await Complaint.findOne({
      $or: [{ complaintId: id }, { ticketNumber: id }]
    }).lean()
    if (byTicket) return byTicket
  }
  return inMemoryStore.findComplaintById(id)
}

/**
 * GET /api/ai-intelligence/complaints/:complaintId
 * Fetches AI intelligence for a complaint, filtered based on the requesting user's role.
 */
router.get('/complaints/:complaintId', protect, async (req, res) => {
  try {
    const { complaintId } = req.params
    const userRole = req.userRole || req.user?.role || 'student'
    const userId = req.user?.studentId || req.user?.id || req.user?._id

    const complaint = await getComplaintRecord(complaintId)
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' })
    }

    // Role security check: Students can only view intelligence for their own complaints
    if (userRole === 'student') {
      const reqEmail = (req.user?.email || '').toLowerCase().trim()
      const reqStudentId = String(req.user?.studentId || '').toLowerCase().trim()
      const reqMongoId = String(req.user?._id || req.user?.id || '').toLowerCase().trim()

      const complaintEmail = (complaint.studentEmail || '').toLowerCase().trim()
      const complaintStudentId = String(complaint.studentId || '').toLowerCase().trim()

      const isOwner =
        Boolean(reqEmail && complaintEmail && reqEmail === complaintEmail) ||
        Boolean(reqStudentId && complaintStudentId && reqStudentId === complaintStudentId) ||
        Boolean(reqMongoId && complaintStudentId && reqMongoId === complaintStudentId) ||
        Boolean(reqEmail && complaintStudentId && reqEmail === complaintStudentId) ||
        Boolean(reqStudentId && complaintEmail && reqStudentId === complaintEmail)

      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Access denied to other students complaints.' })
      }
    }

    // Retrieve or generate intelligence
    const intelligence = await analyzeComplaintIntelligence(complaint, { force: false })
    if (!intelligence) {
      return res.status(503).json({
        success: false,
        message: 'AI analysis is temporarily unavailable.'
      })
    }

    // ── Enforce Role-Based Access Control (RBAC) ──
    if (userRole === 'student') {
      // Students receive transparent progress estimates, dynamic health score & history
      return res.json({
        success: true,
        role: 'student',
        complaintId: intelligence.complaintId,
        complaintTicketId: intelligence.complaintTicketId,
        healthScore: {
          score: intelligence.healthScore?.score ?? 85,
          status: intelligence.healthScore?.status ?? 'Healthy',
          healthLabel: intelligence.healthScore?.healthLabel ?? intelligence.healthScore?.status ?? 'Healthy',
          reason: intelligence.healthScore?.reason || 'Your complaint is actively monitored under standard SLA.',
          breakdown: intelligence.healthScore?.breakdown,
          recommendedAction: intelligence.healthScore?.recommendedAction || 'Your complaint is being monitored for timely resolution.'
        },
        slaPrediction: {
          isResolved: intelligence.slaPrediction?.isResolved || false,
          finalOutcome: intelligence.slaPrediction?.finalOutcome,
          actualResolutionHours: intelligence.slaPrediction?.actualResolutionHours,
          targetSlaHours: intelligence.slaPrediction?.targetSlaHours,
          riskLevel: intelligence.slaPrediction?.riskLevel,
          breachProbability: intelligence.slaPrediction?.breachProbability,
          confidenceLevel: intelligence.slaPrediction?.confidenceLevel || 'Medium Confidence',
          timeRemaining: intelligence.slaPrediction?.timeRemaining ?? 'Within normal schedule',
          predictedResolutionTime: intelligence.slaPrediction?.predictedResolutionTime ?? 'Standard window',
          factors: intelligence.slaPrediction?.factors || intelligence.slaPrediction?.reason || []
        },
        resolutionPrediction: intelligence.resolutionPrediction || null,
        analysisHistory: intelligence.analysisHistory || [],
        generatedAt: intelligence.generatedAt,
        updatedAt: intelligence.updatedAt
      })
    }

    if (userRole === 'teacher') {
      // Faculty receives Root Cause, SLA Risk, Recurring Issue, Health Score, Resolution Prediction & Smart Escalation
      return res.json({
        success: true,
        role: 'teacher',
        complaintId: intelligence.complaintId,
        complaintTicketId: intelligence.complaintTicketId,
        rootCauseAnalysis: intelligence.rootCauseAnalysis,
        slaPrediction: intelligence.slaPrediction,
        recurringIssue: intelligence.recurringIssue,
        healthScore: intelligence.healthScore,
        resolutionPrediction: intelligence.resolutionPrediction,
        smartEscalation: intelligence.smartEscalation,
        analysisHistory: intelligence.analysisHistory || [],
        generatedAt: intelligence.generatedAt,
        updatedAt: intelligence.updatedAt,
        analysisVersion: intelligence.analysisVersion
      })
    }

    // Admin receives full intelligence
    return res.json({
      success: true,
      role: 'admin',
      ...intelligence
    })
  } catch (error) {
    console.error('Error fetching complaint AI intelligence:', error)
    return res.status(500).json({
      success: false,
      message: 'AI analysis is temporarily unavailable.'
    })
  }
})

/**
 * POST /api/ai-intelligence/complaints/:complaintId/refresh
 * Forces re-analysis of a complaint (Faculty, Admin, or Complaint Owner).
 */
router.post('/complaints/:complaintId/refresh', protect, async (req, res) => {
  try {
    const { complaintId } = req.params
    const userRole = req.userRole || req.user?.role || 'student'

    const complaint = await getComplaintRecord(complaintId)
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' })
    }

    // If student, verify ownership
    if (userRole === 'student') {
      const reqEmail = (req.user?.email || '').toLowerCase().trim()
      const reqStudentId = String(req.user?.studentId || '').toLowerCase().trim()
      const reqMongoId = String(req.user?._id || req.user?.id || '').toLowerCase().trim()

      const complaintEmail = (complaint.studentEmail || '').toLowerCase().trim()
      const complaintStudentId = String(complaint.studentId || '').toLowerCase().trim()

      const isOwner =
        Boolean(reqEmail && complaintEmail && reqEmail === complaintEmail) ||
        Boolean(reqStudentId && complaintStudentId && reqStudentId === complaintStudentId) ||
        Boolean(reqMongoId && complaintStudentId && reqMongoId === complaintStudentId) ||
        Boolean(reqEmail && complaintStudentId && reqEmail === complaintStudentId) ||
        Boolean(reqStudentId && complaintEmail && reqStudentId === complaintEmail)

      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Access denied to refresh other students complaints.' })
      }
    }

    const freshIntelligence = await analyzeComplaintIntelligence(complaint, { force: true })
    return res.json({
      success: true,
      message: 'AI analysis refreshed successfully',
      data: freshIntelligence
    })
  } catch (error) {
    console.error('Error refreshing AI analysis:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh AI analysis.'
    })
  }
})

/**
 * POST /api/ai-intelligence/complaints/:complaintId/smart-escalate
 * Smart Escalation Agent: Escalates a complaint based on AI risk recommendation.
 */
router.post('/complaints/:complaintId/smart-escalate', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { complaintId } = req.params
    const { reason = 'AI recommended escalation due to SLA breach risk' } = req.body

    const complaint = await getComplaintRecord(complaintId)
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' })
    }

    if (complaint.status === 'Resolved') {
      return res.status(400).json({ success: false, message: 'Cannot escalate a resolved grievance.' })
    }

    const timelineEntry = {
      status: 'Escalated',
      notes: reason || 'Escalated following AI operational risk evaluation.',
      timestamp: new Date()
    }

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(complaintId)) {
      await Complaint.findByIdAndUpdate(complaintId, {
        $set: { status: 'Escalated', priority: 'Urgent' },
        $push: { resolutionTimeline: timelineEntry }
      })
    } else {
      complaint.status = 'Escalated'
      complaint.priority = 'Urgent'
      if (!complaint.resolutionTimeline) complaint.resolutionTimeline = []
      complaint.resolutionTimeline.push(timelineEntry)
    }

    // Refresh AI intelligence to reflect escalated state
    const freshAnalysis = await analyzeComplaintIntelligence(complaint, { force: true })

    const ticketId = complaint.complaintId || complaint.ticketNumber || `CR-${complaintId.slice(-4)}`

    // Create notification
    const { createNotification } = require('../utils/notificationHelper')
    await createNotification({
      userId: 'admin',
      userRole: 'admin',
      type: 'complaint_escalated',
      title: '🚨 Complaint Escalated by AI Recommendation',
      message: `${ticketId}: ${complaint.title} has been escalated to Urgent priority.`,
      metadata: { complaintId, ticketId, reason }
    }).catch(() => null)

    // Emit socket update
    const { getIO } = require('../utils/socketService')
    try {
      const io = getIO()
      if (io) {
        io.emit('complaint_updated', {
          complaintId,
          ticketId,
          status: 'Escalated',
          priority: 'Urgent',
          reason
        })
      }
    } catch (_e) {}

    return res.json({
      success: true,
      message: 'Complaint escalated successfully.',
      data: {
        complaintId,
        ticketId,
        status: 'Escalated',
        priority: 'Urgent',
        analysis: freshAnalysis
      }
    })
  } catch (error) {
    console.error('Error executing smart escalation:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to execute smart escalation.'
    })
  }
})

/**
 * GET /api/ai-intelligence/admin/campus-summary
 * Admin command center overview: Hotspots, recurring issues, SLA risk alerts, department trends, and benchmarks.
 */
router.get('/admin/campus-summary', protect, authorize('admin'), async (req, res) => {
  try {
    const force = req.query.force === 'true'
    const summary = await getCampusIntelligenceSummary({ force })
    return res.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('Error fetching campus intelligence summary:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load campus intelligence summary.'
    })
  }
})

/**
 * GET /api/ai-intelligence/admin/recommendations
 * Agent Recommendation Center: Urgent actions, pattern alerts, and opportunities.
 */
router.get('/admin/recommendations', protect, authorize('admin'), async (_req, res) => {
  try {
    const summary = await getCampusIntelligenceSummary()
    return res.json({
      success: true,
      data: summary.aiRecommendations || { urgentActions: [], patternAlerts: [], opportunities: [] }
    })
  } catch (error) {
    console.error('Error fetching AI recommendations:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to load AI recommendations.'
    })
  }
})

/**
 * POST /api/ai-intelligence/admin/recommendations/:id/dismiss
 * Dismisses a recommendation from the Recommendation Center.
 */
router.post('/admin/recommendations/:id/dismiss', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { dismissRecommendation } = require('../services/aiIntelligenceService')
    dismissRecommendation(id)
    return res.json({
      success: true,
      message: 'Recommendation dismissed successfully.'
    })
  } catch (error) {
    console.error('Error dismissing recommendation:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to dismiss recommendation.'
    })
  }
})

module.exports = router
