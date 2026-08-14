const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    isPasswordSet: { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true },
    department: { type: String, default: 'General' },
    studentId: { type: String, default: '' },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    // Phone and contact
    phone: { type: String, default: '' },
    // Password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    // Profile
    profilePicture: { type: String, default: null },
    profileImage: { type: String, default: '' },
    semesterYear: { type: String, default: '' },
    bio: { type: String, default: '' },
    address: { type: String, default: '' },
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
    // Stats
    totalComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

studentSchema.index({ studentId: 1 })

module.exports = mongoose.model('Student', studentSchema)
