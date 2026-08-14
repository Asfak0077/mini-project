const mongoose = require('mongoose')

const teacherSchema = new mongoose.Schema(
  {
    teacherId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, default: null, unique: true, sparse: true },
    phone: { type: String, default: '' },
    department: { type: String, required: true },
    designation: { type: String, default: 'Professor' },
    activeComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    passwordHash: { type: String, required: true },
    isPasswordSet: { type: Boolean, default: false },
    role: { type: String, enum: ['teacher'], default: 'teacher' },
    // Password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    // Profile
    profilePicture: { type: String, default: null },
    profileImage: { type: String, default: '' },
    specialization: { type: String, default: '' },
    officeLocation: { type: String, default: '' },
    bio: { type: String, default: '' },
    // Average resolution time in hours
    avgResolutionTime: { type: Number, default: 0 },
    // Preferences
    emailNotifications: { type: Boolean, default: true },
    preferences: {
      darkMode: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
      emailNotifications: { type: Boolean, default: true }
    },
    // Activity History
    activityHistory: [
      {
        action: { type: String, required: true },
        details: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

teacherSchema.index({ department: 1 })

module.exports = mongoose.model('Teacher', teacherSchema)
