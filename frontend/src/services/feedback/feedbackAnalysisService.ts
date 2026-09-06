/**
 * CampusResolve Voice AI Agent — Feedback Analysis Service
 * Evaluates spoken feedback sentiment and dimensions without button text leakage.
 */

import { StructuredFeedback, analyzeFeedbackText } from '../chatbotService'

export class FeedbackAnalysisService {
  public static async analyzeSpokenFeedback(
    text: string,
    existingDraft: StructuredFeedback | null = null
  ): Promise<StructuredFeedback> {
    const raw = text.trim()
    const lower = raw.toLowerCase()

    // Guard against button command strings
    if (/^(cancel|submit feedback|edit feedback|edit details)$/i.test(lower)) {
      throw new Error('Action commands cannot be processed as feedback content.')
    }

    let analysis: any = null
    try {
      analysis = await analyzeFeedbackText(raw)
    } catch {
      // Graceful fallback
      analysis = {
        sentiment: lower.includes('great') || lower.includes('good') || lower.includes('satisfied') ? 'Positive' : 'Neutral',
        resolutionQuality: lower.includes('good') || lower.includes('excellent') ? 'Excellent' : 'Satisfactory',
        responseTime: lower.includes('slow') ? 'Slow' : 'Moderate',
        communication: lower.includes('clear') || lower.includes('good') ? 'Good' : 'Moderate',
        suggestedRating: lower.includes('slow') || lower.includes('poor') ? 3 : 5,
        summary: raw
      }
    }

    return {
      complaintId: existingDraft?.complaintId || '',
      complaintTitle: existingDraft?.complaintTitle || '',
      department: existingDraft?.department || 'General',
      teacherId: existingDraft?.teacherId || '',
      teacherName: existingDraft?.teacherName || '',
      sentiment: analysis?.sentiment || 'Neutral',
      resolutionQuality: analysis?.resolutionQuality || 'Satisfactory',
      responseTime: analysis?.responseTime || 'Moderate',
      communication: analysis?.communication || 'Good',
      suggestedRating: analysis?.suggestedRating || existingDraft?.suggestedRating || 4,
      topics: analysis?.topics || ['Resolution Quality', 'Response Time', 'Communication'],
      summary: analysis?.summary || raw,
      suggestedFeedback: analysis?.suggestedFeedback || raw,
      originalComment: raw,
      suggestedFollowUp: analysis?.suggestedFollowUp || ''
    }
  }
}
