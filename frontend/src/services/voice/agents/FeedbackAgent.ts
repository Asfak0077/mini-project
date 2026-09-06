/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Feedback Agent
 * 
 * Manages the entire SUBMIT_FEEDBACK multi-turn workflow:
 * - Complaint Selection
 * - Star Rating (1-5, words/numbers)
 * - Comment / Aspects (Quality, Speed, Communication)
 * - Review and Confirmation
 */

import {
  ActiveWorkflow,
  FeedbackDraftData,
  ExpectedInputType,
  AgentResponse
} from '../workflowTypes'

export class FeedbackAgent {
  /**
   * Start feedback workflow
   */
  public startFeedbackWorkflow(
    complaintId?: string | null,
    complaintTitle?: string | null,
    initialUtterance?: string
  ): AgentResponse {
    const workflowId = `wf-feedback-${Date.now()}`
    const draft: FeedbackDraftData = {
      complaintId: complaintId || null,
      complaintTitle: complaintTitle || null,
      rating: null,
      feedbackText: null
    }

    if (initialUtterance) {
      const extractedRating = this.extractRating(initialUtterance)
      if (extractedRating) draft.rating = extractedRating
    }

    // Step 1: If no complaint selected, ask for complaint ID or pick recent
    if (!draft.complaintId) {
      const activeWorkflow: ActiveWorkflow = {
        id: workflowId,
        type: 'SUBMIT_FEEDBACK',
        status: 'COLLECTING_INFORMATION',
        currentStep: 'AWAITING_COMPLAINT_SELECTION',
        expectedInput: 'COMPLAINT_SELECTION',
        collectedData: draft,
        missingFields: ['complaintId', 'rating', 'feedbackText'],
        lastQuestion: 'Which resolved complaint would you like to provide feedback for?',
        conversationContext: [
          { role: 'user', text: initialUtterance || 'Give feedback', timestamp: Date.now() },
          { role: 'agent', text: 'Which resolved complaint would you like to provide feedback for?', timestamp: Date.now() }
        ],
        startedAt: Date.now(),
        updatedAt: Date.now()
      }

      return {
        workflow: 'SUBMIT_FEEDBACK',
        workflowStatus: 'COLLECTING_INFORMATION',
        currentStep: 'AWAITING_COMPLAINT_SELECTION',
        expectedInput: 'COMPLAINT_SELECTION',
        extractedData: draft,
        missingFields: ['complaintId', 'rating', 'feedbackText'],
        screenResponse: 'Which resolved complaint would you like to provide feedback for?',
        voiceResponse: 'Which resolved complaint would you like to provide feedback for?',
        shouldListenAgain: true,
        requiresConfirmation: false,
        feedbackDraft: draft,
        action: {
          type: 'NONE',
          payload: { activeWorkflow }
        },
        quickActions: ['Show my resolved complaints', 'Cancel']
      }
    }

    // Step 2: If complaint known, ask for rating
    const activeWorkflow: ActiveWorkflow = {
      id: workflowId,
      type: 'SUBMIT_FEEDBACK',
      status: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      collectedData: draft,
      missingFields: ['rating', 'feedbackText'],
      lastQuestion: `How would you rate the resolution of complaint ${draft.complaintId} from 1 to 5 stars?`,
      conversationContext: [
        { role: 'user', text: initialUtterance || 'Give feedback', timestamp: Date.now() },
        { role: 'agent', text: `How would you rate the resolution of complaint ${draft.complaintId} from 1 to 5 stars?`, timestamp: Date.now() }
      ],
      startedAt: Date.now(),
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      extractedData: draft,
      missingFields: ['rating', 'feedbackText'],
      screenResponse: `How would you rate the resolution of complaint **${draft.complaintId}**? (1 to 5 stars)`,
      voiceResponse: `How would you rate the resolution of complaint ${draft.complaintId} from 1 to 5 stars?`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: {
        type: 'NONE',
        payload: { activeWorkflow }
      },
      quickActions: ['⭐⭐⭐⭐⭐ 5 Stars', '⭐⭐⭐⭐ 4 Stars', '⭐⭐⭐ 3 Stars', 'Cancel']
    }
  }

  /**
   * Handle user input within SUBMIT_FEEDBACK workflow
   */
  public async handleWorkflowInput(
    userInput: string,
    activeWorkflow: ActiveWorkflow
  ): Promise<AgentResponse> {
    const raw = userInput.trim()
    const lower = raw.toLowerCase()
    let draft: FeedbackDraftData = { ...(activeWorkflow.collectedData as FeedbackDraftData) }

    // Cancellation
    if (/^(cancel|stop|nevermind|abort|exit|close)$/i.test(lower)) {
      return this.cancelWorkflow()
    }

    // Confirmation
    if (activeWorkflow.status === 'AWAITING_CONFIRMATION' || activeWorkflow.expectedInput === 'CONFIRMATION') {
      if (/^(yes|yeah|sure|confirm|submit|proceed|submit it|go ahead)$/i.test(lower)) {
        return this.submitFeedback(draft)
      } else {
        return this.cancelWorkflow()
      }
    }

    // Process based on expected input
    if (activeWorkflow.expectedInput === 'COMPLAINT_SELECTION') {
      const match = raw.match(/\b(CR-\d+|CMP-\d+)\b/i)
      if (match) {
        draft.complaintId = match[0].toUpperCase()
      } else if (/first|recent|last/i.test(lower)) {
        draft.complaintId = 'CR-RECENT'
      } else {
        draft.complaintId = raw
      }

      // Now ask for rating
      return this.askRating(draft, activeWorkflow)
    }

    if (activeWorkflow.expectedInput === 'RATING') {
      const rating = this.extractRating(raw) || 5
      draft.rating = rating
      // Now ask for feedback text
      return this.askFeedbackText(draft, activeWorkflow)
    }

    if (activeWorkflow.expectedInput === 'FEEDBACK_TEXT') {
      draft.feedbackText = raw
      // All collected -> Review and confirm
      return this.requestConfirmation(draft, activeWorkflow)
    }

    // Default fallback
    return this.askRating(draft, activeWorkflow)
  }

  private askRating(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      collectedData: draft,
      missingFields: ['rating', 'feedbackText'],
      lastQuestion: `How would you rate the resolution of ${draft.complaintId} on a scale of 1 to 5 stars?`,
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      extractedData: draft,
      missingFields: ['rating', 'feedbackText'],
      screenResponse: `How would you rate the resolution of **${draft.complaintId}**? (1 to 5 stars)`,
      voiceResponse: `How would you rate the resolution on a scale of 1 to 5 stars?`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['⭐⭐⭐⭐⭐ 5 Stars', '⭐⭐⭐⭐ 4 Stars', '⭐⭐⭐ 3 Stars', 'Cancel']
    }
  }

  private askFeedbackText(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      currentStep: 'AWAITING_FEEDBACK_TEXT',
      expectedInput: 'FEEDBACK_TEXT',
      collectedData: draft,
      missingFields: ['feedbackText'],
      lastQuestion: `Got it, ${draft.rating} stars. Please briefly tell us about your experience with the resolution.`,
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_FEEDBACK_TEXT',
      expectedInput: 'FEEDBACK_TEXT',
      extractedData: draft,
      missingFields: ['feedbackText'],
      screenResponse: `Got it, **${draft.rating} stars**. What would you like to say about how your issue was resolved?`,
      voiceResponse: `Got it, ${draft.rating} stars. Please briefly describe your experience with the resolution.`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['Resolved promptly and cleanly', 'Good service', 'Skip comment']
    }
  }

  private requestConfirmation(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      status: 'AWAITING_CONFIRMATION',
      currentStep: 'AWAITING_CONFIRMATION',
      expectedInput: 'CONFIRMATION',
      collectedData: draft,
      missingFields: [],
      lastQuestion: `I have prepared your ${draft.rating} star feedback for ${draft.complaintId}. Would you like me to submit it?`,
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'AWAITING_CONFIRMATION',
      currentStep: 'AWAITING_CONFIRMATION',
      expectedInput: 'CONFIRMATION',
      extractedData: draft,
      missingFields: [],
      screenResponse: `### 🌟 Feedback Summary\n- **Complaint:** ${draft.complaintId}\n- **Rating:** ${draft.rating} / 5 Stars\n- **Comment:** "${draft.feedbackText || 'Good resolution'}"\n\nWould you like me to submit this feedback?`,
      voiceResponse: `I have prepared your ${draft.rating} star feedback for complaint ${draft.complaintId}. Would you like me to submit it?`,
      shouldListenAgain: true,
      requiresConfirmation: true,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['Yes, Submit Feedback', 'Cancel']
    }
  }

  private submitFeedback(draft: FeedbackDraftData): AgentResponse {
    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COMPLETED',
      currentStep: 'COMPLETED',
      expectedInput: null,
      extractedData: draft,
      missingFields: [],
      screenResponse: `✅ **Feedback Submitted Successfully!**\n\nThank you for helping us improve campus services.`,
      voiceResponse: `Thank you! Your feedback has been recorded successfully. Is there anything else I can help you with?`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: {
        type: 'SUBMIT_FEEDBACK',
        payload: draft
      },
      quickActions: ['Show my complaints', 'Done']
    }
  }

  public cancelWorkflow(): AgentResponse {
    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'CANCELLED',
      currentStep: 'CANCELLED',
      expectedInput: null,
      extractedData: {},
      missingFields: [],
      screenResponse: 'Feedback submission cancelled.',
      voiceResponse: 'Okay, I cancelled feedback submission. How else can I help you?',
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: null,
      action: { type: 'NONE', payload: { clearWorkflow: true } }
    }
  }

  private extractRating(text: string): number | null {
    const wordMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 }
    const matchWord = text.match(/\b(one|two|three|four|five)\s*(?:star|stars)?\b/i)
    if (matchWord && wordMap[matchWord[1].toLowerCase()]) {
      return wordMap[matchWord[1].toLowerCase()]
    }
    const matchDigit = text.match(/\b([1-5])\s*(?:star|stars)?\b/i)
    if (matchDigit) {
      return parseInt(matchDigit[1], 10)
    }
    return null
  }
}

export const feedbackAgent = new FeedbackAgent()
