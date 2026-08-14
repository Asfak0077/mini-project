const mongoose = require('mongoose')

const allowedEmailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('AllowedEmail', allowedEmailSchema)
