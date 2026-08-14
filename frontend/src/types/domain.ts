export type UserRole = 'student' | 'admin' | 'teacher'

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'Urgent'
export type ComplaintStatus = 'Submitted' | 'Assigned' | 'In Progress' | 'Resolved' | 'Escalated'

export interface Teacher {
  id: string
  name: string
  email: string
  department: string
  designation: string
  activeComplaints: number
  profilePicture?: string
  profileImage?: string
}

export interface Complaint {
  id: string
  complaintId?: string
  ticketNumber?: string
  title: string
  category: string
  department: string
  description: string
  phone?: string
  priority: ComplaintPriority
  status: ComplaintStatus
  createdAt: string
  updatedAt?: string
  studentName: string
  studentEmail: string
  studentId: string
  assignedTeacherId?: string
  assignedTeacherName?: string
  assignedTeacherDepartment?: string
  assignedDate?: string
  assignmentHistory?: Array<{
    teacherId: string
    teacherName: string
    department: string
    assignedDate: string
    removedDate: string
    assignedBy: string
  }>
  resolutionDate?: string
  adminRemarks?: string
  resolutionNotes?: string
  satisfactionRating?: number
  attachments?: Array<{ filename: string; url?: string }>
}

export interface AnalyticsSummary {
  total: number
  pending: number
  inProgress: number
  resolved: number
  escalated: number
  averageResolutionHours: number
}
