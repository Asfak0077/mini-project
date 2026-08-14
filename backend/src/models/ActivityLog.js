const mongoose = require('mongoose')

const activityLogSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    action: { 
      type: String, 
      required: true, 
      enum: ['created', 'assigned', 'reassigned', 'status_changed', 'escalated', 'deleted', 'feedback_submitted'] 
    },
    performedBy: {
      userId: { type: String },
      name: { type: String },
      role: { type: String }
    },
    details: { type: mongoose.Schema.Types.Mixed },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
)

activityLogSchema.index({ complaintId: 1, createdAt: -1 })
activityLogSchema.index({ 'assignedTo.teacherId': 1 })

module.exports = mongoose.model('ActivityLog', activityLogSchema)
