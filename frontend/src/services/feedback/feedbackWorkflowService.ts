/**
 * CampusResolve Voice AI Agent — Feedback Workflow Service
 * Handles voice-driven ratings adjustments and explicit confirmation guards.
 */

import { StructuredFeedback, submitFeedbackFromChat } from '../chatbotService'

export class FeedbackWorkflowService {
  /**
   * Apply spoken dimension or rating update to active feedback draft.
   */
  public static applyVoiceAdjustment(
    draft: StructuredFeedback,
    adjustment: {
      rating?: number
      dimension?: 'quality' | 'speed' | 'communication'
      value?: string
    }
  ): StructuredFeedback {
    const updated = { ...draft }

    if (typeof adjustment.rating === 'number') {
      updated.suggestedRating = Math.min(5, Math.max(1, adjustment.rating))
    }

    if (adjustment.dimension && adjustment.value) {
      const v = adjustment.value.toLowerCase()
      if (adjustment.dimension === 'quality') {
        updated.resolutionQuality = v.includes('excellent') ? 'Excellent' : v.includes('good') ? 'Satisfactory' : 'Poor'
      } else if (adjustment.dimension === 'speed') {
        updated.responseTime = v.includes('fast') || v.includes('quick') ? 'Fast' : v.includes('slow') ? 'Slow' : 'Moderate'
      } else if (adjustment.dimension === 'communication') {
        updated.communication = v.includes('excellent') || v.includes('good') ? 'Good' : 'Moderate'
      }
    }

    return updated
  }

  /**
   * Submits verified feedback.
   */
  public static async submitFeedback(feedback: StructuredFeedback): Promise<any> {
    if (!feedback.complaintId) {
      throw new Error('Complaint ID is missing from feedback draft.')
    }

    return submitFeedbackFromChat({
      complaintId: feedback.complaintId,
      rating: feedback.suggestedRating || 5,
      comment: feedback.suggestedFeedback || feedback.originalComment || '',
      category: 'Resolution Satisfaction',
      aiAnalysis: {
        sentiment: feedback.sentiment,
        resolutionQuality: feedback.resolutionQuality,
        responseTime: feedback.responseTime,
        communication: feedback.communication,
        topics: feedback.topics,
        summary: feedback.summary,
        suggestedFollowUp: feedback.suggestedFollowUp
      }
    })
  }
}
