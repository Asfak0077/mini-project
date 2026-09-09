require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
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

const isProduction = process.env.NODE_ENV === 'production'
const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
const configuredOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
const allowedOrigins = Array.from(new Set([...(isProduction ? [] : defaultAllowedOrigins), ...configuredOrigins]))

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(null, false)
  },
  credentials: true
}

app.use(cors(corsOptions))
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
})
app.use('/api', apiLimiter)

const fs = require('fs')

// Ensure uploads and profile upload directories exist
const uploadsDir = path.join(__dirname, '../uploads')
const profileUploadsDir = path.join(__dirname, '../uploads/profile')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
if (!fs.existsSync(profileUploadsDir)) fs.mkdirSync(profileUploadsDir, { recursive: true })

const allowCrossOriginImages = (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  const requestOrigin = req.headers.origin
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Vary', 'Origin')
  } else if (!isProduction) {
    res.setHeader('Access-Control-Allow-Origin', defaultAllowedOrigins[0])
  }
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
app.use('/api/ai-intelligence', require('./routes/aiIntelligenceRoutes'))

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

module.exports = app
