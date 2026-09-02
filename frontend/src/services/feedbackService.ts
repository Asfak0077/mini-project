import api from './apiClient'

export type ResolutionStatusOption =
  | 'Yes, completely resolved'
  | 'Partially resolved'
  | 'No, the issue still exists'

export interface FeedbackDraft {
  complaintId: string
  overallRating: number
  resolutionQuality: number
  responseTime: number
  communication: number
  staffSupport: number
  resolutionStatus: ResolutionStatusOption
  unresolvedReason: string
  feedbackText: string
  positiveTags: string[]
  customPositiveTag?: string
  improvementTags: string[]
  customImprovementTag?: string
  recommendationScore: number
  isAnonymous: boolean
}

export interface FeedbackPayload extends Partial<FeedbackDraft> {
  _id?: string
  id?: string
  complaintId: string
  studentName: string
  studentId: string
  studentEmail?: string
  department: string
  teacherId: string
  teacherName: string
  complaintTitle?: string
  resolutionSummary?: string
  rating: number // Overall rating (1-5)
  overallRating?: number
  resolutionQuality?: number
  responseTime?: number
  communication?: number
  staffSupport?: number
  resolutionStatus?: ResolutionStatusOption

  unresolvedReason?: string
  positiveTags?: string[]
  improvementTags?: string[]
  recommendationScore?: number
  isAnonymous?: boolean
  category: string
  comment: string
  feedbackText?: string
  comments?: string
  aiAnalysis?: any
  createdAt?: string
  date?: string
}

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || error?.message || fallback
}

export const submitFeedback = async (payload: FeedbackPayload) => {
  try {
    const response = await api.post('/feedback', payload)
    return response.data
  } catch (error) {
    console.error('Submit feedback error:', error)
    throw new Error(getErrorMessage(error, 'Unable to submit feedback to database.'))
  }
}

export const getAllFeedback = async (): Promise<FeedbackPayload[]> => {
  try {
    const response = await api.get('/feedback')
    return Array.isArray(response.data) ? response.data : (response.data?.feedback ?? [])
  } catch (error) {
    console.error('Get all feedback error:', error)
    return []
  }
}

export const getStudentFeedback = async (studentId: string): Promise<FeedbackPayload[]> => {
  if (!studentId) return []
  try {
    const response = await api.get(`/feedback/student/${studentId}`)
    return Array.isArray(response.data) ? response.data : (response.data?.feedback ?? [])
  } catch (error) {
    console.error('Get student feedback error:', error)
    return []
  }
}

export const getTeacherFeedback = async (teacherId: string): Promise<FeedbackPayload[]> => {
  if (!teacherId) return []
  try {
    const response = await api.get(`/feedback/teacher/${teacherId}`)
    return Array.isArray(response.data) ? response.data : (response.data?.feedback ?? [])
  } catch (error) {
    console.error('Get teacher feedback error:', error)
    return []
  }
}

// Local Storage Draft Storage Helpers
const DRAFT_STORAGE_KEY_PREFIX = 'campusresolve_feedback_draft_'

export const saveFeedbackDraftLocal = (studentId: string, draft: FeedbackDraft) => {
  try {
    if (!studentId || !draft.complaintId) return
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${studentId}_${draft.complaintId}`
    localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('Failed to save draft locally', e)
  }
}

export const loadFeedbackDraftLocal = (studentId: string, complaintId: string): FeedbackDraft | null => {
  try {
    if (!studentId || !complaintId) return null
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${studentId}_${complaintId}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as FeedbackDraft
  } catch (e) {
    console.error('Failed to load draft locally', e)
    return null
  }
}

export const clearFeedbackDraftLocal = (studentId: string, complaintId: string) => {
  try {
    if (!studentId || !complaintId) return
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${studentId}_${complaintId}`
    localStorage.removeItem(key)
  } catch (e) {
    console.error('Failed to clear draft', e)
  }
}

