/**
 * CampusResolve Voice AI Agent — Complaint Workflow Service
 * Coordinates drafting, voice edits, and guarded submission.
 */

import { StructuredComplaint, createComplaintFromChat } from '../chatbotService'

export class ComplaintWorkflowService {
  public static validateForSubmission(draft: StructuredComplaint | null): {
    isValid: boolean
    errorMessage?: string
  } {
    if (!draft) {
      return { isValid: false, errorMessage: 'No complaint draft active.' }
    }
    if (!draft.title || draft.title.trim().length < 3) {
      return { isValid: false, errorMessage: 'Complaint title is too short.' }
    }
    if (!draft.location || draft.location.trim().length < 2) {
      return { isValid: false, errorMessage: 'Affected location is required.' }
    }
    return { isValid: true }
  }

  public static async submitComplaint(draft: StructuredComplaint): Promise<any> {
    const check = this.validateForSubmission(draft)
    if (!check.isValid) {
      throw new Error(check.errorMessage || 'Invalid complaint draft.')
    }
    return createComplaintFromChat({
      title: draft.title,
      category: draft.category,
      department: draft.department || 'CSE',
      location: draft.location || '',
      priority: draft.priority || 'medium',
      description: draft.description
    })
  }
}
