const mongoose = require('mongoose')

const feedbackSchema = new mongoose.Schema(
    {
        complaintId: { type: String, required: true },
        studentName: { type: String, required: true },
        studentId: { type: String, required: true },
        department: { type: String, required: true },
        teacherId: { type: String, required: true },
        teacherName: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        category: { type: String, required: true }, // Teaching Quality, Resolution Satisfaction, etc.
        comment: { type: String, required: false },
        date: { type: Date, default: Date.now }
    },
    { timestamps: true }
)

// Index for checking duplicates efficiently
feedbackSchema.index({ complaintId: 1 }, { unique: true })

module.exports = mongoose.model('Feedback', feedbackSchema)
