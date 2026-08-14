const mongoose = require('mongoose')

const chatLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: false, // Optional, depending on if user is logged in
    },
    userRole: {
      type: String,
      enum: ['student', 'teacher', 'admin', 'guest'],
      default: 'guest'
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['user', 'bot'],
          required: true
        },
        text: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
)

module.exports = mongoose.model('ChatLog', chatLogSchema)
