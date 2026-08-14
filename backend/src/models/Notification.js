const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        userRole: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
        type: {
            type: String,
            required: true
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        read: { type: Boolean, default: false, index: true },
        metadata: {
            complaintId: { type: String },
            complaintCategory: { type: String },
            oldStatus: { type: String },
            newStatus: { type: String },
            assignedTeacherName: { type: String },
            rating: { type: Number },
            supportTicketId: { type: String },
            supportCategory: { type: String },
            supportStatus: { type: String }
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
    },
    { timestamps: true }
)

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

// TTL index to auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('Notification', notificationSchema)
