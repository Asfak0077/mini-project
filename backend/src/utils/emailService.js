// utils/emailService.js - Centralized routing to services/emailService.js
const emailService = require('../services/emailService')

module.exports = {
  ...emailService,
  sendOTPEmail: (email, otp, name) => emailService.sendPasswordResetOTP(email, otp, name),
  sendPasswordResetEmail: (email, resetLink, name) => emailService.sendPasswordResetEmail(email, resetLink, name),
  sendComplaintNotification: (email, complaintData, status) => {
    if (status === 'Resolved') {
      return emailService.sendResolutionNotification(complaintData)
    }
    return emailService.sendStatusUpdate(complaintData, 'Previous', status, complaintData.resolutionNotes)
  },
  sendLoginNotification: (email, name, details) => emailService.sendLoginNotification(email, name, details),
  sendPasswordChangeNotification: async (email, name) => {
    return emailService.sendMailSafe({
      to: email,
      subject: '[CampusResolve] Password Changed Successfully',
      html: emailService.escapeHtml(`Your CampusResolve password was recently updated.`),
      type: 'account_verification'
    })
  },
  sendPasswordSuccessEmail: async (email, name) => {
    return emailService.sendMailSafe({
      to: email,
      subject: '[CampusResolve] Password Updated',
      html: emailService.escapeHtml(`Your password has been successfully updated.`),
      type: 'account_verification'
    })
  },
  sendFeedbackNotification: (teacherEmail, teacherName, studentName, feedbackData) => {
    return emailService.sendFeedbackNotification(feedbackData, { email: teacherEmail, name: teacherName }, { name: studentName })
  }
}
