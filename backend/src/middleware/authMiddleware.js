const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { inMemoryStore } = require('../utils/inMemoryStore');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.SECRET_KEY || process.env.JWT_SECRET || 'dev-secret';
      const decoded = jwt.verify(token, secret);

      // Support multiple claim names that various clients/providers might use
      const tokenId = decoded.id || decoded.userId || decoded.user_id || decoded.sub || decoded.uid || null
      const tokenRole = decoded.role || decoded.roles || decoded.userRole || decoded.r || null
      const tokenEmail = decoded.email || decoded.mail || null
      const tokenStudentId = decoded.studentId || decoded.student_id || null

      if (mongoose.connection.readyState !== 1) {
        if (tokenRole === 'teacher' || (decoded && String(tokenId || '').toLowerCase().startsWith('tch'))) {
          const teacher = inMemoryStore.findTeacherByIdOrEmail(tokenId) || inMemoryStore.findTeacherByIdOrEmail(tokenEmail)
          req.user = teacher || { id: tokenId, teacherId: tokenId, name: 'Faculty Member', email: tokenEmail || 'cse.teacher@campusresolve.edu', role: 'teacher', department: 'CSE' }
          req.userRole = 'teacher';
        } else {
          const student = inMemoryStore.findStudentById(tokenId) || inMemoryStore.findStudentByEmail(tokenEmail)
          req.user = student || { id: tokenId, studentId: tokenStudentId || tokenId, name: tokenRole === 'admin' ? 'Admin Officer' : 'Student User', email: tokenEmail || 'student@campusresolve.edu', role: tokenRole || 'student', department: tokenRole === 'admin' ? 'Administration' : 'CSE' }
          req.userRole = tokenRole || 'student';
        }
        return next();
      }

      if (tokenRole === 'teacher') {
        // Teacher tokens often use teacherId as the identifier
        const lookupId = tokenId || tokenEmail
        let teacher = await Teacher.findOne({ $or: [{ teacherId: lookupId }, { email: (lookupId || '').toLowerCase() }] }).catch(() => null);
        if (!teacher) teacher = inMemoryStore.findTeacherByIdOrEmail(lookupId)
        if (!teacher) return res.status(401).json({ message: 'Teacher no longer exists' });
        req.user = teacher;
        req.userRole = 'teacher';
      } else {
        // Students: allow lookup by ObjectId, studentId, or email
        const lookupId = tokenId || tokenStudentId || tokenEmail
        let student = null
        if (lookupId && mongoose.Types.ObjectId.isValid(lookupId)) {
          student = await Student.findById(lookupId).catch(() => null);
        }
        if (!student && lookupId) {
          student = await Student.findOne({ $or: [{ studentId: lookupId }, { email: (lookupId || '').toLowerCase() }] }).catch(() => null);
        }
        if (!student) student = inMemoryStore.findStudentById(lookupId) || inMemoryStore.findStudentByEmail(lookupId)
        if (!student) return res.status(401).json({ message: 'Student no longer exists' });
        req.user = student;
        req.userRole = student.role || tokenRole || 'student';
      }

      next();
    } catch (error) {
      console.error('Auth check failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: `Role ${req.userRole} is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
