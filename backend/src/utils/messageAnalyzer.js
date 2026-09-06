/**
 * CampusResolve — Current Message Analyzer
 * 
 * Runs BEFORE intent classification & response generation.
 * Produces a structured analysis object that drives the conversation pipeline.
 * 
 * Handles:
 *  - Message normalization & entity extraction
 *  - Context-aware classification (BUTTON_ACTION > DIRECT_ANSWER > WORKFLOW_INPUT > NEW_REQUEST > GENERAL)
 *  - Previous-question matching to prevent misclassification of short answers
 *  - Missing-field detection for active workflows
 */

// ── Message Categories (priority order) ──────────────────────────────────────
const MESSAGE_CATEGORIES = {
  BUTTON_ACTION: 'BUTTON_ACTION',
  DIRECT_ANSWER_TO_PREVIOUS_QUESTION: 'DIRECT_ANSWER_TO_PREVIOUS_QUESTION',
  ACTIVE_WORKFLOW_INPUT: 'ACTIVE_WORKFLOW_INPUT',
  NEW_REQUEST: 'NEW_REQUEST',
  CANCEL_ACTION: 'CANCEL_ACTION',
  CONFIRM_ACTION: 'CONFIRM_ACTION',
  STATUS_REQUEST: 'STATUS_REQUEST',
  COMPLAINT_INFORMATION: 'COMPLAINT_INFORMATION',
  FEEDBACK_INFORMATION: 'FEEDBACK_INFORMATION',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  UNKNOWN: 'UNKNOWN'
}

// ── Known Locations ──────────────────────────────────────────────────────────
const KNOWN_LOCATIONS = [
  'seminar hall', 'computer lab', 'lab', 'hostel', 'library', 'canteen',
  'block a', 'block b', 'block c', 'block d', 'tech block',
  'mechanical block', 'admin block', 'administrative block',
  'boys hostel', 'girls hostel', 'mess', 'dining hall',
  'room', 'floor', 'ground floor', 'first floor', 'second floor',
  'third floor', 'principal office', 'exam cell', 'main gate',
  'parking', 'playground', 'auditorium', 'workshop'
]

// ── Known Categories ─────────────────────────────────────────────────────────
const KNOWN_CATEGORIES = [
  'infrastructure', 'academic', 'academics', 'hostel', 'transport', 'it', 'other'
]

// ── Issue Keywords ───────────────────────────────────────────────────────────
const ISSUE_KEYWORDS = [
  'broken', 'not working', 'flickering', 'leaking', 'leak', 'damaged',
  'dirty', 'stinking', 'noise', 'noisy', 'slow', 'stuck', 'jammed',
  'missing', 'cracked', 'sparking', 'overheating', 'faulty',
  'fan', 'light', 'projector', 'ac', 'air conditioner', 'wifi', 'water',
  'toilet', 'washroom', 'desk', 'bench', 'chair', 'door', 'window',
  'bus', 'marks', 'attendance', 'grade', 'timetable', 'exam',
  'food', 'hygiene', 'cleanliness', 'geyser', 'laundry', 'elevator', 'lift'
]

// ── Action Patterns ──────────────────────────────────────────────────────────
const ACTION_PATTERNS = {
  CANCEL: /^(cancel|cancel feedback|cancel complaint|exit|stop|nevermind|never mind|close|abort|go back)$/i,
  CONFIRM: /^(yes|confirm|proceed|ok|okay|submit|yes please|do it|confirm submission|submit it)$/i,
  CREATE_COMPLAINT: /^(create complaint|submit complaint|confirm complaint|create)$/i,
  SUBMIT_FEEDBACK: /^(submit feedback|confirm feedback|use this feedback|submit my feedback|submit)$/i,
  EDIT_COMPLAINT: /^(edit details|edit complaint|modify complaint|edit|change location|update location)$/i,
  EDIT_FEEDBACK: /^(edit feedback|modify feedback|change feedback)$/i,
  JOIN_COMPLAINT: /^(i'm also facing this issue|i am also facing this issue|join complaint|support complaint|i also have this issue|same issue here)$/i,
  CREATE_ANYWAY: /^(create new complaint anyway|create anyway|submit anyway|file anyway|proceed anyway)$/i,
  VIEW_EXISTING: /^(view existing complaint|view complaint|see complaint|check existing complaint)$/i
}

// ── Previous Question Patterns ───────────────────────────────────────────────
const PREVIOUS_QUESTION_TYPES = {
  ASKING_LOCATION: /which (location|room|building|block|area|place)|where is (the|this)|where.*affected|location.*affected/i,
  ASKING_CATEGORY: /which (category|type)|what (category|type)|select.*category/i,
  ASKING_DESCRIPTION: /describe|what.*issue|what.*problem|explain.*issue|tell.*about/i,
  ASKING_PRIORITY: /how (urgent|important)|priority|severity/i
}

/**
 * Extract entities from the current message
 */
const extractEntities = (message, conversationState, complaintDraft) => {
  const msg = message.toLowerCase().trim()
  const entities = {}

  // Location extraction
  const locationMatch = KNOWN_LOCATIONS.find(loc => msg.includes(loc))
  if (locationMatch) {
    entities.location = message.trim() // preserve original case
  }

  // Category extraction
  const categoryMatch = KNOWN_CATEGORIES.find(cat => msg === cat || msg.startsWith(cat))
  if (categoryMatch) {
    entities.category = categoryMatch.charAt(0).toUpperCase() + categoryMatch.slice(1)
    if (entities.category === 'Academics') entities.category = 'Academic'
  }

  // Complaint ID extraction
  const idMatch = message.match(/\b(CR-\d+|CMP-\d+)\b/i)
  if (idMatch) {
    entities.complaintId = idMatch[0].toUpperCase()
  }

  // Issue keyword extraction
  const foundIssues = ISSUE_KEYWORDS.filter(kw => msg.includes(kw))
  if (foundIssues.length > 0) {
    entities.issueKeywords = foundIssues
    entities.hasIssueDescription = true
  }

  // Rating extraction (digits 1-5 or word numbers)
  const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5 }
  const wordMatch = msg.match(/\b(one|two|three|four|five)\s*(star|stars)?\b/i)
  if (wordMatch && wordMap[wordMatch[1].toLowerCase()]) {
    entities.rating = wordMap[wordMatch[1].toLowerCase()]
  }
  const ratingMatch = msg.match(/\b([1-5])\s*(star|stars|out of|\/5)?\b/i)
  if (ratingMatch) {
    entities.rating = parseInt(ratingMatch[1], 10)
  }

  // Feedback dimensions
  const resQualityMatch = msg.match(/resolution\s+quality\s+(?:was|is)?\s*(poor|fair|good|excellent|satisfactory)/i)
  if (resQualityMatch) {
    entities.resolutionQuality = resQualityMatch[1].charAt(0).toUpperCase() + resQualityMatch[1].slice(1)
  }
  const respTimeMatch = msg.match(/response\s+time\s+(?:was|is)?\s*(poor|fair|good|slow|fast|delayed|moderate)/i)
  if (respTimeMatch) {
    entities.responseTime = respTimeMatch[1].charAt(0).toUpperCase() + respTimeMatch[1].slice(1)
  }
  const commMatch = msg.match(/communication\s+(?:was|is)?\s*(poor|fair|good|excellent|moderate)/i)
  if (commMatch) {
    entities.communication = commMatch[1].charAt(0).toUpperCase() + commMatch[1].slice(1)
  }

  return entities
}

/**
 * Determine what the previous AI message was asking for
 */
const classifyPreviousQuestion = (previousAssistantMessage = '') => {
  if (!previousAssistantMessage) return null

  for (const [qType, pattern] of Object.entries(PREVIOUS_QUESTION_TYPES)) {
    if (pattern.test(previousAssistantMessage)) {
      return qType
    }
  }
  return null
}

/**
 * Check if a message is a button action vs. free-text
 */
const isButtonAction = (actionType) => {
  return actionType && typeof actionType === 'string' && actionType.length > 0
}

/**
 * Detect which fields are still missing in a complaint draft
 */
const detectMissingFields = (draft) => {
  const missing = []
  if (!draft) return ['description', 'location', 'category']

  if (!draft.description && !draft.title) missing.push('description')
  if (!draft.location || draft.location === 'Campus Premises') missing.push('location')
  if (!draft.category || draft.category === 'General') missing.push('category')

  return missing
}

/**
 * Determine if RAG retrieval is needed
 */
const requiresRAGRetrieval = (messageCategory, intent, conversationState) => {
  // Personal data queries never use RAG
  const personalIntents = [
    'SHOW_PENDING_COMPLAINTS', 'SHOW_RESOLVED_COMPLAINTS',
    'SHOW_COMPLAINT_HISTORY', 'CHECK_COMPLAINT_STATUS',
    'GIVE_FEEDBACK', 'SUBMIT_FEEDBACK'
  ]
  if (personalIntents.includes(intent)) return false

  // Active complaint/feedback workflows don't need RAG
  const workflowStates = [
    'COMPLAINT_DESCRIPTION', 'COMPLAINT_LOCATION', 'COMPLAINT_CATEGORY',
    'COMPLAINT_PREVIEW', 'CREATING_COMPLAINT',
    'FEEDBACK_SELECTION', 'FEEDBACK_RATING', 'FEEDBACK_COMMENT',
    'FEEDBACK_PREVIEW', 'SUBMITTING_FEEDBACK'
  ]
  if (workflowStates.includes(conversationState)) return false

  // Button actions don't need RAG
  if (messageCategory === MESSAGE_CATEGORIES.BUTTON_ACTION) return false
  if (messageCategory === MESSAGE_CATEGORIES.CANCEL_ACTION) return false

  // General questions and new requests may need RAG
  if (messageCategory === MESSAGE_CATEGORIES.GENERAL_QUESTION) return true
  if (intent === 'GENERAL_QUESTION' || intent === 'GREETING') return false

  return false
}

/**
 * Determine if database tools are needed
 */
const requiresDatabaseLookup = (intent) => {
  const dbIntents = [
    'SHOW_PENDING_COMPLAINTS', 'SHOW_RESOLVED_COMPLAINTS',
    'SHOW_COMPLAINT_HISTORY', 'CHECK_COMPLAINT_STATUS',
    'GIVE_FEEDBACK'
  ]
  return dbIntents.includes(intent)
}

/**
 * Main analysis function — runs before every AI response
 */
const analyzeCurrentMessage = ({
  message = '',
  actionType = null,
  conversationState = 'IDLE',
  complaintDraft = null,
  feedbackDraft = null,
  previousAssistantMessage = '',
  history = []
}) => {
  const trimmedMsg = message.trim()
  const normalizedMsg = trimmedMsg.toLowerCase()

  // ── 1. Initialize analysis structure ────────────────────────────────────
  const analysis = {
    currentMessage: trimmedMsg,
    normalizedMessage: normalizedMsg,
    messageCategory: MESSAGE_CATEGORIES.UNKNOWN,
    intent: '',
    confidence: 0,
    conversationState,
    activeWorkflow: _getActiveWorkflow(conversationState),
    previousAssistantQuestion: previousAssistantMessage,
    previousQuestionType: classifyPreviousQuestion(previousAssistantMessage),
    userIsAnsweringPreviousQuestion: false,
    extractedEntities: {},
    complaintDraft: complaintDraft || null,
    feedbackDraft: feedbackDraft || null,
    missingFields: detectMissingFields(complaintDraft),
    requiredAction: null,
    requiresRAG: false,
    requiresDatabase: false,
    shouldGenerateLLMReply: true
  }

  // ── 2. Priority 1: Button Action ────────────────────────────────────────
  if (isButtonAction(actionType)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.BUTTON_ACTION
    analysis.requiredAction = actionType
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    analysis.intent = _mapActionToIntent(actionType)
    return analysis
  }

  // ── 3. Priority 2: Cancel detection ─────────────────────────────────────
  if (ACTION_PATTERNS.CANCEL.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.CANCEL_ACTION
    analysis.intent = 'CANCEL_ACTION'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }

  // ── 4. Priority 3: Confirm actions from text ───────────────────────────
  if (ACTION_PATTERNS.CONFIRM.test(normalizedMsg)) {
    if (conversationState === 'COMPLAINT_PREVIEW' || conversationState === 'AWAITING_COMPLAINT_CONFIRMATION') {
      analysis.messageCategory = MESSAGE_CATEGORIES.CONFIRM_ACTION
      analysis.intent = 'CREATE_COMPLAINT'
      analysis.requiredAction = 'CREATE_COMPLAINT'
      analysis.shouldGenerateLLMReply = false
      analysis.confidence = 1.0
      return analysis
    }
    if (conversationState === 'FEEDBACK_PREVIEW' || conversationState === 'AWAITING_FEEDBACK_CONFIRMATION') {
      analysis.messageCategory = MESSAGE_CATEGORIES.CONFIRM_ACTION
      analysis.intent = 'SUBMIT_FEEDBACK'
      analysis.requiredAction = 'SUBMIT_FEEDBACK'
      analysis.shouldGenerateLLMReply = false
      analysis.confidence = 1.0
      return analysis
    }
  }
  if (ACTION_PATTERNS.CREATE_COMPLAINT.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.CONFIRM_ACTION
    analysis.intent = 'CREATE_COMPLAINT'
    analysis.requiredAction = 'CREATE_COMPLAINT'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }
  if (ACTION_PATTERNS.SUBMIT_FEEDBACK.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.CONFIRM_ACTION
    analysis.intent = 'SUBMIT_FEEDBACK'
    analysis.requiredAction = 'SUBMIT_FEEDBACK'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }
  if (ACTION_PATTERNS.EDIT_COMPLAINT.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.BUTTON_ACTION
    analysis.intent = 'EDIT_COMPLAINT'
    analysis.requiredAction = 'EDIT_COMPLAINT'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }
  if (ACTION_PATTERNS.EDIT_FEEDBACK.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.BUTTON_ACTION
    analysis.intent = 'EDIT_FEEDBACK'
    analysis.requiredAction = 'EDIT_FEEDBACK'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }
  if (ACTION_PATTERNS.JOIN_COMPLAINT.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.BUTTON_ACTION
    analysis.intent = 'JOIN_COMPLAINT'
    analysis.requiredAction = 'JOIN_COMPLAINT'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }
  if (ACTION_PATTERNS.CREATE_ANYWAY.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.BUTTON_ACTION
    analysis.intent = 'CREATE_ANYWAY'
    analysis.requiredAction = 'CREATE_ANYWAY'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }
  if (ACTION_PATTERNS.VIEW_EXISTING.test(normalizedMsg)) {
    analysis.messageCategory = MESSAGE_CATEGORIES.BUTTON_ACTION
    analysis.intent = 'VIEW_EXISTING_COMPLAINT'
    analysis.requiredAction = 'VIEW_EXISTING_COMPLAINT'
    analysis.shouldGenerateLLMReply = false
    analysis.confidence = 1.0
    return analysis
  }

  // ── 5. Extract entities ─────────────────────────────────────────────────
  analysis.extractedEntities = extractEntities(trimmedMsg, conversationState, complaintDraft)

  // ── 6. Priority 4: Direct answer to previous question ──────────────────
  const pqType = analysis.previousQuestionType
  if (pqType && _isInWorkflowState(conversationState)) {
    if (pqType === 'ASKING_LOCATION' && !analysis.extractedEntities.complaintId) {
      // Short answer is likely a location
      if (trimmedMsg.length >= 2 && trimmedMsg.length < 100 && !_isNewRequestPattern(normalizedMsg)) {
        analysis.messageCategory = MESSAGE_CATEGORIES.DIRECT_ANSWER_TO_PREVIOUS_QUESTION
        analysis.userIsAnsweringPreviousQuestion = true
        analysis.extractedEntities.location = analysis.extractedEntities.location || trimmedMsg
        analysis.intent = 'PROVIDE_COMPLAINT_DETAILS'
        analysis.confidence = 0.95
        return analysis
      }
    }
    if (pqType === 'ASKING_CATEGORY') {
      if (analysis.extractedEntities.category) {
        analysis.messageCategory = MESSAGE_CATEGORIES.DIRECT_ANSWER_TO_PREVIOUS_QUESTION
        analysis.userIsAnsweringPreviousQuestion = true
        analysis.intent = 'PROVIDE_COMPLAINT_DETAILS'
        analysis.confidence = 0.95
        return analysis
      }
    }
    if (pqType === 'ASKING_DESCRIPTION') {
      if (trimmedMsg.length >= 3) {
        analysis.messageCategory = MESSAGE_CATEGORIES.DIRECT_ANSWER_TO_PREVIOUS_QUESTION
        analysis.userIsAnsweringPreviousQuestion = true
        analysis.intent = 'PROVIDE_COMPLAINT_DETAILS'
        analysis.confidence = 0.9
        return analysis
      }
    }
  }

  // ── 7. Priority 5: Active workflow input ────────────────────────────────
  if (_isInWorkflowState(conversationState) && trimmedMsg.length >= 2) {
    const workflowCategory = _classifyWorkflowInput(normalizedMsg, conversationState, analysis.extractedEntities)
    if (workflowCategory) {
      analysis.messageCategory = MESSAGE_CATEGORIES.ACTIVE_WORKFLOW_INPUT
      analysis.intent = workflowCategory.intent
      analysis.confidence = workflowCategory.confidence
      // Don't return yet — check if it's actually a new request override below
      if (!_isExplicitNewRequest(normalizedMsg)) {
        return analysis
      }
    }
  }

  // ── 8. Priority 6: New Request detection ────────────────────────────────
  const newRequestIntent = _detectNewRequestIntent(normalizedMsg, analysis.extractedEntities)
  if (newRequestIntent) {
    analysis.messageCategory = MESSAGE_CATEGORIES.NEW_REQUEST
    analysis.intent = newRequestIntent.intent
    analysis.confidence = newRequestIntent.confidence
    analysis.requiresRAG = requiresRAGRetrieval(analysis.messageCategory, analysis.intent, conversationState)
    analysis.requiresDatabase = requiresDatabaseLookup(analysis.intent)
    return analysis
  }

  // ── 9. Priority 7: General question ─────────────────────────────────────
  analysis.messageCategory = MESSAGE_CATEGORIES.GENERAL_QUESTION
  analysis.intent = 'GENERAL_QUESTION'
  analysis.confidence = 0.6
  analysis.requiresRAG = true
  analysis.shouldGenerateLLMReply = true
  return analysis
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

const _getActiveWorkflow = (state) => {
  if (!state || state === 'IDLE') return null
  if (state.startsWith('COMPLAINT') || state === 'WAITING_FOR_LOCATION' || state === 'WAITING_FOR_CATEGORY') return 'COMPLAINT'
  if (state.startsWith('FEEDBACK')) return 'FEEDBACK'
  if (state === 'STATUS_LOOKUP' || state === 'PENDING_COMPLAINTS' || state === 'HISTORY_LOOKUP' || state === 'COMPLAINT_HISTORY') return 'STATUS'
  if (state === 'GENERAL_RAG_QUERY' || state === 'GENERAL_QUESTION') return 'GENERAL'
  return null
}

const _isInWorkflowState = (state) => {
  return state && state !== 'IDLE' && state !== 'GENERAL_CONVERSATION'
}

const _mapActionToIntent = (actionType) => {
  const map = {
    'CANCEL_ACTION': 'CANCEL_ACTION',
    'CANCEL_COMPLAINT': 'CANCEL_ACTION',
    'CANCEL_FEEDBACK': 'CANCEL_ACTION',
    'CREATE_COMPLAINT': 'CREATE_COMPLAINT',
    'CREATE_ANYWAY': 'CREATE_ANYWAY',
    'CREATE_COMPLAINT_ANYWAY': 'CREATE_ANYWAY',
    'JOIN_COMPLAINT': 'JOIN_COMPLAINT',
    'JOIN_EXISTING_COMPLAINT': 'JOIN_COMPLAINT',
    'VIEW_EXISTING_COMPLAINT': 'VIEW_EXISTING_COMPLAINT',
    'SUBMIT_FEEDBACK': 'SUBMIT_FEEDBACK',
    'EDIT_COMPLAINT': 'EDIT_COMPLAINT',
    'EDIT_FEEDBACK': 'EDIT_FEEDBACK',
    'SELECT_FEEDBACK_COMPLAINT': 'GIVE_FEEDBACK',
    'CHECK_STATUS': 'CHECK_COMPLAINT_STATUS',
    'SHOW_PENDING': 'SHOW_PENDING_COMPLAINTS',
    'SHOW_HISTORY': 'SHOW_COMPLAINT_HISTORY'
  }
  return map[actionType] || 'GENERAL_QUESTION'
}

const _isNewRequestPattern = (msg) => {
  return /^(help me|create|file|show|check|give|submit|list|view|how|what|why|when|where|can i|tell me)/i.test(msg)
}

const _isExplicitNewRequest = (msg) => {
  return /^(help me create|create complaint|file a complaint|show my|check status|give feedback|submit feedback)/i.test(msg)
}

const _classifyWorkflowInput = (msg, state, entities) => {
  // In complaint collection states, treat most input as complaint details
  const complaintStates = ['COMPLAINT_COLLECTION', 'COMPLAINT_DESCRIPTION', 'WAITING_FOR_LOCATION', 'COMPLAINT_LOCATION', 'WAITING_FOR_CATEGORY', 'COMPLAINT_CATEGORY']
  if (complaintStates.includes(state)) {
    return { intent: 'PROVIDE_COMPLAINT_DETAILS', confidence: 0.85 }
  }

  // In feedback states, treat input as feedback details
  const feedbackStates = ['FEEDBACK_COLLECTION', 'FEEDBACK_RATING', 'FEEDBACK_COMMENT']
  if (feedbackStates.includes(state)) {
    return { intent: 'PROVIDE_FEEDBACK_DETAILS', confidence: 0.85 }
  }

  return null
}

const _detectNewRequestIntent = (msg, entities) => {
  // Greeting
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/i.test(msg)) {
    return { intent: 'GREETING', confidence: 0.95 }
  }

  // Complaint creation request
  if (/^(help me create|create complaint|file a complaint|lodge complaint|new complaint|report an issue|report problem|i want to complain|i have a complaint|i need to report)\b/i.test(msg)) {
    return { intent: 'CREATE_COMPLAINT', confidence: 0.95 }
  }

  // Pending complaints
  if (/\b(pending complaint|my pending|unresolved complaint|active ticket|active complaint)\b/i.test(msg)) {
    return { intent: 'SHOW_PENDING_COMPLAINTS', confidence: 0.9 }
  }

  // Resolved complaints
  if (/\b(resolved complaint|completed ticket|completed complaint|my resolved)\b/i.test(msg)) {
    return { intent: 'SHOW_RESOLVED_COMPLAINTS', confidence: 0.9 }
  }

  // Complaint history
  if (/\b(complaint history|show my complaints|list my complaints|all my complaints|my tickets)\b/i.test(msg)) {
    return { intent: 'SHOW_COMPLAINT_HISTORY', confidence: 0.9 }
  }

  // Status check
  if (/\b(status of|check status|track complaint|track my|my complaint status|where is my complaint)\b/i.test(msg) || /\b(cr-\d+|cmp-\d+)\b/i.test(msg)) {
    return { intent: 'CHECK_COMPLAINT_STATUS', confidence: 0.9 }
  }

  // Feedback request
  if (/\b(give feedback|rate complaint|submit feedback|feedback for|star rating|rate teacher|rate faculty)\b/i.test(msg)) {
    return { intent: 'GIVE_FEEDBACK', confidence: 0.9 }
  }

  // Tracking explanation
  if (/\b(how.*tracking works|how tracking works|how to track|tracking process|complaint lifecycle|how are complaints tracked)\b/i.test(msg)) {
    return { intent: 'TRACKING_EXPLANATION', confidence: 0.95 }
  }

  // Duplicate check explanation
  if (/\b(duplicate complaint check|how duplicate check works|duplicate detection|similar complaint|duplicate check)\b/i.test(msg)) {
    return { intent: 'DUPLICATE_CHECK', confidence: 0.95 }
  }

  // AI Resolution prediction explanation
  if (/\b(resolution prediction|how resolution prediction works|ai resolution prediction|predict resolution|resolution timeframe prediction)\b/i.test(msg)) {
    return { intent: 'RESOLUTION_PREDICTION', confidence: 0.95 }
  }

  // Login help
  if (/\b(how to login|login help|sign in help|credentials|reset password|forgot password)\b/i.test(msg)) {
    return { intent: 'LOGIN_HELP', confidence: 0.9 }
  }

  // General questions (questions about policies, SLA, procedures)
  if (/^(how long|what is|how does|what are|how to|can i|who is|where do|why does|tell me about|explain|is there|are there)\b/i.test(msg)) {
    return { intent: 'GENERAL_QUESTION', confidence: 0.8 }
  }
  if (msg.includes('?') && !entities.hasIssueDescription) {
    return { intent: 'GENERAL_QUESTION', confidence: 0.7 }
  }

  // Issue description (complaint-worthy content)
  if (entities.hasIssueDescription) {
    return { intent: 'PROVIDE_COMPLAINT_DETAILS', confidence: 0.8 }
  }

  return null
}

module.exports = {
  MESSAGE_CATEGORIES,
  analyzeCurrentMessage,
  extractEntities,
  classifyPreviousQuestion,
  detectMissingFields,
  requiresRAGRetrieval,
  requiresDatabaseLookup
}
