const mongoose = require('mongoose')

const emailLogSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true,
      index: true
    },
    subject: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'complaint_submitted',
        'complaint_admin_alert',
        'complaint_assigned',
        'status_changed',
        'complaint_resolved',
        'feedback_faculty',
        'feedback_admin',
        'password_reset_otp',
        'login_alert',
        'account_verification',
        'system_alert',
        'other'
      ],
      default: 'other',
      index: true
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
      index: true
    },
    messageId: {
      type: String
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('EmailLog', emailLogSchema)
