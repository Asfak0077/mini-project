import api from './apiClient'

export interface FeedbackPayload {
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
  rating: number
  category: string
  comment: string
  comments?: string
  createdAt?: string
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

export const getAllFeedback = async () => {
  try {
    const response = await api.get('/feedback')
    return Array.isArray(response.data) ? response.data : (response.data?.feedback ?? [])
  } catch (error) {
    console.error('Get all feedback error:', error)
    return []
  }
}

export const getStudentFeedback = async (studentId: string) => {
  if (!studentId) return []
  try {
    const response = await api.get(`/feedback/student/${studentId}`)
    return Array.isArray(response.data) ? response.data : (response.data?.feedback ?? [])
  } catch (error) {
    console.error('Get student feedback error:', error)
    return []
  }
}

export const getTeacherFeedback = async (teacherId: string) => {
  if (!teacherId) return []
  try {
    const response = await api.get(`/feedback/teacher/${teacherId}`)
    return Array.isArray(response.data) ? response.data : (response.data?.feedback ?? [])
  } catch (error) {
    console.error('Get teacher feedback error:', error)
    return []
  }
}
