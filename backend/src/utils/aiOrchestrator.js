/**
 * CampusResolve AI Orchestrator v2
 * 
 * Pipeline Architecture:
 *   Message → MessageAnalyzer → ConversationStateEngine → Intent Router
 *                                                          ├── Application Actions (deterministic)
 *                                                          ├── Complaint Workflow (state machine + LLM)
 *                                                          ├── Feedback Workflow (state machine + LLM)
 *                                                          ├── Personal Database Tools (secure filtered queries)
 *                                                          └── RAG Pipeline (public knowledge only)
 *                                                                ↓
 *                                                          ResponseValidator → Response
 */

const mongoose = require('mongoose')
const Complaint = require('../models/Complaint')
const Student = require('../models/Student')
const Teacher = require('../models/Teacher')
const Feedback = require('../models/Feedback')
const { inMemoryStore } = require('./inMemoryStore')
const { getNextComplaintId } = require('./complaintIdService')
const { searchCampusKnowledge, buildRAGContext } = require('./ragEngine')
const { analyzeCurrentMessage, MESSAGE_CATEGORIES } = require('./messageAnalyzer')
const { STATES, normalizeState, transition, getFallbackResponse, getQuickActionsForState, isWorkflowActive } = require('./conversationStateEngine')
const { validateResponse } = require('./responseValidator')
const {
  extractComplaintDraft,
  evaluateComplaintQuality,
  analyzeFeedback,
  askGemini
} = require('./aiSimulator')
const {
  findDuplicateComplaints,
  joinExistingComplaint
} = require('./duplicateDetectionEngine')

// ── Legacy Exports (backward compat) ─────────────────────────────────────────
const CONVERSATION_STATES = { ...STATES }
const INTENTS = {
  CREATE_COMPLAINT: 'CREATE_COMPLAINT',
  PROVIDE_COMPLAINT_DETAILS: 'PROVIDE_COMPLAINT_DETAILS',
  CHECK_COMPLAINT_STATUS: 'CHECK_COMPLAINT_STATUS',
  SHOW_PENDING_COMPLAINTS: 'SHOW_PENDING_COMPLAINTS',
  SHOW_RESOLVED_COMPLAINTS: 'SHOW_RESOLVED_COMPLAINTS',
  SHOW_COMPLAINT_HISTORY: 'SHOW_COMPLAINT_HISTORY',
  GIVE_FEEDBACK: 'GIVE_FEEDBACK',
  EDIT_FEEDBACK: 'EDIT_FEEDBACK',
  SUBMIT_FEEDBACK: 'SUBMIT_FEEDBACK',
  CANCEL_ACTION: 'CANCEL_ACTION',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  GREETING: 'GREETING',
  LOGIN_HELP: 'LOGIN_HELP'
}

// ── Deduplication Request Cache (TTL 30 seconds) ─────────────────────────────
const processedRequestCache = new Map()

const isRequestDuplicate = (requestId) => {
  if (!requestId) return false
  if (processedRequestCache.has(requestId)) return true
  processedRequestCache.set(requestId, Date.now())
  // Cleanup entries older than 30s
  if (processedRequestCache.size > 200) {
    const now = Date.now()
    for (const [key, ts] of processedRequestCache.entries()) {
      if (now - ts > 30000) processedRequestCache.delete(key)
    }
  }
  return false
}

// ── Application Database Tools ───────────────────────────────────────────────
// All personal queries enforce strict userId/email authorization

const getMyPendingComplaints = async (user) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const studentEmail = (user?.email || '').toLowerCase()
  const pendingStatuses = ['Submitted', 'Assigned', 'In Progress', 'Escalated']

  try {
    if (mongoose.connection.readyState === 1) {
      return await Complaint.find({
        $or: [
          studentId ? { studentId } : null,
          studentEmail ? { studentEmail } : null
        ].filter(Boolean),
        status: { $in: pendingStatuses }
      }).sort({ createdAt: -1 }).limit(10).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      return inMemoryStore.complaints.filter(c =>
        ((c.studentId && c.studentId === studentId) || (c.studentEmail && c.studentEmail.toLowerCase() === studentEmail)) &&
        pendingStatuses.includes(c.status)
      ).slice(0, 10)
    }
    return []
  } catch (err) {
    console.error('[AI Tool] getMyPendingComplaints error:', err.message)
    return []
  }
}

const getMyComplaintStatus = async (user, complaintId) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const userEmail = (user?.email || '').toLowerCase()
  const targetId = (complaintId || '').trim().toUpperCase()

  try {
    let complaint = null
    if (mongoose.connection.readyState === 1) {
      complaint = await Complaint.findOne({
        $or: [
          { complaintId: targetId },
          mongoose.Types.ObjectId.isValid(targetId) ? { _id: targetId } : null
        ].filter(Boolean)
      }).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      complaint = inMemoryStore.complaints.find(c =>
        (c.complaintId && c.complaintId.toUpperCase() === targetId) || String(c._id) === targetId
      )
    }

    if (!complaint) return { found: false, unauthorized: false }

    const isOwner = (complaint.studentId && complaint.studentId === studentId) ||
                    (complaint.studentEmail && complaint.studentEmail.toLowerCase() === userEmail)
    const isTeacher = user?.role === 'teacher' && (complaint.assignedTeacherId === (user?.teacherId || user?._id?.toString()) || complaint.assignedTeacherEmail === userEmail)
    const isAdmin = user?.role === 'admin'

    if (isOwner || isTeacher || isAdmin) {
      return { found: true, unauthorized: false, complaint }
    }
    return { found: true, unauthorized: true, complaint: null }
  } catch (err) {
    console.error('[AI Tool] getMyComplaintStatus error:', err.message)
    return { found: false, unauthorized: false }
  }
}

const getMyComplaintHistory = async (user, limit = 10) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const studentEmail = (user?.email || '').toLowerCase()

  try {
    if (mongoose.connection.readyState === 1) {
      return await Complaint.find({
        $or: [
          studentId ? { studentId } : null,
          studentEmail ? { studentEmail } : null
        ].filter(Boolean)
      }).sort({ createdAt: -1 }).limit(limit).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      return inMemoryStore.complaints.filter(c =>
        (c.studentId && c.studentId === studentId) || (c.studentEmail && c.studentEmail.toLowerCase() === studentEmail)
      ).slice(0, limit)
    }
    return []
  } catch (err) {
    console.error('[AI Tool] getMyComplaintHistory error:', err.message)
    return []
  }
}

const getResolvedComplaintsForFeedback = async (user) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const studentEmail = (user?.email || '').toLowerCase()

  try {
    let resolved = []
    if (mongoose.connection.readyState === 1) {
      resolved = await Complaint.find({
        $or: [
          studentId ? { studentId } : null,
          studentEmail ? { studentEmail } : null
        ].filter(Boolean),
        status: 'Resolved'
      }).sort({ updatedAt: -1 }).limit(10).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      resolved = inMemoryStore.complaints.filter(c =>
        c.status === 'Resolved' &&
        ((c.studentId && c.studentId === studentId) || (c.studentEmail && c.studentEmail.toLowerCase() === studentEmail))
      ).slice(0, 10)
    }

    const existingIds = new Set()
    if (mongoose.connection.readyState === 1) {
      const fbList = await Feedback.find({
        complaintId: { $in: resolved.map(r => r.complaintId || r._id.toString()) }
      }).select('complaintId').lean()
      fbList.forEach(f => existingIds.add(f.complaintId))
    } else if (inMemoryStore && Array.isArray(inMemoryStore.feedback)) {
      inMemoryStore.feedback.forEach(f => existingIds.add(f.complaintId))
    }

    return resolved.map(c => ({
      id: c._id,
      complaintId: c.complaintId || c._id.toString(),
      title: c.title || c.category,
      category: c.category,
      department: c.department,
      assignedTeacherId: c.assignedTeacherId || '',
      assignedTeacherName: c.assignedTeacherName || 'Faculty Coordinator',
      resolutionNotes: c.resolutionNotes || '',
      hasFeedback: existingIds.has(c.complaintId) || existingIds.has(c._id.toString())
    }))
  } catch (err) {
    console.error('[AI Tool] getResolvedComplaintsForFeedback error:', err.message)
    return []
  }
}

// ── Build Structured Memory for LLM ──────────────────────────────────────────
const buildStructuredMemory = ({ conversationState, complaintDraft, feedbackDraft, lastAssistantMessage, history = [] }) => {
  const recentMessages = (history || []).slice(-8)
  return {
    systemRole: 'You are the official CampusResolve AI Assistant for a university campus grievance redressal system.',
    currentState: conversationState,
    activeWorkflow: isWorkflowActive(conversationState) ? 'Active' : 'None',
    complaintDraft: complaintDraft || null,
    feedbackDraft: feedbackDraft || null,
    lastQuestion: lastAssistantMessage || '',
    recentMessages
  }
}

// ── Format Complaint List for Response ────────────────────────────────────────
const formatComplaintList = (complaints) => {
  return complaints.map(c => ({
    id: c._id,
    complaintId: c.complaintId || 'CR-001',
    title: c.title || c.category,
    category: c.category,
    department: c.department,
    status: c.status,
    priority: c.priority,
    assignedTeacherName: c.assignedTeacherName || 'Faculty',
    createdAt: c.createdAt
  }))
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR MAIN ENTRYPOINT
// ══════════════════════════════════════════════════════════════════════════════

const orchestrateChat = async ({
  message,
  sessionId,
  user,
  role = 'guest',
  isAuthenticated = false,
  conversationState = 'IDLE',
  complaintDraft = null,
  feedbackDraft = null,
  history = [],
  actionType = null,
  requestId = null,
  previousAssistantMessage = ''
}) => {
  const trimmedMsg = (message || '').trim()
  const userRole = role || 'guest'
  const userName = user?.name || 'Student'
  const currentSessionId = sessionId || `sess-${Date.now()}`

  // ── Step 0: Request Deduplication ──────────────────────────────────────
  if (requestId && isRequestDuplicate(requestId)) {
    console.warn(`[AI Orchestrator] Duplicate request ignored: ${requestId}`)
    return {
      sessionId: currentSessionId,
      state: conversationState,
      intent: 'GENERAL_QUESTION',
      text: 'Processing your previous request...',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(conversationState, userRole)
    }
  }

  // ── Step 1: Analyze Current Message ────────────────────────────────────
  // Derive the last assistant message from history if not passed explicitly
  const lastAssistantMsg = previousAssistantMessage ||
    [...(history || [])].reverse().find(h => h.sender === 'bot')?.text || ''

  const analysis = analyzeCurrentMessage({
    message: trimmedMsg,
    actionType,
    conversationState: normalizeState(conversationState),
    complaintDraft,
    feedbackDraft,
    previousAssistantMessage: lastAssistantMsg,
    history
  })

  const intent = analysis.intent
  const msgCategory = analysis.messageCategory

  // ── Step 2: Handle CANCEL (Deterministic — Never touches LLM) ──────────
  if (intent === 'CANCEL_ACTION' || msgCategory === MESSAGE_CATEGORIES.CANCEL_ACTION) {
    return {
      sessionId: currentSessionId,
      state: STATES.IDLE,
      intent: 'CANCEL_ACTION',
      text: 'Action cancelled. How else can I help you today?',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole),
      complaintDraft: null,
      feedbackDraft: null
    }
  }

  // ── Step 3: Guest Gateway (Security) ───────────────────────────────────
  if (!isAuthenticated) {
    return await _handleGuestMessage(trimmedMsg, intent, currentSessionId, history)
  }

  // ── Step 4: Route by Intent ────────────────────────────────────────────

  // 4A. GREETING
  if (intent === 'GREETING') {
    return {
      sessionId: currentSessionId,
      state: STATES.IDLE,
      intent: 'GREETING',
      text: `Hi **${userName}**! 👋 I'm your **CampusResolve AI Assistant**.\nI can help you report issues, check live complaint progress, provide feedback on resolved tickets, or answer campus policy questions.`,
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }

  // 4B. LOGIN HELP
  if (intent === 'LOGIN_HELP') {
    return {
      sessionId: currentSessionId,
      state: STATES.IDLE,
      intent: 'LOGIN_HELP',
      text: 'You can sign in using your student Google account via the Login page. If you are having trouble accessing your account, please contact your department admin or the IT support team.',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }

  // 4C. SHOW PENDING COMPLAINTS (Database Tool)
  if (intent === 'SHOW_PENDING_COMPLAINTS') {
    return await _handleShowPending(user, currentSessionId, userRole)
  }

  // 4D. COMPLAINT HISTORY (Database Tool)
  if (intent === 'SHOW_COMPLAINT_HISTORY' || intent === 'SHOW_RESOLVED_COMPLAINTS') {
    return await _handleShowHistory(user, currentSessionId, userRole)
  }

  // 4E. CHECK STATUS (Database Tool)
  if (intent === 'CHECK_COMPLAINT_STATUS') {
    return await _handleCheckStatus(user, trimmedMsg, analysis, currentSessionId, userRole)
  }

  // 4F. GIVE FEEDBACK (Database Tool)
  if (intent === 'GIVE_FEEDBACK') {
    return await _handleGiveFeedback(user, currentSessionId, userRole)
  }

  // 4G-1. JOIN COMPLAINT (Duplicate Flow Action)
  if (intent === 'JOIN_COMPLAINT') {
    return await _handleJoinComplaint(user, trimmedMsg, analysis, complaintDraft, history, currentSessionId, userRole)
  }

  // 4G-2. CREATE ANYWAY (Duplicate Flow Action)
  if (intent === 'CREATE_ANYWAY') {
    return await _handleCreateAnyway(complaintDraft, currentSessionId, userRole)
  }

  // 4G-3. VIEW EXISTING COMPLAINT (Duplicate Flow Action)
  if (intent === 'VIEW_EXISTING_COMPLAINT') {
    return await _handleViewExisting(user, trimmedMsg, analysis, history, currentSessionId, userRole)
  }

  // 4G-4. COMPLAINT WORKFLOW (State Machine + LLM)
  if (intent === 'CREATE_COMPLAINT' && !_hasComplaintDescriptionInMessage(trimmedMsg, complaintDraft)) {
    // User wants to start a new complaint — transition to COMPLAINT_DESCRIPTION
    return {
      sessionId: currentSessionId,
      state: STATES.COMPLAINT_DESCRIPTION,
      intent: 'CREATE_COMPLAINT',
      text: 'Sure! Please describe the problem you are facing on campus (including the building, floor, or room number).',
      messageType: 'COMPLAINT_QUESTION',
      quickActions: ['Seminar Hall projector flickering', 'Computer Lab 3 AC not working', 'Hostel Mess water issue', 'Cancel']
    }
  }

  if (intent === 'PROVIDE_COMPLAINT_DETAILS' || _isComplaintWorkflowState(normalizeState(conversationState))) {
    return await _handleComplaintWorkflow(trimmedMsg, analysis, complaintDraft, user, history, currentSessionId, lastAssistantMsg)
  }

  // 4H. GENERAL QUESTION (RAG Pipeline)
  if (intent === 'GENERAL_QUESTION' || msgCategory === MESSAGE_CATEGORIES.GENERAL_QUESTION) {
    return await _handleGeneralQuestion(trimmedMsg, history, conversationState, currentSessionId, userRole, lastAssistantMsg)
  }

  // ── Step 5: Fallback ───────────────────────────────────────────────────
  const fallback = getFallbackResponse(conversationState)
  return {
    sessionId: currentSessionId,
    state: fallback.state,
    intent: 'GENERAL_QUESTION',
    text: fallback.text,
    messageType: 'TEXT_MESSAGE',
    quickActions: fallback.quickActions
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INTENT HANDLERS (Private)
// ══════════════════════════════════════════════════════════════════════════════

async function _handleGuestMessage(message, intent, sessionId, history) {
  const isProtectedIntent = [
    'SHOW_PENDING_COMPLAINTS', 'SHOW_RESOLVED_COMPLAINTS',
    'SHOW_COMPLAINT_HISTORY', 'CHECK_COMPLAINT_STATUS',
    'GIVE_FEEDBACK', 'SUBMIT_FEEDBACK'
  ].includes(intent)

  if (isProtectedIntent || /^(show my|my complaint|track my|my status)/i.test(message)) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'LOGIN_HELP',
      text: 'Please sign in to securely access your personal complaints, live tracking, and feedback history.',
      messageType: 'TEXT_MESSAGE',
      widgetData: { type: 'AUTH_REQUIRED', ctaText: 'Sign In to Continue', target: '/login' },
      quickActions: ['Sign In', 'How to Submit a Complaint', 'How Complaint Tracking Works', 'Login Help']
    }
  }

  // Public RAG for guests
  const { results: ragDocs } = searchCampusKnowledge(message, 3, history)
  const ragContext = buildRAGContext(ragDocs)
  let replyText = ''

  if (ragDocs.length > 0) {
    const ragPrompt = `You are the CampusResolve Assistant for campus grievance redressal.
Answer the user query based ONLY on the verified campus guidelines below:
${ragContext}

User Query: "${message}"

Keep your response student-friendly, concise (under 4 sentences), and accurate.`
    replyText = await askGemini(ragPrompt) || ragDocs[0].content
  } else {
    replyText = "CampusResolve is the digital grievance redressal portal. Please sign in with your student credentials to submit complaints and track resolutions."
  }

  return {
    sessionId,
    state: STATES.IDLE,
    intent,
    text: replyText,
    messageType: ragDocs.length > 0 ? 'RAG_ANSWER' : 'TEXT_MESSAGE',
    ragSources: ragDocs.map(d => ({ title: d.title, category: d.category })),
    quickActions: ['How to Submit a Complaint', 'How Complaint Tracking Works', 'Login Help']
  }
}

async function _handleShowPending(user, sessionId, userRole) {
  const pending = await getMyPendingComplaints(user)
  if (pending.length === 0) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'SHOW_PENDING_COMPLAINTS',
      text: 'You currently have no pending complaints. All your submitted issues have either been resolved or you have not logged any active tickets.',
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Help me create a complaint', 'Show my complaint history', '⭐ Give Feedback']
    }
  }
  return {
    sessionId,
    state: STATES.STATUS_LOOKUP,
    intent: 'SHOW_PENDING_COMPLAINTS',
    text: `You have **${pending.length} active pending complaint(s)**:`,
    messageType: 'COMPLAINT_LIST',
    queryResults: formatComplaintList(pending),
    quickActions: ['Help me create a complaint', 'Show my complaint history', '⭐ Give Feedback']
  }
}

async function _handleShowHistory(user, sessionId, userRole) {
  const historyList = await getMyComplaintHistory(user, 6)
  if (historyList.length === 0) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'SHOW_COMPLAINT_HISTORY',
      text: 'You do not have any complaint history yet. If you are facing any campus issue, I can help you lodge one right now!',
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Help me create a complaint', '⭐ Give Feedback']
    }
  }
  return {
    sessionId,
    state: STATES.COMPLAINT_HISTORY,
    intent: 'SHOW_COMPLAINT_HISTORY',
    text: `Here is your recent complaint history (**${historyList.length} records**):`,
    messageType: 'COMPLAINT_LIST',
    queryResults: formatComplaintList(historyList),
    quickActions: ['Help me create a complaint', 'Show my pending complaints', '⭐ Give Feedback']
  }
}

async function _handleCheckStatus(user, message, analysis, sessionId, userRole) {
  const complaintId = analysis.extractedEntities?.complaintId || (message.match(/\b(CR-\d+|CMP-\d+)\b/i) || [])[0]

  if (complaintId) {
    const targetId = complaintId.toUpperCase()
    const statusRes = await getMyComplaintStatus(user, targetId)

    if (statusRes.unauthorized) {
      return {
        sessionId,
        state: STATES.IDLE,
        intent: 'CHECK_COMPLAINT_STATUS',
        text: `🔒 Security Alert: You do not have authorization to view the records for complaint **${targetId}**.`,
        messageType: 'TEXT_MESSAGE',
        quickActions: ['Show my pending complaints', 'Show my complaint history']
      }
    }

    if (statusRes.found && statusRes.complaint) {
      const c = statusRes.complaint
      return {
        sessionId,
        state: STATES.STATUS_LOOKUP,
        intent: 'CHECK_COMPLAINT_STATUS',
        text: `### Complaint Status: **${c.complaintId}**\n- **Title:** ${c.title || c.category}\n- **Status:** \`${c.status}\`\n- **Category:** ${c.category}\n- **Department:** ${c.department}\n- **Priority:** ${c.priority}\n- **Assigned Faculty:** ${c.assignedTeacherName || 'Department Faculty Coordinator'}\n- **Created:** ${new Date(c.createdAt).toLocaleDateString()}${c.resolutionNotes ? `\n- **Resolution Notes:** ${c.resolutionNotes}` : ''}`,
        messageType: 'STATUS_CARD',
        queryResults: [formatComplaintList([c])[0]],
        quickActions: c.status === 'Resolved'
          ? [`Give Feedback for ${c.complaintId}`, 'Show my pending complaints']
          : ['Show my pending complaints', 'Help me create a complaint']
      }
    }

    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'CHECK_COMPLAINT_STATUS',
      text: `I searched your records, but could not find a complaint matching ID **${targetId}**. Please check the ID from your complaint history.`,
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Show my pending complaints', 'Show my complaint history']
    }
  }

  // No specific ID — show list of active complaints
  const pending = await getMyPendingComplaints(user)
  if (pending.length > 0) {
    return {
      sessionId,
      state: STATES.STATUS_LOOKUP,
      intent: 'CHECK_COMPLAINT_STATUS',
      text: 'Here are your currently active complaints to check status:',
      messageType: 'COMPLAINT_LIST',
      queryResults: formatComplaintList(pending),
      quickActions: pending.map(p => `Status of ${p.complaintId || 'CR-001'}`).slice(0, 3)
    }
  }

  return {
    sessionId,
    state: STATES.IDLE,
    intent: 'CHECK_COMPLAINT_STATUS',
    text: 'You have no active pending complaints. If you need to track a specific past ticket, please provide the Complaint ID (e.g. CR-001).',
    messageType: 'TEXT_MESSAGE',
    quickActions: ['Help me create a complaint', 'Show my complaint history']
  }
}

async function _handleGiveFeedback(user, sessionId, userRole) {
  const resolved = await getResolvedComplaintsForFeedback(user)
  const unreviewed = resolved.filter(r => !r.hasFeedback)

  if (unreviewed.length === 0 && resolved.length === 0) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'GIVE_FEEDBACK',
      text: 'You do not have any resolved complaints eligible for feedback at this time. Feedback can only be submitted once a ticket is resolved by faculty.',
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Help me create a complaint', 'Show my pending complaints']
    }
  }

  return {
    sessionId,
    state: STATES.FEEDBACK_SELECTION,
    intent: 'GIVE_FEEDBACK',
    text: 'Please select a resolved complaint below to evaluate and submit your feedback:',
    messageType: 'FEEDBACK_SELECTION',
    eligibleComplaints: unreviewed.length > 0 ? unreviewed : resolved,
    quickActions: ['Cancel']
  }
}

async function _handleComplaintWorkflow(message, analysis, existingDraft, user, history, sessionId, lastAssistantMsg) {
  let updatedDraft = { ...(existingDraft || {}) }
  const currentState = normalizeState(analysis.conversationState)

  // ── If user is answering a location question ────────────────────────────
  if (analysis.userIsAnsweringPreviousQuestion && analysis.extractedEntities?.location) {
    updatedDraft.location = analysis.extractedEntities.location
    if (updatedDraft.title && !updatedDraft.title.toLowerCase().includes(message.toLowerCase())) {
      updatedDraft.title = `${message} ${updatedDraft.title}`
    }
    updatedDraft.isComplete = true
  }
  // ── If user is answering a category question ───────────────────────────
  else if (analysis.userIsAnsweringPreviousQuestion && analysis.extractedEntities?.category) {
    updatedDraft.category = analysis.extractedEntities.category
  }
  // ── Location-state input (COMPLAINT_LOCATION / WAITING_FOR_LOCATION) ──
  else if ((currentState === STATES.COMPLAINT_LOCATION || currentState === 'WAITING_FOR_LOCATION') && updatedDraft.title) {
    updatedDraft.location = message
    if (!updatedDraft.title.toLowerCase().includes(message.toLowerCase())) {
      updatedDraft.title = `${message} ${updatedDraft.title}`
    }
    updatedDraft.isComplete = true
  }
  // ── Full extraction via AI + rule parser ────────────────────────────────
  else {
    const extracted = await extractComplaintDraft(message, history, user?.department || 'CSE')
    updatedDraft = {
      title: extracted.title || `${extracted.category} Issue`,
      description: extracted.description || message,
      category: extracted.category || 'Infrastructure',
      department: extracted.department || user?.department || 'CSE',
      location: extracted.location && extracted.location !== 'Campus Premises' ? extracted.location : (updatedDraft.location || ''),
      priority: extracted.priority || 'medium'
    }

    const quality = evaluateComplaintQuality(updatedDraft, message)
    updatedDraft.isComplete = quality.isComplete && !!updatedDraft.location
  }

  // ── If location is STILL missing → ask for it ──────────────────────────
  if (!updatedDraft.location) {
    return {
      sessionId,
      state: STATES.COMPLAINT_LOCATION,
      intent: 'PROVIDE_COMPLAINT_DETAILS',
      text: 'I can help create a complaint for that. **Which location / room / building is affected?**',
      messageType: 'COMPLAINT_QUESTION',
      complaintDraft: updatedDraft,
      quickActions: ['Seminar Hall', 'Computer Lab 3', 'Hostel Block B', 'Central Library', 'Cancel']
    }
  }

  // ── Run AI Duplicate Detection Before Finalizing ───────────────────────
  const dupResult = await findDuplicateComplaints(updatedDraft)

  if (dupResult.isDuplicate && dupResult.matchedComplaint) {
    const topMatch = dupResult.matchedComplaint
    return {
      sessionId,
      state: STATES.COMPLAINT_PREVIEW,
      intent: 'PROVIDE_COMPLAINT_DETAILS',
      text: `⚠️ **Similar Active Complaint Detected!** (${topMatch.similarityScore}% Match)\n\nI found an existing active ticket for **${topMatch.location || updatedDraft.location}** (${topMatch.complaintId}: *${topMatch.title}*).\n\nTo prevent duplicate tickets, you can join this existing complaint to boost its resolution priority, or choose to create your new ticket anyway.`,
      messageType: 'COMPLAINT_PREVIEW',
      structuredComplaint: updatedDraft,
      complaintDraft: updatedDraft,
      duplicateMatches: dupResult.matches,
      quickActions: [
        "I'm Also Facing This Issue",
        "View Existing Complaint",
        "Create New Complaint Anyway",
        "Cancel"
      ]
    }
  }

  // ── All details collected → COMPLAINT_PREVIEW ──────────────────────────
  // Validate response is not duplicating a previous location question
  const validation = validateResponse({
    responseText: 'Got it! I have prepared your complaint details below. Please review the preview card and click **Create Complaint** to submit.',
    currentMessage: message,
    previousAssistantMessage: lastAssistantMsg,
    conversationState: currentState,
    intent: 'PROVIDE_COMPLAINT_DETAILS',
    complaintDraft: updatedDraft
  })

  return {
    sessionId,
    state: STATES.COMPLAINT_PREVIEW,
    intent: 'PROVIDE_COMPLAINT_DETAILS',
    text: 'Got it! I have prepared your complaint details below. Please review the preview card and click **Create Complaint** to submit.',
    messageType: 'COMPLAINT_PREVIEW',
    structuredComplaint: updatedDraft,
    complaintDraft: updatedDraft,
    duplicateMatches: null,
    quickActions: ['Create Complaint', 'Edit Details', 'Cancel']
  }
}

async function _handleJoinComplaint(user, message, analysis, complaintDraft, history, sessionId, userRole) {
  let targetId = analysis.extractedEntities?.complaintId
  if (!targetId) {
    const match = message.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }
  if (!targetId) {
    const recentHistoryText = (history || []).map(h => h.text || '').join(' ')
    const match = recentHistoryText.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }

  if (!targetId) {
    // If we have active duplicate matches in candidate history, pick first
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'GENERAL_QUESTION',
      text: 'Please specify the Complaint ID (e.g. CR-003) you would like to join as an affected student.',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }

  const res = await joinExistingComplaint(targetId, user)
  if (res.success) {
    const text = res.alreadyJoined
      ? `You are already recorded as an affected student for ticket **${targetId}** (*${res.title}*). The ticket currently has **${res.affectedCount} affected students**.`
      : `✓ **Added as an Affected Student to ${targetId}!**\n\nYour report has been linked to **${targetId}** (*${res.title}*). The ticket priority has been updated with **${res.affectedCount} affected students** registered.`

    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'JOIN_COMPLAINT',
      text,
      messageType: 'SUCCESS',
      complaintDraft: null,
      quickActions: [`Status of ${targetId}`, 'Help me create a complaint', 'Show my pending complaints']
    }
  } else {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'JOIN_COMPLAINT',
      text: `Could not join complaint ${targetId}: ${res.message}`,
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }
}

async function _handleCreateAnyway(complaintDraft, sessionId, userRole) {
  if (!complaintDraft) {
    return {
      sessionId,
      state: STATES.COMPLAINT_DESCRIPTION,
      intent: 'CREATE_COMPLAINT',
      text: 'Please describe the problem you would like to report on campus.',
      messageType: 'COMPLAINT_QUESTION',
      quickActions: ['Seminar Hall projector flickering', 'Computer Lab 3 AC not working', 'Cancel']
    }
  }

  return {
    sessionId,
    state: STATES.COMPLAINT_PREVIEW,
    intent: 'PROVIDE_COMPLAINT_DETAILS',
    text: 'Understood. Here is your complaint draft. You can proceed with creating this ticket independently:',
    messageType: 'COMPLAINT_PREVIEW',
    structuredComplaint: complaintDraft,
    complaintDraft,
    duplicateMatches: null, // Clear duplicate warning
    quickActions: ['Create Complaint', 'Edit Details', 'Cancel']
  }
}

async function _handleViewExisting(user, message, analysis, history, sessionId, userRole) {
  let targetId = analysis.extractedEntities?.complaintId
  if (!targetId) {
    const match = message.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }
  if (!targetId) {
    const recentHistoryText = (history || []).map(h => h.text || '').join(' ')
    const match = recentHistoryText.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }

  if (targetId) {
    return await _handleCheckStatus(user, targetId, { extractedEntities: { complaintId: targetId } }, sessionId, userRole)
  }

  return await _handleShowPending(user, sessionId, userRole)
}

async function _handleGeneralQuestion(message, history, conversationState, sessionId, userRole, lastAssistantMsg) {
  // Search with query rewriting and hybrid scoring
  const { results: ragDocs, queryInfo } = searchCampusKnowledge(message, 3, history, conversationState)
  const ragContext = buildRAGContext(ragDocs)

  if (ragDocs.length > 0) {
    const ragPrompt = `You are the official CampusResolve AI Assistant.
Answer the following student question accurately using ONLY the campus policies and knowledge base below:
${ragContext}

Question: "${queryInfo?.rewritten || message}"

Style rules:
- Be clear, helpful, and concise (under 4 sentences).
- Explain SLA or workflow steps accurately without inventing numbers.
- Ground your answer in the retrieved knowledge.
- Do NOT mention that you are using "sources" or "retrieved documents" — just answer naturally.`

    const ragAnswer = await askGemini(ragPrompt)

    // Validate the LLM response
    const finalText = ragAnswer || ragDocs[0].content
    const validation = validateResponse({
      responseText: finalText,
      currentMessage: message,
      previousAssistantMessage: lastAssistantMsg,
      conversationState,
      intent: 'GENERAL_QUESTION'
    })

    // If validation fails, use the raw document content
    const responseText = validation.valid ? finalText : ragDocs[0].content

    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'GENERAL_QUESTION',
      text: responseText,
      messageType: 'RAG_ANSWER',
      ragSources: ragDocs.map(d => ({ title: d.title, category: d.category })),
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }

  // No RAG results — try LLM fallback
  const fallbackAnswer = await askGemini(`You are the CampusResolve AI Assistant for university students.
Answer this question politely and professionally: "${message}".
If you don't know the specific answer, suggest the student contact the relevant department or use the CampusResolve complaint system.
Keep it under 3 sentences.`)

  return {
    sessionId,
    state: STATES.IDLE,
    intent: 'GENERAL_QUESTION',
    text: fallbackAnswer || "I'm here to help you lodge and track campus grievances, understand SLA timelines, and submit resolution feedback. How can I assist you?",
    messageType: 'TEXT_MESSAGE',
    quickActions: getQuickActionsForState(STATES.IDLE, userRole)
  }
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function _hasComplaintDescriptionInMessage(msg, draft) {
  if (draft && draft.title && draft.description) return true
  return /\b(fan|light|projector|wifi|room|lab|desk|marks|ac|water|bus|noise|broken|leaking|damaged|dirty)\b/i.test(msg)
}

function _isComplaintWorkflowState(state) {
  return [
    STATES.COMPLAINT_DESCRIPTION, STATES.COMPLAINT_LOCATION,
    STATES.COMPLAINT_CATEGORY, STATES.COMPLAINT_PREVIEW,
    'COMPLAINT_COLLECTION', 'WAITING_FOR_LOCATION', 'WAITING_FOR_CATEGORY'
  ].includes(state)
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  CONVERSATION_STATES,
  INTENTS,
  orchestrateChat,
  getMyPendingComplaints,
  getMyComplaintStatus,
  getMyComplaintHistory,
  getResolvedComplaintsForFeedback
}
