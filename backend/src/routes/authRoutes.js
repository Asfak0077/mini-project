const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { authSchemas } = require('../utils/validationSchemas');

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Student Login & Signup
router.post('/student-login', validate(authSchemas.studentLogin), authController.studentLogin);
router.post('/student-signup', validate(authSchemas.studentSignup), authController.studentSignup);

// Teacher Login
router.post('/teacher-login', validate(authSchemas.teacherLogin), authController.teacherLogin);

// Password Recovery Flow
router.post('/verify-email-exists', authController.verifyEmailExists || ((req, res) => res.status(501).json({message: 'Not implemented'}))); // Fallback for safety
router.post('/forgot-password/student', validate(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/forgot-password/teacher', validate(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', validate(authSchemas.resetPassword), authController.resetPassword);

// Google Auth
router.post('/google/verify', authController.googleVerify);

// ============ PROTECTED ROUTES ============

// Profile & Configuration
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.post('/change-password', protect, authController.changePassword || ((req, res) => res.status(501).json({message: 'Not implemented'})));
router.post('/set-password', protect, authController.setPassword || ((req, res) => res.status(501).json({message: 'Not implemented'})));

// Logout
router.post('/logout', authController.logout);

module.exports = router;
