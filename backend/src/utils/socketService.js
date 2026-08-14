let io = null

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 */
const initSocketIO = (server) => {
    const { Server } = require('socket.io')

    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || 'http://localhost:5173',
                'http://localhost:5174',
                'http://127.0.0.1:5173'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        }
    })

    io.on('connection', (socket) => {
        console.log(`✓ Socket connected: ${socket.id}`)

        // Join user-specific room
        socket.on('join', (userId) => {
            socket.join(`user-${userId}`)
            console.log(`User ${userId} joined their room`)
        })

        // Join role-specific room (admin, teacher, student)
        socket.on('join_role', (role) => {
            socket.join(`${role}-room`)
            console.log(`Socket joined ${role} room`)
        })

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`)
        })
    })

    return io
}

/**
 * Get Socket.io instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initSocketIO first.')
    }
    return io
}

/**
 * Emit event to specific user
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToUser = (userId, event, data) => {
    if (!io) return
    io.to(`user-${userId}`).emit(event, data)
}

/**
 * Emit event to all users of a specific role
 * @param {string} role - User role (admin, teacher, student)
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToRole = (role, event, data) => {
    if (!io) return
    io.to(`${role}-room`).emit(event, data)
}

/**
 * Emit event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToAll = (event, data) => {
    if (!io) return
    io.emit(event, data)
}

module.exports = {
    initSocketIO,
    getIO,
    emitToUser,
    emitToRole,
    emitToAll
}
