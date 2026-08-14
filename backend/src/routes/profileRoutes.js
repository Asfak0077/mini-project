const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { protect } = require('../middleware/authMiddleware')
const Student = require('../models/Student')
const Teacher = require('../models/Teacher')
const { inMemoryStore } = require('../utils/inMemoryStore')

const router = express.Router()

// Ensure uploads/profile directory exists
const profileUploadDir = path.join(__dirname, '../../uploads/profile')
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true })
}

// Storage configuration for profile photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

// File filter to only allow images (jpg, jpeg, png, webp)
const fileFilter = (req, file, cb) => {
  const allowedExts = /^\.(jpeg|jpg|png|webp)$/i
  const allowedMime = /^image\/(jpeg|jpg|png|webp)$/i

  const ext = path.extname(file.originalname).toLowerCase()
  const isExtAllowed = allowedExts.test(ext)
  const isMimeAllowed = allowedMime.test(file.mimetype)

  if (isExtAllowed && isMimeAllowed) {
    return cb(null, true)
  } else {
    return cb(new Error('Invalid image format. Please upload JPG, JPEG, PNG, or WebP.'))
  }
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
})

// Helper middleware to handle multer errors gracefully
const uploadMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image too large. Maximum size limit is 5MB.' })
      }
      return res.status(400).json({ success: false, message: err.message || 'Image upload failed.' })
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0]
    }
    next()
  })
}

// Helper to calculate profile completion percentage
const calculateCompletion = (user, role) => {
  if (!user) return 80
  let fields = []
  
  if (role === 'admin') {
    fields = [user.name, user.email, user.role, user.profilePicture]
  } else if (role === 'teacher') {
    fields = [
      user.teacherId,
      user.name,
      user.email,
      user.phone,
      user.department,
      user.designation,
      user.specialization,
      user.officeLocation,
      user.profilePicture,
      user.bio
    ]
  } else {
    // student
    fields = [
      user.name,
      user.email,
      user.phone,
      user.department,
      user.studentId,
      user.semesterYear,
      user.profilePicture,
      user.bio,
      user.address
    ]
  }

  const filled = fields.filter(val => val !== undefined && val !== null && String(val || '').trim() !== '').length
  return Math.max(20, Math.round((filled / (fields.length || 1)) * 100))
}

const formatUserResponse = (user, role) => {
  const completionPercentage = calculateCompletion(user, role)
  const avatarUrl = user.profilePicture || user.profileImage || null
  return {
    id: role === 'teacher' ? (user.teacherId || user.id || (user._id ? user._id.toString() : '')) : (user._id ? user._id.toString() : (user.id || user.studentId || '')),
    name: user.name,
    email: user.email,
    role: role,
    phone: user.phone || '',
    department: user.department || '',
    studentId: user.studentId || '',
    teacherId: user.teacherId || '',
    designation: user.designation || '',
    specialization: user.specialization || '',
    officeLocation: user.officeLocation || '',
    semesterYear: user.semesterYear || '',
    bio: user.bio || '',
    address: user.address || '',
    profilePicture: avatarUrl,
    profileImage: avatarUrl || '',
    preferences: user.preferences || { darkMode: false, language: 'en', emailNotifications: true },
    activityHistory: user.activityHistory || [],
    completionPercentage
  }
}

// ============ GET PROFILE (/api/profile, /api/profile/me, /api/users/profile) ============
const getProfileHandler = async (req, res) => {
  try {
    const user = req.user
    const role = req.userRole
    res.json({
      success: true,
      user: formatUserResponse(user, role)
    })
  } catch (error) {
    console.error('Fetch profile error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch profile' })
  }
}

// ============ PUBLIC PROFILE ROUTE (/api/profile/public/:userId) ============
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const Complaint = require('../models/Complaint')
    const mongoose = require('mongoose')
    const { inMemoryStore } = require('../utils/inMemoryStore')
    let user = null
    let role = 'student'

    if (mongoose.connection.readyState !== 1) {
      user = inMemoryStore.findStudentById(userId)
      if (!user) {
        user = inMemoryStore.findTeacherByIdOrEmail(userId)
        if (user) role = 'teacher'
      }
      if (!user) {
        return res.status(404).json({ success: false, message: 'Profile credential not found.' })
      }
      const complaints = inMemoryStore.getComplaints()
      const total = complaints.length
      const resolved = complaints.filter(c => c.status === 'Resolved').length
      const active = complaints.filter(c => c.status !== 'Resolved').length
      return res.json({
        success: true,
        profile: {
          id: user.id || user.studentId || user.teacherId,
          mongoId: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role || role,
          department: user.department || 'General',
          studentId: user.studentId || '',
          teacherId: user.teacherId || '',
          designation: user.designation || '',
          specialization: user.specialization || '',
          profilePicture: user.profilePicture || null,
          bio: user.bio || '',
          createdAt: user.createdAt,
          complaintStats: { total, resolved, active },
          isVerified: true
        }
      })
    }

    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await Student.findById(userId).select('-password -otp -otpExpires')
    }
    if (!user) {
      user = await Student.findOne({ studentId: userId }).select('-password -otp -otpExpires')
    }

    if (!user) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await Teacher.findById(userId).select('-password -otp -otpExpires')
      }
      if (!user) {
        user = await Teacher.findOne({ teacherId: userId }).select('-password -otp -otpExpires')
      }
      if (user) role = 'teacher'
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Access Denied: Profile credential not found.' })
    }

    let complaintStats = { total: 0, resolved: 0, active: 0 }
    try {
      const studentIdQuery = user.studentId || user._id.toString()
      const complaints = await Complaint.find({
        $or: [
          { studentId: studentIdQuery },
          { studentEmail: user.email },
          { assignedTeacherId: user.teacherId }
        ]
      })

      complaintStats.total = complaints.length
      complaintStats.resolved = complaints.filter(c => c.status === 'Resolved').length
      complaintStats.active = complaints.filter(c => c.status !== 'Resolved').length
    } catch (e) {
      console.warn('Error calculating stats:', e)
    }

    const avatarUrl = user.profilePicture || user.profileImage || null

    res.json({
      success: true,
      profile: {
        id: user.studentId || user.teacherId || user._id.toString(),
        mongoId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || role,
        department: user.department || 'General',
        studentId: user.studentId || '',
        teacherId: user.teacherId || '',
        designation: user.designation || '',
        specialization: user.specialization || '',
        profilePicture: avatarUrl,
        bio: user.bio || '',
        createdAt: user.createdAt,
        complaintStats,
        isVerified: true
      }
    })
  } catch (error) {
    console.error('Public profile error:', error)
    res.status(500).json({ success: false, message: 'Failed to retrieve profile credentials.' })
  }
})

router.get('/', protect, getProfileHandler)
router.get('/me', protect, getProfileHandler)
router.get('/profile', protect, getProfileHandler)

// ============ UPDATE PROFILE (/api/profile/update, /api/profile, /api/users/profile) ============
const updateProfileHandler = async (req, res) => {
  try {
    const user = req.user
    const role = req.userRole
    const body = req.body

    if (body.name !== undefined) user.name = body.name
    if (body.phone !== undefined) user.phone = body.phone
    if (body.department !== undefined) user.department = body.department
    if (body.bio !== undefined) user.bio = body.bio
    if (body.profileImage !== undefined) {
      user.profileImage = body.profileImage
      user.profilePicture = body.profileImage
    }
    if (body.profilePicture !== undefined) {
      user.profilePicture = body.profilePicture
      user.profileImage = body.profilePicture
    }

    if (role === 'teacher') {
      if (body.designation !== undefined) user.designation = body.designation
      if (body.specialization !== undefined) user.specialization = body.specialization
      if (body.officeLocation !== undefined) user.officeLocation = body.officeLocation
    } else {
      if (body.studentId !== undefined) user.studentId = body.studentId
      if (body.semesterYear !== undefined) user.semesterYear = body.semesterYear
      if (body.address !== undefined) user.address = body.address
    }

    if (body.preferences) {
      user.preferences = {
        darkMode: body.preferences.darkMode !== undefined ? body.preferences.darkMode : (user.preferences?.darkMode ?? false),
        language: body.preferences.language !== undefined ? body.preferences.language : (user.preferences?.language ?? 'en'),
        emailNotifications: body.preferences.emailNotifications !== undefined ? body.preferences.emailNotifications : (user.preferences?.emailNotifications ?? true)
      }
      user.emailNotifications = user.preferences.emailNotifications
    }

    const fieldsUpdated = Object.keys(body).filter(k => k !== 'preferences' && body[k] !== undefined)
    const details = fieldsUpdated.length > 0 ? `Updated fields: ${fieldsUpdated.join(', ')}` : 'Updated settings/preferences'
    
    if (!user.activityHistory) {
      user.activityHistory = []
    }
    user.activityHistory.push({
      action: 'profile_updated',
      details,
      timestamp: new Date()
    })

    if (typeof user.save === 'function') {
      await user.save()
    } else {
      if (role === 'teacher') {
        const teacherObj = inMemoryStore.findTeacherByIdOrEmail(user.teacherId || user.id || user.email)
        if (teacherObj) Object.assign(teacherObj, user)
      } else {
        const studentObj = inMemoryStore.findStudentById(user.id || user._id || user.studentId) || inMemoryStore.findStudentByEmail(user.email)
        if (studentObj) Object.assign(studentObj, user)
      }
    }

    res.json({
      success: true,
      message: 'Profile Updated Successfully',
      user: formatUserResponse(user, role)
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ success: false, message: 'Failed to update profile' })
  }
}

router.put('/update', protect, updateProfileHandler)
router.put('/', protect, updateProfileHandler)
router.put('/profile', protect, updateProfileHandler)

// ============ UPLOAD IMAGE HANDLER ============
const handleAvatarUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded or file type is not supported.' })
    }

    const user = req.user
    const role = req.userRole
    const imageUrl = `/uploads/profile/${req.file.filename}`

    // Remove old avatar from server disk if it exists
    const currentImg = user.profilePicture || user.profileImage
    if (currentImg && typeof currentImg === 'string' && currentImg.startsWith('/uploads/')) {
      const relativePath = currentImg.replace(/^\/uploads\//, '')
      const oldPath = path.join(__dirname, '../../uploads', relativePath)
      const oldPathAlt = path.join(process.cwd(), 'uploads', relativePath)
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath)
        } catch (err) {
          console.warn('Could not delete old avatar file:', err.message)
        }
      } else if (fs.existsSync(oldPathAlt)) {
        try {
          fs.unlinkSync(oldPathAlt)
        } catch (err) {
          console.warn('Could not delete old avatar file:', err.message)
        }
      }
    }

    user.profilePicture = imageUrl
    user.profileImage = imageUrl

    if (!user.activityHistory) {
      user.activityHistory = []
    }
    user.activityHistory.push({
      action: 'avatar_updated',
      details: 'Uploaded a new profile picture',
      timestamp: new Date()
    })

    if (typeof user.save === 'function') {
      await user.save()
    } else {
      if (role === 'teacher') {
        const teacherObj = inMemoryStore.findTeacherByIdOrEmail(user.teacherId || user.id || user.email)
        if (teacherObj) Object.assign(teacherObj, user)
      } else {
        const studentObj = inMemoryStore.findStudentById(user.id || user._id || user.studentId) || inMemoryStore.findStudentByEmail(user.email)
        if (studentObj) Object.assign(studentObj, user)
      }
    }

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: imageUrl,
      profileImage: imageUrl,
      user: formatUserResponse(user, role)
    })
  } catch (error) {
    console.error('Upload photo error:', error)
    res.status(500).json({ success: false, message: error.message || 'Failed to upload photo' })
  }
}

router.post('/upload-image', protect, uploadMiddleware, handleAvatarUpload)
router.post('/upload-photo', protect, uploadMiddleware, handleAvatarUpload)
router.post('/upload-avatar', protect, uploadMiddleware, handleAvatarUpload)
router.post('/profile/upload-image', protect, uploadMiddleware, handleAvatarUpload)

module.exports = router
