import apiClient from './apiClient'
import { AnalyticsSummary, Complaint, ComplaintPriority, ComplaintStatus } from '../types/domain'

export interface ComplaintPayload {
  title: string
  category: string
  department: string
  teacherId?: string
  assignedTeacherId?: string
  description: string
  priority: ComplaintPriority
  studentName: string
  studentEmail: string
  studentId: string
  phone?: string
  anonymous?: boolean
  attachments?: Array<{ filename: string; url?: string }>
}

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || error?.message || fallback
}

const normalizeComplaint = (input: any): Complaint => ({
  id: input.id ?? input._id ?? '',
  complaintId: input.complaintId ?? input.ticketNumber ?? '',
  ticketNumber: input.complaintId ?? input.ticketNumber ?? '',
  title: input.title ?? 'Untitled Complaint',
  category: input.category,
  department: input.department,
  description: input.description,
  priority: (input.priority ?? 'medium') as ComplaintPriority,
  status: (input.status ?? 'Submitted') as ComplaintStatus,
  createdAt: input.createdAt ?? new Date().toISOString(),
  updatedAt: input.updatedAt,
  studentName: input.studentName,
  studentEmail: input.studentEmail,
  studentId: input.studentId,
  phone: input.phone ?? input.studentPhone ?? '',
  assignedTeacherId: input.assignedTeacherId,
  assignedTeacherName: input.assignedTeacherName,
  assignedTeacherDepartment: input.assignedTeacherDepartment,
  assignedDate: input.assignedDate,
  assignmentHistory: input.assignmentHistory ?? [],
  adminRemarks: input.adminRemarks,
  resolutionNotes: input.resolutionNotes,
  resolutionDate: input.resolutionDate,
  attachments: input.attachments ?? []
})

// Fetch all complaints (Admin)
export const fetchComplaints = async (): Promise<Complaint[]> => {
  try {
    const { data } = await apiClient.get('/complaints/admin/all-complaints?limit=1000')
    const list = Array.isArray(data?.complaints) ? data.complaints : Array.isArray(data) ? data : []
    return list.map(normalizeComplaint)
  } catch (error) {
    console.error('Fetch all complaints error:', error)
    throw new Error(getErrorMessage(error, 'Unable to fetch complaints from database.'))
  }
}

// Fetch complaints for a specific student
export const fetchStudentComplaints = async (studentId: string): Promise<Complaint[]> => {
  if (!studentId) return []
  try {
    const { data } = await apiClient.get(`/complaints/student/${studentId}`)
    const list = Array.isArray(data?.complaints) ? data.complaints : Array.isArray(data) ? data : []
    return list.map(normalizeComplaint)
  } catch (error) {
    console.error('Fetch student complaints error:', error)
    throw new Error(getErrorMessage(error, 'Unable to load student complaints.'))
  }
}

// Fetch complaints assigned to a teacher
export const fetchTeacherComplaints = async (teacherId: string): Promise<Complaint[]> => {
  if (!teacherId) return []
  try {
    const { data } = await apiClient.get(`/complaints/teacher/${teacherId}`)
    const list = Array.isArray(data?.complaints) ? data.complaints : Array.isArray(data) ? data : []
    return list.map(normalizeComplaint)
  } catch (error) {
    console.error('Fetch teacher complaints error:', error)
    throw new Error(getErrorMessage(error, 'Unable to load teacher complaints.'))
  }
}

// Fetch complaints for a specific department (unassigned pool)
export const fetchDepartmentComplaints = async (department: string, teacherId?: string): Promise<Complaint[]> => {
  try {
    if (teacherId) {
      const { data } = await apiClient.get(`/complaints/teacher/${teacherId}`)
      const list = Array.isArray(data?.complaints) ? data.complaints : Array.isArray(data) ? data : []
      const all = list.map(normalizeComplaint)
      return all.filter((c: Complaint) => !c.assignedTeacherId)
    }
    const { data } = await apiClient.get('/complaints/admin/all-complaints?limit=500')
    const list = Array.isArray(data?.complaints) ? data.complaints : Array.isArray(data) ? data : []
    const all = list.map(normalizeComplaint)
    return all.filter((c: Complaint) => c.department === department && !c.assignedTeacherId)
  } catch (error) {
    console.error('Fetch department complaints error:', error)
    throw new Error(getErrorMessage(error, 'Unable to load department complaints.'))
  }
}

// Submit a new complaint
export const submitComplaint = async (payload: ComplaintPayload): Promise<Complaint> => {
  try {
    const { data } = await apiClient.post('/complaints/create', {
      ...payload,
      studentData: {
        name: payload.studentName,
        email: payload.studentEmail,
        studentId: payload.studentId,
        phone: payload.phone
      }
    })
    if (!data?.complaint) {
      throw new Error('Database did not return created complaint record')
    }
    return normalizeComplaint(data.complaint)
  } catch (error) {
    console.error('Submit complaint error:', error)
    throw new Error(getErrorMessage(error, 'Complaint could not be submitted. Please try again.'))
  }
}

// Update complaint status (Teacher / Admin)
export const updateComplaintStatus = async (id: string, status: ComplaintStatus, notes?: string): Promise<Complaint> => {
  try {
    const { data } = await apiClient.put(`/complaints/${id}/update-status`, {
      newStatus: status,
      resolutionNotes: notes,
      updatedBy: 'Teacher'
    })
    if (!data?.complaint) {
      throw new Error('Database did not return updated complaint record')
    }
    return normalizeComplaint(data.complaint)
  } catch (error) {
    console.error('Update complaint status error:', error)
    throw new Error(getErrorMessage(error, 'Failed to update complaint status.'))
  }
}

// Delete complaint (Student only)
export const deleteComplaint = async (id: string, studentId: string) => {
  try {
    const { data } = await apiClient.delete(`/complaints/${id}`, {
      data: { studentId }
    })
    return data
  } catch (error) {
    console.error('Delete complaint error:', error)
    throw new Error(getErrorMessage(error, 'Failed to delete complaint.'))
  }
}

// Assign complaint to teacher (Admin)
export const assignComplaint = async (id: string, teacherId: string): Promise<Complaint> => {
  try {
    const { data } = await apiClient.put(`/complaints/${id}/assign`, { teacherId })
    const assignedComplaint = normalizeComplaint(data.complaint ?? data)
    return assignedComplaint
  } catch (error) {
    console.error('Assign complaint error:', error)
    throw new Error(getErrorMessage(error, 'Assignment failed. Please try again.'))
  }
}

// Fetch dashboard analytics summary
export const fetchAnalytics = async (): Promise<AnalyticsSummary> => {
  try {
    const complaints = (await fetchComplaints()) ?? []
    const total = complaints.length
    const pending = complaints.filter((item) => item.status === 'Submitted').length
    const inProgress = complaints.filter((item) => item.status === 'In Progress' || item.status === 'Assigned').length
    const resolved = complaints.filter((item) => item.status === 'Resolved').length
    const escalated = complaints.filter((item) => item.status === 'Escalated').length

    return {
      total,
      pending,
      inProgress,
      resolved,
      escalated,
      averageResolutionHours: total === 0 ? 0 : Number(((resolved / total) * 24).toFixed(1))
    }
  } catch (error) {
    console.error('Fetch analytics error:', error)
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      escalated: 0,
      averageResolutionHours: 0
    }
  }
}

export interface ActivityLogEntry {
  _id: string
  action: string
  performedBy: { userId: string; name: string; role: string }
  complaintId?: { _id: string; complaintId?: string; ticketNumber?: string; title?: string; category?: string; department?: string; studentName?: string }
  details?: any
  notes?: string
  createdAt: string
}

export const fetchActivityLogs = async (limit = 20): Promise<ActivityLogEntry[]> => {
  try {
    const { data } = await apiClient.get(`/complaints/admin/activity-logs?limit=${limit}`)
    return data.logs ?? []
  } catch (error) {
    console.error('Fetch activity logs error:', error)
    return []
  }
}

export const fetchTeacherActivityLogs = async (teacherId: string, limit = 15): Promise<ActivityLogEntry[]> => {
  try {
    const { data } = await apiClient.get(`/complaints/teacher/${teacherId}/activity-logs?limit=${limit}`)
    return data.logs ?? []
  } catch (error) {
    console.error('Fetch teacher activity logs error:', error)
    return []
  }
}
