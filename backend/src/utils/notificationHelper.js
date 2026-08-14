const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const { inMemoryStore } = require('./inMemoryStore')

// Optional: sync notifications to Supabase (the notifications table exists there)
let supabase = null
try {
    const sc = require('./supabaseClient')
    supabase = sc.supabase
} catch (e) {
    // Supabase not configured, skip sync
}

/**
 * Create a notification for a user
 * @param {Object} params
 * @param {string} params.userId - User ID (student ID or teacher ID)
 * @param {string} params.userRole - 'student' | 'teacher' | 'admin'
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {Object} params.metadata - Additional metadata
 */
const createNotification = async ({
    userId,
    userRole,
    type,
    title,
    message,
    metadata = {}
}) => {
    try {
        // Primary: try MongoDB if connected
        if (mongoose.connection.readyState === 1) {
            const notification = new Notification({
                userId,
                userRole,
                type,
                title,
                message,
                metadata
            })
            await notification.save()
            return { success: true, notification }
        }

        // Fallback: persistent in-memory store (backed by JSON file)
        const notif = inMemoryStore.createNotification({
            userId,
            userRole,
            type,
            title,
            message,
            metadata
        })

        // Also sync to Supabase notifications table if available
        if (supabase) {
            try {
                await supabase.from('notifications').insert({
                    user_id: userId,
                    role: userRole,
                    type,
                    title,
                    message,
                    is_read: false,
                    read: false,
                    metadata: metadata && Object.keys(metadata).length > 0 ? metadata : null,
                    created_at: new Date().toISOString()
                })
            } catch (sbErr) {
                // Supabase sync is best-effort, don't fail the notification
                console.warn('Supabase notification sync failed:', sbErr.message)
            }
        }

        return { success: true, notification: notif }
    } catch (error) {
        console.error('Error creating notification:', error)
        return { success: false, error }
    }
}

module.exports = {
    createNotification
}
