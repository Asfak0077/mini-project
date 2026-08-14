const mapComplaint = (doc) => ({
  id: doc._id ? doc._id.toString() : (doc.id || ''),
  complaintId: doc.complaintId || doc.ticketNumber || (doc._id ? `CR-${String(doc._id).slice(-3).toUpperCase()}` : 'CR-001'),
  ticketNumber: doc.complaintId || doc.ticketNumber || (doc._id ? `CR-${String(doc._id).slice(-3).toUpperCase()}` : 'CR-001'),
  title: doc.title || 'Untitled Complaint',
  category: doc.category,
  department: doc.department,
  description: doc.description,
  priority: doc.priority,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  studentName: doc.studentName,
  studentEmail: doc.studentEmail,
  studentId: doc.studentId,
  phone: doc.phone,
  assignedTeacherId: doc.assignedTeacherId || undefined,
  assignedTeacherName: doc.assignedTeacherName || undefined,
  assignedTeacherDepartment: doc.assignedTeacherDepartment || undefined,
  assignedDate: doc.assignedDate || undefined,
  assignmentHistory: doc.assignmentHistory || [],
  adminRemarks: doc.adminRemarks || undefined,
  resolutionTimeline: doc.resolutionTimeline || [],
  resolutionNotes: doc.resolutionNotes || '',
  resolutionDate: doc.resolutionDate || undefined,
  satisfactionRating: doc.satisfactionRating || null,
  studentFeedback: doc.studentFeedback || '',
  attachments: doc.attachments || []
})

const mapTeacher = (doc) => ({
  id: doc.teacherId,
  name: doc.name,
  email: doc.email,
  department: doc.department,
  designation: doc.designation,
  activeComplaints: doc.activeComplaints,
  resolvedComplaints: doc.resolvedComplaints,
  lastLogin: doc.lastLogin,
  phone: doc.phone
})

module.exports = {
  mapComplaint,
  mapTeacher
}
