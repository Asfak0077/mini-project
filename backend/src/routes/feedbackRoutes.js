const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Feedback = require('../models/Feedback')
const Teacher = require('../models/Teacher')
const Complaint = require('../models/Complaint')
const { inMemoryStore } = require('../utils/inMemoryStore')

const { sendFeedbackNotification, sendFeedbackAdminNotification } = require('../services/emailService')
const { createNotification } = require('../utils/notificationHelper')

// Submit Feedback (Student)
router.post('/', async (req, res) => {
    try {
        const { complaintId, studentName, studentId, department, teacherId, teacherName, rating, category, comment } = req.body

        if (!complaintId || !teacherId) {
            return res.status(400).json({ success: false, message: 'Complaint ID and Teacher ID are required.' })
        }

        if (mongoose.connection.readyState !== 1) {
            const feedback = inMemoryStore.createFeedback(req.body)
            return res.status(201).json({ success: true, message: 'Feedback submitted successfully', feedback })
        }

        // Check for duplicate feedback
        const existingFeedback = await Feedback.findOne({ complaintId })
        if (existingFeedback) {
            return res.status(400).json({ success: false, message: 'Feedback has already been submitted for this complaint.' })
        }

        // Check if complaint is resolved
        const complaint = await Complaint.findOne({ id: complaintId }) || await Complaint.findById(complaintId).catch(() => null)
        if (complaint && complaint.status !== 'Resolved') {
            return res.status(400).json({ success: false, message: 'Feedback can only be submitted for resolved complaints.' })
        }

        const feedback = new Feedback({
            complaintId,
            studentName,
            studentId,
            department,
            teacherId,
            teacherName,
            rating,
            category,
            comment,
            date: new Date()
        })

        await feedback.save()

        // Update complaint with feedback details
        if (complaint) {
            complaint.studentFeedback = comment
            complaint.satisfactionRating = rating
            await complaint.save()
        }

        // Find teacher info for email notification
        const teacher = await Teacher.findOne({ teacherId })

        await createNotification({
            userId: teacherId,
            userRole: 'teacher',
            type: 'feedback',
            title: 'New Feedback Received',
            message: `${studentName} provided feedback on ${complaint ? complaint.title : 'a complaint'}.`,
            metadata: {
                complaintId,
                complaintCategory: category,
                rating
            }
        })

        // Send Email Notifications (Faculty & Central Admin) asynchronously
        sendFeedbackNotification(feedback, teacher).catch((err) =>
            console.error('[FEEDBACK_FACULTY_EMAIL_ERROR]', err.message)
        )
        sendFeedbackAdminNotification(feedback, teacher).catch((err) =>
            console.error('[FEEDBACK_ADMIN_EMAIL_ERROR]', err.message)
        )

        res.status(201).json({ success: true, message: 'Feedback submitted successfully', feedback })
    } catch (error) {
        console.error('Error submitting feedback:', error)
        res.status(500).json({ success: false, message: 'Error submitting feedback', error: error.message })
    }
})

// Get All Feedback (Admin)
router.get('/', async (req, res) => {
    if (mongoose.connection.readyState !== 1) return res.json(inMemoryStore.getFeedback())
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 })
        res.json(feedbacks)
    } catch (error) {
        console.error('Error fetching feedback:', error)
        res.json(inMemoryStore.getFeedback())
    }
})

// Get Feedback by Student ID
router.get('/student/:studentId', async (req, res) => {
    const cleanId = (req.params.studentId || '').toLowerCase().trim()
    if (mongoose.connection.readyState !== 1) {
        const all = inMemoryStore.getFeedback()
        return res.json(all.filter(f =>
            (f.studentId && f.studentId.toLowerCase() === cleanId) ||
            (f.studentEmail && f.studentEmail.toLowerCase() === cleanId)
        ))
    }
    try {
        const { studentId } = req.params
        const feedbacks = await Feedback.find({
            $or: [
                { studentId },
                { studentEmail: studentId.toLowerCase() }
            ]
        }).sort({ createdAt: -1 })
        res.json(feedbacks)
    } catch (error) {
        console.error('Error fetching student feedback:', error)
        res.json([])
    }
})

// Get Feedback by Teacher ID
router.get('/teacher/:teacherId', async (req, res) => {
    if (mongoose.connection.readyState !== 1) return res.json(inMemoryStore.getFeedback(req.params.teacherId))
    try {
        const { teacherId } = req.params
        const feedbacks = await Feedback.find({ teacherId }).sort({ createdAt: -1 })
        res.json(feedbacks)
    } catch (error) {
        console.error('Error fetching teacher feedback:', error)
        res.json(inMemoryStore.getFeedback(req.params.teacherId))
    }
})

// Get Teachers by Department
router.get('/teachers/:department', async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        const teachers = inMemoryStore.getTeachers().filter(t => t.department === req.params.department)
        return res.json(teachers)
    }
    try {
        const { department } = req.params
        const teachers = await Teacher.find({ department, isActive: true }).select('name teacherId')
        res.json(teachers)
    } catch (error) {
        console.error('Error fetching teachers:', error)
        res.json([])
    }
})

module.exports = router
