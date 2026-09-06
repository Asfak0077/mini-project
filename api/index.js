/**
 * Vercel serverless wrapper for the Express backend
 * Maps Vercel serverless requests to the Express app
 */
const path = require('path');

// Singleton Express app (reused across warm invocations)
let expressApp = null;

async function getExpressApp() {
  if (expressApp) return expressApp;

  const express = require('express');
  const cors = require('cors');
  const mongoose = require('mongoose');
  const helmet = require('helmet');
  const mongoSanitize = require('express-mongo-sanitize');

  // Connect to MongoDB
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });
  }

  expressApp = express();

  // Security middleware
  expressApp.use(helmet({
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  expressApp.use(cors());
  expressApp.use(mongoSanitize());
  expressApp.use(express.json({ limit: '5mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Health check
  expressApp.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sdcfrs-backend', timestamp: new Date().toISOString() });
  });

  // Mount all routes
  expressApp.use('/api/auth', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'authRoutesEnhanced.js')));
  expressApp.use('/api/profile', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'profileRoutes.js')));
  expressApp.use('/api/users', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'profileRoutes.js')));
  expressApp.use('/api/complaints', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'complaintRoutesEnhanced.js')));
  expressApp.use('/api/teachers', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'teacherRoutes.js')));
  expressApp.use('/api/notifications', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'notificationRoutes.js')));
  expressApp.use('/api/upload', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'uploadRoutes.js')));
  expressApp.use('/api/analytics', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'teacherAnalyticsRoutes.js')));
  expressApp.use('/api/feedback', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'feedbackRoutes.js')));
  expressApp.use('/api/chatbot', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'chatbotRoutes.js')));
  expressApp.use('/api/ai-intelligence', require(path.join(__dirname, '..', 'backend', 'src', 'routes', 'aiIntelligenceRoutes.js')));

  // Error handler
  expressApp.use((error, _req, res, _next) => {
    console.error('Serverless error:', error);
    res.status(500).json({ message: 'Internal server error' });
  });

  return expressApp;
}

module.exports = async (req, res) => {
  try {
    const app = await getExpressApp();
    return app(req, res);
  } catch (error) {
    console.error('Failed to initialize Express app:', error);
    res.status(500).json({ message: 'Server initialization failed', error: error.message });
  }
};
