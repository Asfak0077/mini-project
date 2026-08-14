const express = require('express')
const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const jwt = require('jsonwebtoken')
const { inMemoryStore } = require('../utils/inMemoryStore')

const router = express.Router()

// Middleware to get authenticated user
const getAuthUser = (req) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return null
    try {
        return jwt.verify(token, process.env.SECRET_KEY || 'dev-secret')
    } catch {
        return null
    }
}

// Get user's notifications (paginated)
router.get('/', async (req, res) => {
    try {
        const authUser = getAuthUser(req)
        if (!authUser || !authUser.id) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        if (mongoose.connection.readyState !== 1) {
            const list = inMemoryStore.getNotifications(authUser.id)
            return res.json({ notifications: list, total: list.length, hasMore: false })
        }

        const limit = parseInt(req.query.limit) || 20
        const skip = parseInt(req.query.skip) || 0

        const notifications = await Notification.find({
            userId: authUser.id
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)

        const total = await Notification.countDocuments({ userId: authUser.id })

        res.json({
            notifications,
            total,
            hasMore: skip + limit < total
        })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        const authUser = getAuthUser(req)
        const list = authUser ? inMemoryStore.getNotifications(authUser.id) : []
        res.json({ notifications: list, total: list.length, hasMore: false })
    }
})

// Get unread count
router.get('/unread-count', async (req, res) => {
    try {
        const authUser = getAuthUser(req)
        if (!authUser || !authUser.id) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        if (mongoose.connection.readyState !== 1) {
            const list = inMemoryStore.getNotifications(authUser.id)
            const count = list.filter(n => !n.read).length
            return res.json({ count })
        }

        const count = await Notification.countDocuments({
            userId: authUser.id,
            read: false
        })

        res.json({ count })
    } catch (error) {
        console.error('Error fetching unread count:', error)
        res.json({ count: 0 })
    }
})

// Mark single notification as read
router.post('/mark-read/:id', async (req, res) => {
    try {
        const authUser = getAuthUser(req)
        if (!authUser || !authUser.id) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        if (mongoose.connection.readyState !== 1) {
            const notif = inMemoryStore.markNotificationRead(req.params.id)
            return res.json({ notification: notif })
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: authUser.id },
            { read: true },
            { new: true }
        )

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' })
        }

        res.json({ notification })
    } catch (error) {
        console.error('Error marking notification as read:', error)
        res.status(500).json({ message: 'Failed to mark notification as read' })
    }
})

// Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
    try {
        const authUser = getAuthUser(req)
        if (!authUser || !authUser.id) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        if (mongoose.connection.readyState !== 1) {
            inMemoryStore.markAllNotificationsRead(authUser.id)
            return res.json({ message: 'All notifications marked as read' })
        }

        await Notification.updateMany(
            { userId: authUser.id, read: false },
            { read: true }
        )

        res.json({ message: 'All notifications marked as read' })
    } catch (error) {
        console.error('Error marking all notifications as read:', error)
        res.json({ message: 'All notifications marked as read' })
    }
})

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const authUser = getAuthUser(req)
        if (!authUser || !authUser.id) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: authUser.id
        })

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' })
        }

        res.json({ message: 'Notification deleted' })
    } catch (error) {
        console.error('Error deleting notification:', error)
        res.status(500).json({ message: 'Failed to delete notification' })
    }
})

module.exports = router
