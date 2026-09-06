/**
 * CampusResolve Voice-First AI Agent — Intent Classifier
 * 
 * Fast client-side classification of voice & text intents before dispatch.
 * Supports 16+ intents including search, navigation, voice control, and
 * context-aware confirmation routing.
 */

export type AIIntent =
  | 'GENERAL_QUESTION'
  | 'CREATE_COMPLAINT'
  | 'UPDATE_COMPLAINT'
  | 'CHECK_STATUS'
  | 'SHOW_PENDING'
  | 'SHOW_HISTORY'
  | 'SEARCH_COMPLAINTS'
  | 'OPEN_COMPLAINT_DETAILS'
  | 'GIVE_FEEDBACK'
  | 'UPDATE_FEEDBACK'
  | 'CANCEL_ACTION'
  | 'CONFIRM_ACTION'
  | 'NAVIGATION'
  | 'VOICE_CONTROL'
  | 'AI_ANALYTICS'
  | 'UNKNOWN'

export interface ClassifiedIntentResult {
  intent: AIIntent
  confidence: number
  extractedRating?: number
  extractedAspect?: {
    dimension: 'quality' | 'speed' | 'communication'
    value: string
  }
  navigationTarget?: string
  voiceCommand?: string
  searchQuery?: string
  isButtonAction: boolean
}

// Navigation route mapping
const NAVIGATION_ROUTES: Record<string, string> = {
  'dashboard': '/student',
  'home': '/student',
  'profile': '/student/profile',
  'my profile': '/student/profile',
  'complaints': '/student/history',
  'my complaints': '/student/history',
  'complaint history': '/student/history',
  'history': '/student/history',
  'feedback': '/student/feedback',
  'my feedback': '/student/feedback',
  'notifications': '/student/notifications',
  'ai intelligence': '/student/ai-intelligence',
  'analytics': '/student/ai-intelligence',
  'settings': '/student/profile',
}

export class IntentClassifier {
  public classify(text: string, currentState: string = 'IDLE'): ClassifiedIntentResult {
    const raw = text.trim()
    const lower = raw.toLowerCase()

    // 1. Cancel Actions (Highest Priority)
    if (/^(cancel|cancel feedback|cancel complaint|stop|abort|exit|close|nevermind|never mind|go back|don'?t do that|forget it)$/i.test(lower)) {
      return { intent: 'CANCEL_ACTION', confidence: 0.99, isButtonAction: true }
    }

    // 2. Confirmation Actions (context-aware: boost confidence in AWAITING_CONFIRMATION)
    const confirmPattern = /^(yes|confirm|submit|submit feedback|submit complaint|proceed|yes please|do it|save feedback|save complaint|create it|go ahead|create complaint|that'?s correct|correct|absolutely)$/i
    if (confirmPattern.test(lower)) {
      const confidence = currentState === 'AWAITING_CONFIRMATION' || currentState.includes('COMPLAINT') || currentState.includes('FEEDBACK') ? 0.99 : 0.95
      return { intent: 'CONFIRM_ACTION', confidence, isButtonAction: true }
    }

    // 3. Voice Control Commands
    if (/^(stop speaking|mute|unmute|speak louder|speak softer|speak slower|speak faster|be quiet|shut up|pause)$/i.test(lower)) {
      return { intent: 'VOICE_CONTROL', confidence: 0.98, voiceCommand: lower, isButtonAction: true }
    }

    // 4. Voice Feedback Rating Updates
    const ratingMatch = lower.match(/(?:rate(?:\s+it)?|give(?:\s+it)?|change(?:\s+my)?\s+rating\s+to|(\d)\s*stars?)\s*(\d(?:\.\d)?|one|two|three|four|five)?/i)
    if (ratingMatch) {
      let val = 5
      const word = (ratingMatch[2] || ratingMatch[1] || '5').toLowerCase()
      if (word === '1' || word === 'one') val = 1
      else if (word === '2' || word === 'two') val = 2
      else if (word === '3' || word === 'three') val = 3
      else if (word === '4' || word === 'four') val = 4
      else if (word === '5' || word === 'five') val = 5
      else val = Math.min(5, Math.max(1, parseInt(word, 10) || 5))

      return {
        intent: 'UPDATE_FEEDBACK',
        confidence: 0.92,
        extractedRating: val,
        isButtonAction: false
      }
    }

    // 5. Voice Feedback Aspect Updates
    if (/resolution\s+(?:quality\s+)?was\s+(good|poor|excellent|satisfactory|bad)/i.test(lower)) {
      const match = lower.match(/resolution\s+(?:quality\s+)?was\s+(good|poor|excellent|satisfactory|bad)/i)
      return {
        intent: 'UPDATE_FEEDBACK',
        confidence: 0.9,
        extractedAspect: { dimension: 'quality', value: match ? match[1] : 'good' },
        isButtonAction: false
      }
    }
    if (/(?:response\s+(?:time|speed)\s+was|(?:a\s+little\s+)?slow|(?:too\s+)?fast|(?:very\s+)?quick)\s*(slow|fast|quick|moderate|very slow)?/i.test(lower)) {
      let speedValue = 'moderate'
      if (/slow/i.test(lower)) speedValue = 'slow'
      else if (/fast|quick/i.test(lower)) speedValue = 'fast'
      return {
        intent: 'UPDATE_FEEDBACK',
        confidence: 0.88,
        extractedAspect: { dimension: 'speed', value: speedValue },
        isButtonAction: false
      }
    }
    if (/communication\s+was\s+(good|poor|excellent|clear|bad|very good)/i.test(lower)) {
      const match = lower.match(/communication\s+was\s+(good|poor|excellent|clear|bad|very good)/i)
      return {
        intent: 'UPDATE_FEEDBACK',
        confidence: 0.9,
        extractedAspect: { dimension: 'communication', value: match ? match[1] : 'good' },
        isButtonAction: false
      }
    }
    // Simple "very good" or "excellent" as a feedback value response
    if (currentState.includes('FEEDBACK') && /^(very good|excellent|great|amazing|terrible|bad|okay|alright|not bad|good|poor)$/i.test(lower)) {
      return {
        intent: 'UPDATE_FEEDBACK',
        confidence: 0.85,
        isButtonAction: false
      }
    }

    // 6. Feedback Workflow Triggers
    if (/^(⭐?\s*give feedback|rate complaint|i want to give feedback|give feedback for|feedback on resolution|i want to rate)/i.test(lower)) {
      return { intent: 'GIVE_FEEDBACK', confidence: 0.95, isButtonAction: false }
    }

    // 7. Voice Search / Find Queries
    if (/\b(find|search|look ?up|show)\s+(my\s+)?(complaint|issue|ticket|grievance)s?\s+(about|for|regarding|from|in)\s+/i.test(lower) ||
        /\bfind my\s+\w+\s+complaint/i.test(lower) ||
        /\bsearch complaints?\s+(about|for|regarding)/i.test(lower) ||
        /\bshow\s+(complaints?|issues?)\s+from\s+(last|this)/i.test(lower) ||
        /\bfind\s+(resolved|pending|escalated)\s+(infrastructure|academic|transport|hostel)?\s*complaints?/i.test(lower)) {
      const searchQueryMatch = lower.match(/(?:find|search|show|look\s*up)\s+(?:my\s+)?(?:complaints?\s+)?(?:about|for|regarding|from|in)?\s*(.+)/i)
      return {
        intent: 'SEARCH_COMPLAINTS',
        confidence: 0.91,
        searchQuery: searchQueryMatch ? searchQueryMatch[1].trim() : lower,
        isButtonAction: false
      }
    }

    // 8. Open Complaint Details (contextual follow-up)
    if (/^(open\s+it|read\s+(the\s+)?details|show\s+(the\s+)?timeline|the\s+first\s+one|the\s+second\s+one|tell\s+me\s+more)$/i.test(lower)) {
      return { intent: 'OPEN_COMPLAINT_DETAILS', confidence: 0.9, isButtonAction: false }
    }

    // 9. Complaint Status & List Queries
    if (/what(?:'s|\s+is)\s+my\s+complaint\s+status|check(?:\s+my)?\s+complaint\s+status|track(?:\s+my)?\s+complaint|what\s+happened\s+to\s+my|status\s+of\s+(CR|CMP)-\d+|when\s+will\s+my\s+complaint\s+be\s+resolved|read\s+my\s+latest\s+complaint\s+update/i.test(lower)) {
      return { intent: 'CHECK_STATUS', confidence: 0.92, isButtonAction: false }
    }
    if (/show(?:\s+my)?\s+pending\s+complaints|pending\s+issues|pending\s+tickets|do\s+i\s+have\s+any\s+unresolved/i.test(lower)) {
      return { intent: 'SHOW_PENDING', confidence: 0.94, isButtonAction: false }
    }
    if (/show(?:\s+my)?\s+(?:resolved|history|complaint\s+history)|all\s+my\s+complaints/i.test(lower)) {
      return { intent: 'SHOW_HISTORY', confidence: 0.93, isButtonAction: false }
    }

    // 10. Navigation Triggers (expanded)
    const navMatch = lower.match(/(?:go\s+to|open|show|navigate\s+to|take\s+me\s+to|return\s+to)\s+(?:my\s+)?(.+)/i)
    if (navMatch) {
      const target = navMatch[1].trim()
      const route = NAVIGATION_ROUTES[target] || NAVIGATION_ROUTES[target.replace(/\s+/g, ' ')]
      if (route) {
        return { intent: 'NAVIGATION', confidence: 0.92, navigationTarget: route, isButtonAction: true }
      }
    }
    // Simple "go back" / "return to home"
    if (/^(go\s+back|return\s+to\s+home|back\s+to\s+dashboard)$/i.test(lower)) {
      return { intent: 'NAVIGATION', confidence: 0.9, navigationTarget: '/student', isButtonAction: true }
    }

    // 11. Complaint Modification
    if (/change\s+location|edit\s+details|change\s+priority|update\s+description/i.test(lower)) {
      return { intent: 'UPDATE_COMPLAINT', confidence: 0.9, isButtonAction: false }
    }

    // 12. Complaint Creation Triggers
    if (
      /not working|broken|flickering|leaking|damaged|no water|fan|ac|projector|wifi|complaint|grievance/i.test(lower) ||
      /help me create a complaint|report an issue|file a complaint|i want to report/i.test(lower)
    ) {
      return { intent: 'CREATE_COMPLAINT', confidence: 0.88, isButtonAction: false }
    }

    // 13. AI Analytics Triggers
    if (/root cause|sla risk|breach prediction|health score|recurrence/i.test(lower)) {
      return { intent: 'AI_ANALYTICS', confidence: 0.85, isButtonAction: false }
    }

    // Default
    return { intent: 'GENERAL_QUESTION', confidence: 0.75, isButtonAction: false }
  }
}

export const intentClassifier = new IntentClassifier()
