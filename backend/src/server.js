require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')
const morgan = require('morgan')
const { connectDatabase } = require('./config/db')
const authRoutes = require('./routes/authRoutesEnhanced')
const complaintRoutes = require('./routes/complaintRoutesEnhanced')
const teacherRoutes = require('./routes/teacherRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const { seedDemoData } = require('./utils/seedDemoData')
const { seedAllowedEmails } = require('./utils/seedAllowedEmails')
const { initSocketIO } = require('./utils/socketService')
const { initEscalationWorker } = require('./utils/escalationWorker')

const app = express()
const port = Number(process.env.PORT || 5001)

app.use(cors())
app.use(
  require('helmet')({
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
)
app.use(require('express-mongo-sanitize')())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

const fs = require('fs')

// Ensure uploads and profile upload directories exist
const uploadsDir = path.join(__dirname, '../uploads')
const profileUploadsDir = path.join(__dirname, '../uploads/profile')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
if (!fs.existsSync(profileUploadsDir)) fs.mkdirSync(profileUploadsDir, { recursive: true })

const allowCrossOriginImages = (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Access-Control-Allow-Origin', '*')
  next()
}

app.use('/uploads', allowCrossOriginImages, express.static(uploadsDir))
app.use('/uploads', allowCrossOriginImages, express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'sdcfrs-backend' })
})

const profileRouter = require('./routes/profileRoutes')
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRouter)
app.use('/api/users/profile', profileRouter)
app.use('/api/users', profileRouter)
app.use('/api/complaints', complaintRoutes)
app.use('/api/teachers', teacherRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/upload', require('./routes/uploadRoutes'))
app.use('/api/analytics/teachers', require('./routes/teacherAnalyticsRoutes'))
app.use('/api/feedback', require('./routes/feedbackRoutes'))
app.use('/api/chatbot', require('./routes/chatbotRoutes'))

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Internal server error' })
})

const { initializeAndMigrateComplaintIds } = require('./utils/complaintIdService')

const start = async () => {
  // Initialize and migrate Complaint IDs for in-memory and MongoDB stores
  initializeAndMigrateComplaintIds().catch(err => console.error('Complaint ID init failed:', err.message))

  // Start DB connection in background so server isn't blocked by retry loop
  connectDatabase().then(async (isConnected) => {
    if (isConnected) {
      await seedAllowedEmails().catch(err => console.error('Allowed email seeding failed:', err.message))
      await seedDemoData().catch(err => console.error('Seeding failed:', err.message))
      await initializeAndMigrateComplaintIds().catch(err => console.error('Complaint ID migration failed:', err.message))
    }
  }).catch(err => console.error('DB Connection disabled:', err.message))

  // Create HTTP server for Socket.io
  const http = require('http')
  const server = http.createServer(app)

  // Initialize Socket.io
  const io = initSocketIO(server)
  console.log('✓ Socket.io initialized')

  // Make io available to routes
  app.set('io', io)

  // Start background workers
  initEscalationWorker()

  server.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`)
    console.log(`Socket.io ready for real-time connections`)
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Please close the process using it or choose a different port.`)
      process.exit(1)
    } else {
      console.error('❌ Failed to start server:', err)
      process.exit(1)
    }
  })
}

// Check if we are being run directly (not required as module)
if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start backend', error)
  })
}
