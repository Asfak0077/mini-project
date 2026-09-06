/**
 * Serverless entry point for standalone backend deployment on Vercel
 */
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

let expressApp = null;

async function getExpressApp() {
  if (expressApp) return expressApp;

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
  expressApp.use(cors());
  expressApp.use(express.json({ limit: '5mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '5mb' }));

  expressApp.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sdcfrs-backend', timestamp: new Date().toISOString() });
  });

  expressApp.use('/api/auth', require('../src/routes/authRoutesEnhanced.js'));
  expressApp.use('/api/profile', require('../src/routes/profileRoutes.js'));
  expressApp.use('/api/users', require('../src/routes/profileRoutes.js'));
  expressApp.use('/api/complaints', require('../src/routes/complaintRoutesEnhanced.js'));
  expressApp.use('/api/teachers', require('../src/routes/teacherRoutes.js'));
  expressApp.use('/api/notifications', require('../src/routes/notificationRoutes.js'));
  expressApp.use('/api/upload', require('../src/routes/uploadRoutes.js'));
  expressApp.use('/api/analytics', require('../src/routes/teacherAnalyticsRoutes.js'));
  expressApp.use('/api/feedback', require('../src/routes/feedbackRoutes.js'));
  expressApp.use('/api/chatbot', require('../src/routes/chatbotRoutes.js'));
  expressApp.use('/api/ai-intelligence', require('../src/routes/aiIntelligenceRoutes.js'));

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
    console.error('Server initialization failed:', error);
    res.status(500).json({ message: 'Server initialization failed', error: error.message });
  }
};
