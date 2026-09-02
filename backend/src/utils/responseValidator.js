/**
 * CampusResolve — Response Validator
 * 
 * Final quality gate before any AI response is returned.
 * Checks relevance, duplicate detection, field redundancy, state consistency,
 * data grounding, and internal leak prevention.
 */

/**
 * Simple text similarity (Jaccard on word tokens)
 */
const textSimilarity = (text1 = '', text2 = '') => {
  if (!text1 || !text2) return 0
  const t1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const t2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  if (t1.size === 0 || t2.size === 0) return 0
  const intersection = new Set([...t1].filter(w => t2.has(w)))
  const union = new Set([...t1, ...t2])
  return intersection.size / union.size
}

/**
 * Check if response is asking for a field that already exists in the complaint draft
 */
const isAskingForCollectedField = (responseText, complaintDraft) => {
  if (!responseText || !complaintDraft) return false
  const lower = responseText.toLowerCase()

  if (complaintDraft.location && complaintDraft.location !== 'Campus Premises') {
    if (lower.match(/which (location|room|building|block)|where.*affected|location.*affected/i)) {
      return { redundant: true, field: 'location', value: complaintDraft.location }
    }
  }
  if (complaintDraft.category && complaintDraft.category !== 'General') {
    if (lower.match(/which (category|type)|select.*category/i)) {
      return { redundant: true, field: 'category', value: complaintDraft.category }
    }
  }
  if (complaintDraft.description && complaintDraft.description.length > 5) {
    if (lower.match(/describe.*issue|what.*problem|please describe/i)) {
      return { redundant: true, field: 'description', value: complaintDraft.description }
    }
  }
  return { redundant: false }
}

/**
 * Check if response contains internal analysis or chain-of-thought leaks
 */
const hasInternalLeaks = (responseText) => {
  if (!responseText) return false
  const leakPatterns = [
    /\bcurrentMessage\b/i,
    /\bnormalizedMessage\b/i,
    /\bmessageCategory\b/i,
    /\bextractedEntities\b/i,
    /\bmissingFields\b/i,
    /\brequiresRAG\b/i,
    /\brequiresDatabase\b/i,
    /\bshouldGenerateLLMReply\b/i,
    /\bconfidence:\s*\d/i,
    /\binternal analysis\b/i,
    /\bchain[- ]of[- ]thought\b/i,
    /\{[\s\S]*"intent"[\s\S]*"confidence"[\s\S]*\}/
  ]
  return leakPatterns.some(p => p.test(responseText))
}

/**
 * Check if the response is relevant to the user's current message
 */
const isResponseRelevant = (responseText, currentMessage, conversationState, intent) => {
  if (!responseText || !currentMessage) return true // can't determine, allow

  // If in a complaint workflow and response talks about feedback, flag it
  const complaintStates = ['COMPLAINT_DESCRIPTION', 'COMPLAINT_LOCATION', 'COMPLAINT_CATEGORY', 'COMPLAINT_PREVIEW', 'COMPLAINT_COLLECTION', 'WAITING_FOR_LOCATION', 'WAITING_FOR_CATEGORY']
  if (complaintStates.includes(conversationState)) {
    if (/submit.*feedback|feedback.*submitted|rate.*teacher/i.test(responseText) && !/cancel|help/i.test(currentMessage)) {
      return false
    }
  }

  // If in a feedback workflow and response talks about creating complaints
  const feedbackStates = ['FEEDBACK_SELECTION', 'FEEDBACK_RATING', 'FEEDBACK_COMMENT', 'FEEDBACK_PREVIEW']
  if (feedbackStates.includes(conversationState)) {
    if (/describe.*issue|lodge.*complaint|create.*complaint/i.test(responseText) && !/cancel|help/i.test(currentMessage)) {
      return false
    }
  }

  return true
}

/**
 * Main validation function — called before returning any response
 * 
 * @param {Object} params
 * @param {string} params.responseText - The generated response text
 * @param {string} params.currentMessage - The user's current message
 * @param {string} params.previousAssistantMessage - The previous AI message
 * @param {string} params.conversationState - Current state
 * @param {string} params.intent - Classified intent
 * @param {Object} params.complaintDraft - Active complaint draft
 * @param {Object} params.feedbackDraft - Active feedback draft
 * 
 * @returns {Object} { valid: boolean, reason: string, suggestion: string }
 */
const validateResponse = ({
  responseText = '',
  currentMessage = '',
  previousAssistantMessage = '',
  conversationState = 'IDLE',
  intent = '',
  complaintDraft = null,
  feedbackDraft = null
}) => {
  const issues = []

  // 1. Empty response check
  if (!responseText || responseText.trim().length === 0) {
    issues.push({
      type: 'EMPTY_RESPONSE',
      severity: 'critical',
      message: 'Response is empty'
    })
  }

  // 2. Duplicate response check
  if (previousAssistantMessage && responseText) {
    const similarity = textSimilarity(responseText, previousAssistantMessage)
    if (similarity > 0.85 && currentMessage.toLowerCase() !== previousAssistantMessage.toLowerCase()) {
      issues.push({
        type: 'DUPLICATE_RESPONSE',
        severity: 'high',
        message: `Response is ${Math.round(similarity * 100)}% similar to previous assistant message`,
        similarity
      })
    }
  }

  // 3. Redundant field question check
  if (complaintDraft) {
    const fieldCheck = isAskingForCollectedField(responseText, complaintDraft)
    if (fieldCheck.redundant) {
      issues.push({
        type: 'REDUNDANT_QUESTION',
        severity: 'high',
        message: `Response asks for '${fieldCheck.field}' which is already '${fieldCheck.value}'`,
        field: fieldCheck.field
      })
    }
  }

  // 4. Internal leak check
  if (hasInternalLeaks(responseText)) {
    issues.push({
      type: 'INTERNAL_LEAK',
      severity: 'critical',
      message: 'Response contains internal analysis or chain-of-thought content'
    })
  }

  // 5. Relevance check
  if (!isResponseRelevant(responseText, currentMessage, conversationState, intent)) {
    issues.push({
      type: 'IRRELEVANT_RESPONSE',
      severity: 'high',
      message: 'Response does not match the current workflow state'
    })
  }

  // 6. Personal data grounding (check for hallucinated complaint IDs)
  if (/CR-\d{3,}/i.test(responseText) && intent !== 'CHECK_COMPLAINT_STATUS' && intent !== 'SHOW_PENDING_COMPLAINTS' && intent !== 'SHOW_COMPLAINT_HISTORY') {
    // If the response mentions a complaint ID but the intent isn't a status/history lookup,
    // it might be hallucinated — flag but don't block
    issues.push({
      type: 'POTENTIAL_HALLUCINATION',
      severity: 'low',
      message: 'Response mentions complaint ID outside of status/history context'
    })
  }

  // Determine overall validity
  const criticalIssues = issues.filter(i => i.severity === 'critical')
  const highIssues = issues.filter(i => i.severity === 'high')

  return {
    valid: criticalIssues.length === 0 && highIssues.length === 0,
    issues,
    hasCritical: criticalIssues.length > 0,
    hasHigh: highIssues.length > 0,
    summary: issues.length > 0
      ? issues.map(i => `[${i.severity.toUpperCase()}] ${i.message}`).join('; ')
      : 'Response passed all validation checks'
  }
}

module.exports = {
  validateResponse,
  textSimilarity,
  isAskingForCollectedField,
  hasInternalLeaks,
  isResponseRelevant
}
