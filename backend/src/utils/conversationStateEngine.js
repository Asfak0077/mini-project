/**
 * CampusResolve — Conversation State Engine
 * 
 * Manages state transitions, validates state integrity,
 * and provides deterministic fallback responses per state.
 */

// ── Conversation States ──────────────────────────────────────────────────────
const STATES = {
  IDLE: 'IDLE',

  // Complaint workflow
  COMPLAINT_DESCRIPTION: 'COMPLAINT_DESCRIPTION',
  COMPLAINT_LOCATION: 'COMPLAINT_LOCATION',
  COMPLAINT_CATEGORY: 'COMPLAINT_CATEGORY',
  COMPLAINT_PREVIEW: 'COMPLAINT_PREVIEW',
  CREATING_COMPLAINT: 'CREATING_COMPLAINT',

  // Status / History
  STATUS_LOOKUP: 'STATUS_LOOKUP',
  PENDING_COMPLAINTS: 'PENDING_COMPLAINTS',
  COMPLAINT_HISTORY: 'COMPLAINT_HISTORY',

  // Feedback workflow
  FEEDBACK_SELECTION: 'FEEDBACK_SELECTION',
  FEEDBACK_RATING: 'FEEDBACK_RATING',
  FEEDBACK_COMMENT: 'FEEDBACK_COMMENT',
  FEEDBACK_ANALYSIS: 'FEEDBACK_ANALYSIS',
  FEEDBACK_PREVIEW: 'FEEDBACK_PREVIEW',
  SUBMITTING_FEEDBACK: 'SUBMITTING_FEEDBACK',

  // General
  GENERAL_RAG_QUERY: 'GENERAL_RAG_QUERY',
  GENERAL_CONVERSATION: 'GENERAL_CONVERSATION',

  // Legacy compatibility (mapped from old states)
  COMPLAINT_COLLECTION: 'COMPLAINT_DESCRIPTION',
  WAITING_FOR_LOCATION: 'COMPLAINT_LOCATION',
  WAITING_FOR_CATEGORY: 'COMPLAINT_CATEGORY',
  HISTORY_LOOKUP: 'COMPLAINT_HISTORY',
  FEEDBACK_COLLECTION: 'FEEDBACK_COMMENT',
  GENERAL_QUESTION: 'GENERAL_RAG_QUERY'
}

// Map legacy state names to new ones
const normalizeState = (state) => {
  if (!state) return STATES.IDLE
  const legacy = {
    'COMPLAINT_COLLECTION': STATES.COMPLAINT_DESCRIPTION,
    'WAITING_FOR_LOCATION': STATES.COMPLAINT_LOCATION,
    'WAITING_FOR_CATEGORY': STATES.COMPLAINT_CATEGORY,
    'HISTORY_LOOKUP': STATES.COMPLAINT_HISTORY,
    'FEEDBACK_COLLECTION': STATES.FEEDBACK_COMMENT,
    'GENERAL_QUESTION': STATES.GENERAL_RAG_QUERY
  }
  return legacy[state] || STATES[state] || STATES.IDLE
}

// ── Valid Transitions ────────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  [STATES.IDLE]: [
    STATES.COMPLAINT_DESCRIPTION, STATES.STATUS_LOOKUP,
    STATES.PENDING_COMPLAINTS, STATES.COMPLAINT_HISTORY,
    STATES.FEEDBACK_SELECTION, STATES.GENERAL_RAG_QUERY,
    STATES.GENERAL_CONVERSATION, STATES.IDLE
  ],
  [STATES.COMPLAINT_DESCRIPTION]: [
    STATES.COMPLAINT_LOCATION, STATES.COMPLAINT_CATEGORY,
    STATES.COMPLAINT_PREVIEW, STATES.IDLE
  ],
  [STATES.COMPLAINT_LOCATION]: [
    STATES.COMPLAINT_CATEGORY, STATES.COMPLAINT_PREVIEW,
    STATES.IDLE
  ],
  [STATES.COMPLAINT_CATEGORY]: [
    STATES.COMPLAINT_PREVIEW, STATES.IDLE
  ],
  [STATES.COMPLAINT_PREVIEW]: [
    STATES.CREATING_COMPLAINT, STATES.COMPLAINT_DESCRIPTION,
    STATES.IDLE
  ],
  [STATES.CREATING_COMPLAINT]: [
    STATES.IDLE
  ],
  [STATES.STATUS_LOOKUP]: [
    STATES.IDLE, STATES.FEEDBACK_SELECTION,
    STATES.COMPLAINT_DESCRIPTION
  ],
  [STATES.PENDING_COMPLAINTS]: [
    STATES.IDLE, STATES.STATUS_LOOKUP,
    STATES.COMPLAINT_DESCRIPTION
  ],
  [STATES.COMPLAINT_HISTORY]: [
    STATES.IDLE, STATES.STATUS_LOOKUP,
    STATES.FEEDBACK_SELECTION
  ],
  [STATES.FEEDBACK_SELECTION]: [
    STATES.FEEDBACK_RATING, STATES.FEEDBACK_COMMENT,
    STATES.FEEDBACK_ANALYSIS, STATES.FEEDBACK_PREVIEW,
    STATES.IDLE
  ],
  [STATES.FEEDBACK_RATING]: [
    STATES.FEEDBACK_COMMENT, STATES.FEEDBACK_PREVIEW,
    STATES.IDLE
  ],
  [STATES.FEEDBACK_COMMENT]: [
    STATES.FEEDBACK_ANALYSIS, STATES.FEEDBACK_PREVIEW,
    STATES.IDLE
  ],
  [STATES.FEEDBACK_ANALYSIS]: [
    STATES.FEEDBACK_PREVIEW, STATES.IDLE
  ],
  [STATES.FEEDBACK_PREVIEW]: [
    STATES.SUBMITTING_FEEDBACK, STATES.FEEDBACK_COMMENT,
    STATES.IDLE
  ],
  [STATES.SUBMITTING_FEEDBACK]: [
    STATES.IDLE
  ],
  [STATES.GENERAL_RAG_QUERY]: [
    STATES.IDLE, STATES.COMPLAINT_DESCRIPTION,
    STATES.GENERAL_RAG_QUERY
  ],
  [STATES.GENERAL_CONVERSATION]: [
    STATES.IDLE, STATES.COMPLAINT_DESCRIPTION,
    STATES.GENERAL_CONVERSATION
  ]
}

// ── State Metadata ───────────────────────────────────────────────────────────
const STATE_META = {
  [STATES.IDLE]: {
    expectedInput: null,
    fallbackResponse: "I'm your CampusResolve AI Assistant. I can help you create complaints, check statuses, submit feedback, or answer campus policy questions. How can I help?",
    quickActions: ['Help me create a complaint', 'Show my pending complaints', 'Check complaint status', 'Show my complaint history', '⭐ Give Feedback']
  },
  [STATES.COMPLAINT_DESCRIPTION]: {
    expectedInput: 'description',
    fallbackResponse: 'Please describe the issue you are facing on campus (including the building, lab, or room number).',
    quickActions: ['Seminar Hall projector flickering', 'Computer Lab 3 AC not working', 'Hostel Mess water issue', 'Cancel']
  },
  [STATES.COMPLAINT_LOCATION]: {
    expectedInput: 'location',
    fallbackResponse: 'Which location, room, or building is affected?',
    quickActions: ['Seminar Hall', 'Computer Lab 3', 'Hostel Block B', 'Central Library', 'Cancel']
  },
  [STATES.COMPLAINT_CATEGORY]: {
    expectedInput: 'category',
    fallbackResponse: 'Please select the complaint category.',
    quickActions: ['Infrastructure', 'Academic', 'Hostel', 'Transport', 'IT', 'Cancel']
  },
  [STATES.COMPLAINT_PREVIEW]: {
    expectedInput: 'confirmation',
    fallbackResponse: 'Please review the complaint details above. Click **Create Complaint** to submit or **Edit Details** to make changes.',
    quickActions: ['Create Complaint', 'Edit Details', 'Cancel']
  },
  [STATES.FEEDBACK_SELECTION]: {
    expectedInput: 'complaint_selection',
    fallbackResponse: 'Please select a resolved complaint from the list above to provide your feedback.',
    quickActions: ['Cancel']
  },
  [STATES.FEEDBACK_PREVIEW]: {
    expectedInput: 'confirmation',
    fallbackResponse: 'Please review the feedback preview. Click **Submit Feedback** to confirm or **Edit Feedback** to modify.',
    quickActions: ['Submit Feedback', 'Edit Feedback', 'Cancel']
  },
  [STATES.STATUS_LOOKUP]: {
    expectedInput: null,
    fallbackResponse: 'Your complaint statuses are displayed above. You can ask about a specific complaint ID (e.g., CR-001) or start a new action.',
    quickActions: ['Help me create a complaint', 'Show my pending complaints', '⭐ Give Feedback']
  },
  [STATES.GENERAL_RAG_QUERY]: {
    expectedInput: null,
    fallbackResponse: "I can answer questions about CampusResolve policies, complaint categories, SLA timelines, and campus facilities. What would you like to know?",
    quickActions: ['Help me create a complaint', 'Show my pending complaints', 'Check complaint status', '⭐ Give Feedback']
  }
}

/**
 * Attempt a state transition. Returns the new state or the current state if invalid.
 */
const transition = (currentState, targetState, reason = '') => {
  const from = normalizeState(currentState)
  const to = normalizeState(targetState)

  // Cancel always resets to IDLE
  if (to === STATES.IDLE) {
    return { state: STATES.IDLE, valid: true, reason: reason || 'Reset to IDLE' }
  }

  const allowed = VALID_TRANSITIONS[from] || VALID_TRANSITIONS[STATES.IDLE]
  if (allowed && allowed.includes(to)) {
    return { state: to, valid: true, reason }
  }

  // Allow same-state re-entry
  if (from === to) {
    return { state: to, valid: true, reason: 'Same state re-entry' }
  }

  // Invalid transition — log but don't crash
  console.warn(`[StateEngine] Invalid transition: ${from} → ${to} (${reason}). Staying in ${from}.`)
  return { state: from, valid: false, reason: `Invalid transition from ${from} to ${to}` }
}

/**
 * Get the deterministic fallback response for a state
 */
const getFallbackResponse = (state) => {
  const normalized = normalizeState(state)
  const meta = STATE_META[normalized] || STATE_META[STATES.IDLE]
  return {
    text: meta.fallbackResponse,
    quickActions: meta.quickActions,
    state: normalized
  }
}

/**
 * Get quick actions for a specific state
 */
const getQuickActionsForState = (state, userRole = 'student') => {
  const normalized = normalizeState(state)
  const meta = STATE_META[normalized]
  if (meta) return meta.quickActions

  if (userRole === 'admin') {
    return ['Campus Statistics', 'Feedback Report', 'Review Escalations']
  }
  if (userRole === 'teacher') {
    return ['View Assigned Complaints', 'Resolution Best Practices', 'Department Overview']
  }
  return STATE_META[STATES.IDLE].quickActions
}

/**
 * Determine if a state is a workflow state (not IDLE/GENERAL)
 */
const isWorkflowActive = (state) => {
  const normalized = normalizeState(state)
  return normalized !== STATES.IDLE &&
    normalized !== STATES.GENERAL_CONVERSATION &&
    normalized !== STATES.GENERAL_RAG_QUERY
}

/**
 * Get the workflow type for a state
 */
const getWorkflowType = (state) => {
  const normalized = normalizeState(state)
  if (normalized.startsWith('COMPLAINT')) return 'COMPLAINT'
  if (normalized.startsWith('FEEDBACK')) return 'FEEDBACK'
  if (normalized.startsWith('STATUS') || normalized.startsWith('PENDING') || normalized === STATES.COMPLAINT_HISTORY) return 'STATUS'
  return null
}

module.exports = {
  STATES,
  normalizeState,
  transition,
  getFallbackResponse,
  getQuickActionsForState,
  isWorkflowActive,
  getWorkflowType,
  STATE_META
}
