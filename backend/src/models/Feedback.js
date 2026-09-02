const mongoose = require('mongoose')

const feedbackSchema = new mongoose.Schema(
    {
        complaintId: { type: String, required: true },
        studentName: { type: String, required: true },
        studentId: { type: String, required: true },
        studentEmail: { type: String, default: '' },
        department: { type: String, required: true },
        teacherId: { type: String, required: true },
        teacherName: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 }, // Overall rating
        overallRating: { type: Number, min: 1, max: 5 },
        resolutionQuality: { type: Number, min: 1, max: 5, default: 4 },
        responseTime: { type: Number, min: 1, max: 5, default: 4 },
        communication: { type: Number, min: 1, max: 5, default: 4 },
        staffSupport: { type: Number, min: 1, max: 5, default: 4 },
        resolutionStatus: {
            type: String,
            enum: ['Yes, completely resolved', 'Partially resolved', 'No, the issue still exists'],
            default: 'Yes, completely resolved'
        },
        unresolvedReason: { type: String, default: '' },
        positiveTags: [{ type: String }],
        improvementTags: [{ type: String }],
        recommendationScore: { type: Number, min: 0, max: 10, default: 10 },
        isAnonymous: { type: Boolean, default: false },
        category: { type: String, default: 'General' },
        comment: { type: String, default: '' },
        feedbackText: { type: String, default: '' },
        aiAnalysis: {
            sentiment: { type: String, enum: ['Positive', 'Neutral', 'Mixed', 'Negative'], default: 'Neutral' },
            confidence: { type: Number, default: 0.9 },
            topics: [{ type: String }],
            resolutionQuality: { type: String, default: 'Positive' },
            responseTime: { type: String, default: 'Moderate' },
            communication: { type: String, default: 'Moderate' },
            summary: { type: String, default: '' },
            suggestedFollowUp: { type: String, default: '' },
            isLowRatingAlert: { type: Boolean, default: false }
        },
        date: { type: Date, default: Date.now }
    },
    { timestamps: true }
)

// Index for checking duplicates efficiently
feedbackSchema.index({ complaintId: 1 }, { unique: true })

module.exports = mongoose.model('Feedback', feedbackSchema)

