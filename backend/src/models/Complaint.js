const mongoose = require('mongoose')

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, default: 'Untitled Complaint' },
    category: { type: String, required: true },
    department: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'Urgent'], default: 'medium' },
    status: {
      type: String,
      enum: ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Escalated'],
      default: 'Submitted'
    },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentId: { type: String, required: true },
    studentPhone: { type: String, default: '' },
    assignedTeacherId: { type: String, default: '' },
    assignedTeacherName: { type: String, default: '' },
    assignedTeacherEmail: { type: String, default: '' },
    assignedTeacherDepartment: { type: String, default: '' },
    assignedDate: { type: Date, default: null },
    // Track reassignment history to prevent data loss
    assignmentHistory: [
      {
        teacherId: String,
        teacherName: String,
        teacherEmail: String,
        department: String,
        assignedDate: { type: Date, default: Date.now },
        removedDate: { type: Date, default: null },
        assignedBy: { type: String, default: 'Admin' }
      }
    ],
    adminRemarks: { type: String, default: '' },
    // File attachments
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    // Resolution tracking
    resolutionTimeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: String,
        notes: String
      }
    ],
    resolutionNotes: { type: String, default: '' },
    resolutionDate: { type: Date, default: null },
    // Feedback
    studentFeedback: { type: String, default: '' },
    satisfactionRating: { type: Number, min: 1, max: 5, default: null },
    // Notifications
    notificationsSent: {
      submitted: { type: Boolean, default: false },
      assigned: { type: Boolean, default: false },
      inProgress: { type: Boolean, default: false },
      resolved: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
)

// Index for better query performance
complaintSchema.index({ studentId: 1, createdAt: -1 })
complaintSchema.index({ status: 1, priority: 1 })
complaintSchema.index({ assignedTeacherId: 1 })
complaintSchema.index({ department: 1, createdAt: -1 }) // For department-based filtering

module.exports = mongoose.model('Complaint', complaintSchema)
