const nodemailer = require('nodemailer')
const mongoose = require('mongoose')
const EmailLog = require('../models/EmailLog')

// Centralized Environment Variables
const EMAIL_USER = process.env.EMAIL_USER || 'campusresolve40@gmail.com'
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || ''
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'campusresolve40@gmail.com'
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || 'campusresolve40@gmail.com'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Create reusable Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
})

// Helper to escape HTML characters
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Priority Badge Styler
const getPriorityBadge = (priority = 'medium') => {
  const p = String(priority).toLowerCase()
  if (p === 'high' || p === 'urgent') {
    return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">High</span>`
  }
  if (p === 'medium') {
    return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;background:#fffbeb;color:#d97706;border:1px solid #fde68a;">Medium</span>`
  }
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;">Low</span>`
}

// Status Badge Styler
const getStatusBadge = (status = 'Submitted') => {
  const s = String(status)
  if (s === 'Resolved') {
    return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;">Resolved</span>`
  }
  if (s === 'In Progress') {
    return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;">In Progress</span>`
  }
  if (s === 'Assigned') {
    return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;">Assigned</span>`
  }
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">Submitted</span>`
}

/**
 * Universal CampusResolve Light Theme Email Template
 */
const generateEmailLayout = ({
  badge = 'Campus Notification',
  title = '',
  recipientName = 'User',
  introMessage = '',
  detailsHtml = '',
  callToAction = null, // { label: string, url: string }
  secondaryNote = ''
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F6F8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.04);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #FFFFFF; border-bottom: 1px solid #EEF2F6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; vertical-align: middle;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 36px; height: 36px; background-color: #2563EB; border-radius: 10px; text-align: center; vertical-align: middle; color: #FFFFFF; font-weight: 800; font-size: 14px; letter-spacing: -0.5px;">
                            CR
                          </td>
                          <td style="padding-left: 12px;">
                            <div style="font-size: 16px; font-weight: 800; color: #111827; letter-spacing: -0.3px;">CampusResolve</div>
                            <div style="font-size: 11px; font-weight: 600; color: #64748B;">Smart Digital Complaint &amp; Feedback Redressal System</div>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 32px;">
              <!-- Notification Tag -->
              <div style="display: inline-block; padding: 4px 12px; background-color: #ECFCCB; border: 1px solid #D9F99D; border-radius: 20px; font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                ${escapeHtml(badge)}
              </div>

              <!-- Title -->
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #111827; line-height: 1.3;">
                ${escapeHtml(title)}
              </h1>

              <!-- Greeting & Intro -->
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #111827;">
                Hello ${escapeHtml(recipientName)},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${introMessage}
              </p>

              <!-- Details Section -->
              ${detailsHtml ? `
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
                ${detailsHtml}
              </div>
              ` : ''}

              <!-- Call To Action Button -->
              ${callToAction ? `
              <div style="text-align: center; margin: 28px 0 20px 0;">
                <a href="${callToAction.url}" style="display: inline-block; padding: 14px 28px; background-color: #111827; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15);">
                  ${escapeHtml(callToAction.label)} &rarr;
                </a>
              </div>
              ` : ''}

              <!-- Secondary Note -->
              ${secondaryNote ? `
              <p style="margin: 20px 0 0 0; font-size: 12.5px; line-height: 1.5; color: #64748B; border-top: 1px solid #EEF2F6; padding-top: 16px;">
                ${secondaryNote}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                CampusResolve
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #94A3B8;">
                Smart Digital Complaint &amp; Feedback Redressal System &bull; Official Campus Support
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #94A3B8;">
                This is an automated system notification. Replies to this email address are routed to administrative records.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/**
 * Base Safe Mail Sender (Non-blocking with logging & DB tracking)
 */
const sendMailSafe = async ({ to, subject, html, type = 'other' }) => {
  if (!to) {
    console.warn(`[EMAIL_SKIPPED] Missing recipient for subject: "${subject}"`)
    return { success: false, reason: 'No recipient provided' }
  }

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn(`[EMAIL_SKIPPED] Missing EMAIL_USER or EMAIL_PASS in environment variables.`)
    return { success: false, reason: 'Missing credentials' }
  }

  try {
    const info = await transporter.sendMail({
      from: `"CampusResolve" <${EMAIL_FROM}>`,
      to,
      subject,
      html
    })

    console.log(`[EMAIL_SENT] to: ${to} | type: ${type} | messageId: ${info.messageId}`)

    // Record in EmailLog collection asynchronously if DB is connected
    if (mongoose.connection.readyState === 1) {
      EmailLog.create({
        recipient: to,
        subject,
        type,
        status: 'sent',
        messageId: info.messageId
      }).catch((dbErr) => console.error('[EMAIL_LOG_DB_ERROR]', dbErr.message))
    }

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[EMAIL_FAILED] to: ${to} | type: ${type} | error: ${error.message}`)

    if (mongoose.connection.readyState === 1) {
      EmailLog.create({
        recipient: to,
        subject,
        type,
        status: 'failed',
        error: error.message
      }).catch((dbErr) => console.error('[EMAIL_LOG_DB_ERROR]', dbErr.message))
    }

    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   1. STUDENT COMPLAINT CONFIRMATION
   ========================================================================== */
const sendComplaintConfirmation = async (complaint) => {
  try {
    const complaintId = complaint.complaintId || complaint.ticketNumber || (complaint.id && /^CR-\d+$/i.test(complaint.id) ? complaint.id : null) || (complaint._id ? `CR-${String(complaint._id).slice(-3).toUpperCase()}` : 'CR-001')
    const studentName = complaint.studentName || 'Student'
    const title = complaint.title || 'Complaint'
    const category = complaint.category || 'General'
    const department = complaint.department || 'General'
    const priority = complaint.priority || 'medium'
    const status = complaint.status || 'Submitted'
    const submittedAt = new Date(complaint.createdAt || Date.now()).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 40%;">Ticket ID</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${escapeHtml(complaintId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Title</td>
          <td style="padding: 6px 0; font-weight: 700;">${escapeHtml(title)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Category</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(category)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(department)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Priority</td>
          <td style="padding: 6px 0;">${getPriorityBadge(priority)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Current Status</td>
          <td style="padding: 6px 0;">${getStatusBadge(status)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Submission Date</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(submittedAt)}</td>
        </tr>
      </table>
    `

    const html = generateEmailLayout({
      badge: 'Submission Confirmation',
      title: 'Complaint Submitted Successfully',
      recipientName: studentName,
      introMessage: `Your grievance ticket has been recorded in the CampusResolve system. The administrative office and department coordinator have been notified to review and assign your ticket.`,
      detailsHtml,
      callToAction: {
        label: 'Track Complaint Live',
        url: `${FRONTEND_URL}/student/history`
      },
      secondaryNote: `You will receive automatic email updates when a faculty member is assigned or when action is taken on your complaint.`
    })

    return await sendMailSafe({
      to: complaint.studentEmail,
      subject: `[CampusResolve] Complaint Submitted Successfully - ${complaintId}`,
      html,
      type: 'complaint_submitted'
    })
  } catch (error) {
    console.error('sendComplaintConfirmation error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   2. ADMIN NOTIFICATION: NEW COMPLAINT SUBMITTED
   ========================================================================== */
const sendComplaintAdminNotification = async (complaint) => {
  try {
    const complaintId = complaint.complaintId || complaint.ticketNumber || (complaint.id && /^CR-\d+$/i.test(complaint.id) ? complaint.id : null) || (complaint._id ? `CR-${String(complaint._id).slice(-3).toUpperCase()}` : 'CR-001')
    const studentName = complaint.studentName || 'Student'
    const studentId = complaint.studentId || 'N/A'
    const studentEmail = complaint.studentEmail || 'N/A'
    const title = complaint.title || 'Untitled Complaint'
    const category = complaint.category || 'General'
    const department = complaint.department || 'General'
    const priority = complaint.priority || 'medium'
    const description = complaint.description || 'No description provided.'
    const assignedFaculty = complaint.assignedTeacherName || complaint.assignedTeacherId || 'Unassigned (In Dept Pool)'
    const submittedAt = new Date(complaint.createdAt || Date.now()).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%;">Complaint ID</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${escapeHtml(complaintId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Student Name</td>
          <td style="padding: 6px 0; font-weight: 700;">${escapeHtml(studentName)} (${escapeHtml(studentId)})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Student Email</td>
          <td style="padding: 6px 0;">${escapeHtml(studentEmail)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(department)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Category</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(category)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Priority</td>
          <td style="padding: 6px 0;">${getPriorityBadge(priority)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Assigned Faculty</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(assignedFaculty)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Submission Date</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(submittedAt)}</td>
        </tr>
      </table>

      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Complaint Description</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; background: #FFFFFF; padding: 10px 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          ${escapeHtml(description)}
        </div>
      </div>
    `

    const html = generateEmailLayout({
      badge: 'Admin Alert',
      title: 'New Complaint Submitted',
      recipientName: 'Administrator',
      introMessage: `A new student grievance ticket has been filed on CampusResolve and requires administrative review or faculty delegation.`,
      detailsHtml,
      callToAction: {
        label: 'Open Admin Console',
        url: `${FRONTEND_URL}/admin`
      },
      secondaryNote: `Sent to ${EMAIL_ADMIN} as the central administrative contact for CampusResolve.`
    })

    return await sendMailSafe({
      to: EMAIL_ADMIN,
      subject: `[CampusResolve] New Complaint Submitted - ${complaintId}`,
      html,
      type: 'complaint_admin_alert'
    })
  } catch (error) {
    console.error('sendComplaintAdminNotification error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   3. FACULTY NOTIFICATION: COMPLAINT ASSIGNED
   ========================================================================== */
const sendComplaintAssignment = async (complaint, teacher) => {
  try {
    const complaintId = complaint.complaintId || complaint.ticketNumber || (complaint.id && /^CR-\d+$/i.test(complaint.id) ? complaint.id : null) || (complaint._id ? `CR-${String(complaint._id).slice(-3).toUpperCase()}` : 'CR-001')
    const studentName = complaint.studentName || 'Student'
    const studentId = complaint.studentId || 'N/A'
    const teacherName = teacher?.name || complaint.assignedTeacherName || 'Faculty Member'
    const teacherEmail = teacher?.email || complaint.assignedTeacherEmail
    const category = complaint.category || 'General'
    const department = complaint.department || 'General'
    const priority = complaint.priority || 'medium'
    const description = complaint.description || 'No description provided.'
    const assignedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })

    if (!teacherEmail) {
      console.warn(`[EMAIL_SKIPPED] No teacher email found for complaint assignment ${complaintId}`)
      return { success: false, reason: 'No teacher email' }
    }

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%;">Complaint ID</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${escapeHtml(complaintId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Student</td>
          <td style="padding: 6px 0; font-weight: 700;">${escapeHtml(studentName)} (${escapeHtml(studentId)})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(department)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Category</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(category)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Priority</td>
          <td style="padding: 6px 0;">${getPriorityBadge(priority)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Assigned Date</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(assignedAt)}</td>
        </tr>
      </table>

      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Student Description</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; background: #FFFFFF; padding: 10px 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          ${escapeHtml(description)}
        </div>
      </div>
    `

    const html = generateEmailLayout({
      badge: 'Faculty Task Assignment',
      title: 'New Complaint Assigned to You',
      recipientName: teacherName,
      introMessage: `A student complaint in the ${escapeHtml(department)} department has been assigned to you for investigation and resolution.`,
      detailsHtml,
      callToAction: {
        label: 'Open Faculty Queue',
        url: `${FRONTEND_URL}/teacher`
      },
      secondaryNote: `Please review this ticket and update its status or provide remarks as progress is made.`
    })

    return await sendMailSafe({
      to: teacherEmail,
      subject: `[CampusResolve] New Complaint Assigned to You - ${complaintId}`,
      html,
      type: 'complaint_assigned'
    })
  } catch (error) {
    console.error('sendComplaintAssignment error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   4. STATUS UPDATE NOTIFICATION (STUDENT & ADMIN)
   ========================================================================== */
const sendStatusUpdate = async (complaint, oldStatus, newStatus, notes = '') => {
  try {
    const complaintId = complaint.complaintId || complaint.ticketNumber || (complaint.id && /^CR-\d+$/i.test(complaint.id) ? complaint.id : null) || (complaint._id ? `CR-${String(complaint._id).slice(-3).toUpperCase()}` : 'CR-001')
    const studentName = complaint.studentName || 'Student'
    const department = complaint.department || 'General'
    const faculty = complaint.assignedTeacherName || 'Assigned Faculty'
    const updatedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%;">Complaint ID</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${escapeHtml(complaintId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Previous Status</td>
          <td style="padding: 6px 0;">${getStatusBadge(oldStatus)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">New Status</td>
          <td style="padding: 6px 0;">${getStatusBadge(newStatus)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(department)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Assigned Faculty</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(faculty)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Updated Date</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(updatedAt)}</td>
        </tr>
      </table>

      ${notes ? `
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Faculty Notes / Remarks</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; background: #FFFFFF; padding: 10px 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          ${escapeHtml(notes)}
        </div>
      </div>
      ` : ''}
    `

    // Email to Student
    if (complaint.studentEmail) {
      const studentHtml = generateEmailLayout({
        badge: 'Status Update',
        title: 'Complaint Status Updated',
        recipientName: studentName,
        introMessage: `Your complaint status has transitioned from "${escapeHtml(oldStatus)}" to "${escapeHtml(newStatus)}".`,
        detailsHtml,
        callToAction: {
          label: 'View Complaint Timeline',
          url: `${FRONTEND_URL}/student/history`
        },
        secondaryNote: `You can check live timeline updates directly in your student portal.`
      })

      sendMailSafe({
        to: complaint.studentEmail,
        subject: `[CampusResolve] Complaint Status Updated - ${complaintId}`,
        html: studentHtml,
        type: 'status_changed'
      }).catch(() => {})
    }

    // Email to Admin
    const adminHtml = generateEmailLayout({
      badge: 'Operational Audit',
      title: 'Complaint Status Updated',
      recipientName: 'Administrator',
      introMessage: `Status for complaint ${escapeHtml(complaintId)} (${escapeHtml(studentName)}) has been updated by faculty/system.`,
      detailsHtml,
      callToAction: {
        label: 'Open Admin Console',
        url: `${FRONTEND_URL}/admin`
      }
    })

    sendMailSafe({
      to: EMAIL_ADMIN,
      subject: `[CampusResolve] Complaint Status Updated - ${complaintId}`,
      html: adminHtml,
      type: 'status_changed'
    }).catch(() => {})

    return { success: true }
  } catch (error) {
    console.error('sendStatusUpdate error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   5. RESOLUTION NOTIFICATION (STUDENT)
   ========================================================================== */
const sendResolutionNotification = async (complaint) => {
  try {
    const complaintId = complaint.complaintId || complaint.ticketNumber || (complaint.id && /^CR-\d+$/i.test(complaint.id) ? complaint.id : null) || (complaint._id ? `CR-${String(complaint._id).slice(-3).toUpperCase()}` : 'CR-001')
    const studentName = complaint.studentName || 'Student'
    const teacherName = complaint.assignedTeacherName || 'Faculty Member'
    const category = complaint.category || 'General'
    const department = complaint.department || 'General'
    const resolutionNotes = complaint.resolutionNotes || complaint.notes || 'The complaint has been thoroughly investigated and resolved.'
    const resolvedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%;">Complaint ID</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${escapeHtml(complaintId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Category</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(category)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(department)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Resolved By</td>
          <td style="padding: 6px 0; font-weight: 700; color: #111827;">${escapeHtml(teacherName)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Resolution Date</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(resolvedAt)}</td>
        </tr>
      </table>

      <div style="margin-top: 14px; padding: 14px 16px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: #065F46; text-transform: uppercase; margin-bottom: 4px;">Resolution Summary &amp; Action Taken</div>
        <div style="font-size: 13.5px; color: #047857; line-height: 1.5; font-weight: 500;">
          ${escapeHtml(resolutionNotes)}
        </div>
      </div>
    `

    const html = generateEmailLayout({
      badge: 'Case Resolved',
      title: 'Your Complaint Has Been Resolved',
      recipientName: studentName,
      introMessage: `Your grievance has been marked as resolved by ${escapeHtml(teacherName)}. Please review the resolution details and let us know your feedback.`,
      detailsHtml,
      callToAction: {
        label: 'Rate Resolution & Give Feedback',
        url: `${FRONTEND_URL}/student/feedback`
      },
      secondaryNote: `Your feedback directly helps improve our campus redressal quality and response speed. You can also view this ticket in your <a href="${FRONTEND_URL}/student/history" style="color:#2563EB;font-weight:600;">Complaint History</a>.`
    })

    return await sendMailSafe({
      to: complaint.studentEmail,
      subject: `[CampusResolve] Your Complaint Has Been Resolved - ${complaintId}`,
      html,
      type: 'complaint_resolved'
    })
  } catch (error) {
    console.error('sendResolutionNotification error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   6. FEEDBACK NOTIFICATIONS (FACULTY & ADMIN)
   ========================================================================== */
const sendFeedbackNotification = async (feedbackData, teacher = null) => {
  try {
    const teacherEmail = teacher?.email || feedbackData.teacherEmail
    const teacherName = teacher?.name || feedbackData.teacherName || 'Faculty Member'
    const studentName = feedbackData.studentName || 'A Student'
    const complaintId = feedbackData.complaintId || 'N/A'
    const rating = Number(feedbackData.rating) || 5
    const stars = '★'.repeat(Math.max(1, Math.min(5, rating)))
    const comment = feedbackData.comment || feedbackData.comments || 'No comment provided.'
    const department = feedbackData.department || 'General'
    const date = new Date(feedbackData.date || Date.now()).toLocaleDateString('en-US', {
      dateStyle: 'medium'
    })

    if (!teacherEmail) {
      console.warn('[EMAIL_SKIPPED] No teacher email available for feedback notification.')
      return { success: false, reason: 'No teacher email' }
    }

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%;">Complaint ID</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${escapeHtml(complaintId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Student</td>
          <td style="padding: 6px 0; font-weight: 700;">${escapeHtml(studentName)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Rating</td>
          <td style="padding: 6px 0; color: #D97706; font-size: 16px; font-weight: 800;">${stars} (${rating}.0)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(department)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Date</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(date)}</td>
        </tr>
      </table>

      ${comment ? `
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Student Feedback</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; background: #FFFFFF; padding: 10px 12px; border-radius: 8px; border: 1px solid #E2E8F0; font-style: italic;">
          &ldquo;${escapeHtml(comment)}&rdquo;
        </div>
      </div>
      ` : ''}
    `

    const html = generateEmailLayout({
      badge: 'Faculty Feedback',
      title: 'New Student Feedback Received',
      recipientName: teacherName,
      introMessage: `A student has submitted satisfaction feedback regarding your resolution of ticket ${escapeHtml(complaintId)}.`,
      detailsHtml,
      callToAction: {
        label: 'View Faculty Workspace',
        url: `${FRONTEND_URL}/teacher`
      }
    })

    return await sendMailSafe({
      to: teacherEmail,
      subject: `[CampusResolve] New Student Feedback Received - ${complaintId}`,
      html,
      type: 'feedback_faculty'
    })
  } catch (error) {
    console.error('sendFeedbackNotification error:', error)
    return { success: false, error: error.message }
  }
}

const sendFeedbackAdminNotification = async (feedbackData, teacher = null) => {
  try {
    const studentName = feedbackData.studentName || 'Student'
    const studentId = feedbackData.studentId || 'N/A'
    const complaintId = feedbackData.complaintId || 'N/A'
    const rating = Number(feedbackData.rating) || 5
    const stars = '★'.repeat(Math.max(1, Math.min(5, rating)))
    const comment = feedbackData.comment || feedbackData.comments || 'No comment provided.'
    const department = feedbackData.department || 'General'
    const faculty = teacher?.name || feedbackData.teacherName || 'Faculty Member'
    const date = new Date(feedbackData.date || Date.now()).toLocaleDateString('en-US', {
      dateStyle: 'medium'
    })

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%;">Complaint ID</td>
          <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">${escapeHtml(complaintId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Student</td>
          <td style="padding: 6px 0; font-weight: 700;">${escapeHtml(studentName)} (${escapeHtml(studentId)})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Rating</td>
          <td style="padding: 6px 0; color: #D97706; font-size: 16px; font-weight: 800;">${stars} (${rating}.0)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(department)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Faculty</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(faculty)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Date</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(date)}</td>
        </tr>
      </table>

      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Student Feedback</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; background: #FFFFFF; padding: 10px 12px; border-radius: 8px; border: 1px solid #E2E8F0; font-style: italic;">
          &ldquo;${escapeHtml(comment)}&rdquo;
        </div>
      </div>
    `

    const html = generateEmailLayout({
      badge: 'Admin Feed',
      title: 'New Student Feedback',
      recipientName: 'Administrator',
      introMessage: `A new student satisfaction review has been submitted for resolved case ${escapeHtml(complaintId)}.`,
      detailsHtml,
      callToAction: {
        label: 'View Feedback Feed',
        url: `${FRONTEND_URL}/admin/feedback`
      }
    })

    return await sendMailSafe({
      to: EMAIL_ADMIN,
      subject: `[CampusResolve] New Student Feedback - ${complaintId}`,
      html,
      type: 'feedback_admin'
    })
  } catch (error) {
    console.error('sendFeedbackAdminNotification error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   7. PASSWORD RESET EMAIL & OTP (INSTITUTIONAL STANDARD)
   ========================================================================== */
const generatePasswordResetEmailHtml = ({ resetUrl = `${FRONTEND_URL}/reset-password`, name = 'User' }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your CampusResolve Password</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .fluid-padding { padding: 24px 20px !important; }
      .header-padding { padding: 20px 20px !important; }
      .mobile-button { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main White Email Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.04);">
          
          <!-- Header Branding -->
          <tr>
            <td class="header-padding" style="padding: 28px 32px 24px 32px; background-color: #FFFFFF; border-bottom: 1px solid #EEF2F6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- CampusResolve Brand Mark (CR Logo Badge) -->
                        <td style="width: 42px; height: 42px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); border-radius: 12px; text-align: center; vertical-align: middle; color: #FFFFFF; font-weight: 800; font-size: 15px; letter-spacing: -0.5px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.22);">
                          CR
                        </td>
                        <td style="padding-left: 14px;">
                          <div style="font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px; line-height: 1.2;">CampusResolve</div>
                          <div style="font-size: 10.5px; font-weight: 700; color: #2563EB; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 3px;">STUDENT PORTAL</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="fluid-padding" style="padding: 34px 32px 28px 32px;">
              <!-- Main Heading -->
              <h1 style="margin: 0 0 22px 0; font-size: 23px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; line-height: 1.25;">
                Reset your password
              </h1>

              <!-- Greeting & Body -->
              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.65; color: #334155; font-weight: 500;">
                Hello,
              </p>
              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.65; color: #334155; font-weight: 500;">
                We received a request to reset the password for your CampusResolve Student Portal account.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.65; color: #334155; font-weight: 500;">
                To create a new password, click the secure button below.
              </p>

              <!-- CTA Button -->
              <div style="margin: 0 0 32px 0; text-align: left;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(resetUrl)}" style="height:48px;v-text-anchor:middle;width:230px;" arcsize="25%" stroke="f" fillcolor="#2563EB">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reset My Password &rarr;</center>
                </v:roundrect>
                <![endif]-->
                <a href="${escapeHtml(resetUrl)}" class="mobile-button" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28); -webkit-text-size-adjust: none; mso-hide: all; transition: background-color 0.2s ease;">
                  Reset My Password &rarr;
                </a>
              </div>

              <!-- Security Notice Box -->
              <div style="margin: 0 0 28px 0; padding: 18px 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px;">
                <p style="margin: 0 0 10px 0; font-size: 13.5px; line-height: 1.6; color: #475569;">
                  This password-reset link is intended only for your account. If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
                </p>
                <div style="margin: 0; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 13px; font-weight: 600; color: #DC2626;">
                  &#9888; Never share your password, reset link, OTP, or verification details with anyone.
                </div>
              </div>

              <!-- Subtle Divider -->
              <hr style="border: 0; border-top: 1px solid #EEF2F6; margin: 28px 0 22px 0;" />

              <!-- Footer -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 12.5px; line-height: 1.6; color: #64748B; text-align: left;">
                    <div style="font-weight: 700; color: #334155; font-size: 13px;">CampusResolve</div>
                    <div>Smart Digital Complaint &amp; Feedback Redressal System</div>
                    <div style="font-weight: 600; color: #475569;">Velammal Engineering College</div>
                    <div style="margin-top: 14px; font-size: 11.5px; color: #94A3B8;">&copy; 2026 CampusResolve. All rights reserved.</div>
                    <div style="margin-top: 2px; font-size: 11px; color: #CBD5E1;">This is an automated security email. Please do not reply.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const sendPasswordResetEmail = async (email, resetUrl, name = 'User') => {
  try {
    const html = generatePasswordResetEmailHtml({ resetUrl, name })

    return await sendMailSafe({
      to: email,
      subject: 'Reset Your CampusResolve Password',
      html,
      type: 'password_reset_link'
    })
  } catch (error) {
    console.error('sendPasswordResetEmail error:', error)
    return { success: false, error: error.message }
  }
}

const sendPasswordResetOTP = async (email, otp, name = 'User') => {
  try {
    const detailsHtml = `
      <div style="text-align: center; padding: 16px 0 8px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">One-Time Verification Code</div>
        <div style="display: inline-block; padding: 12px 28px; background-color: #FFFFFF; border: 2px dashed #2563EB; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563EB; font-family: monospace;">
          ${escapeHtml(otp)}
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #DC2626; font-weight: 600;">
          &bull; Valid for 5 minutes &bull; Single-use only
        </div>
      </div>
    `

    const html = generateEmailLayout({
      badge: 'Security Authentication',
      title: 'Reset your password',
      recipientName: name,
      introMessage: `We received a request to reset the password for your CampusResolve Student Portal account. Use the one-time code below to complete verification.`,
      detailsHtml,
      secondaryNote: `This code is provided for your account security. Never share your password or verification details with anyone.`
    })

    return await sendMailSafe({
      to: email,
      subject: 'Reset Your CampusResolve Password',
      html,
      type: 'password_reset_otp'
    })
  } catch (error) {
    console.error('sendPasswordResetOTP error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   8. LOGIN NOTIFICATION
   ========================================================================== */
const sendLoginNotification = async (email, name = 'User', details = {}) => {
  try {
    const loginTime = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13.5px; color: #111827;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 38%;">Account</td>
          <td style="padding: 6px 0; font-weight: 700;">${escapeHtml(email)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Login Time</td>
          <td style="padding: 6px 0; color: #64748B;">${escapeHtml(loginTime)}</td>
        </tr>
        ${details.ipAddress ? `
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 600;">IP Address</td>
          <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(details.ipAddress)}</td>
        </tr>
        ` : ''}
      </table>
    `

    const html = generateEmailLayout({
      badge: 'Account Activity',
      title: 'Successful Login to CampusResolve',
      recipientName: name,
      introMessage: `Your account was just accessed from a new browser session.`,
      detailsHtml,
      secondaryNote: `If this was you, no action is needed. If you suspect unauthorized access, reset your password immediately.`
    })

    return await sendMailSafe({
      to: email,
      subject: '[CampusResolve] Account Login Notification',
      html,
      type: 'login_alert'
    })
  } catch (error) {
    console.error('sendLoginNotification error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   9. ACCOUNT VERIFICATION
   ========================================================================== */
const sendAccountVerification = async (email, name = 'User', verificationUrl = '') => {
  try {
    const html = generateEmailLayout({
      badge: 'Account Verification',
      title: 'Verify Your CampusResolve Account',
      recipientName: name,
      introMessage: `Welcome to CampusResolve. Please verify your email address to complete your profile setup and access the grievance management portal.`,
      callToAction: {
        label: 'Verify My Account',
        url: verificationUrl || `${FRONTEND_URL}/login`
      },
      secondaryNote: `This link will expire in 24 hours. If you did not create this account, please ignore this email.`
    })

    return await sendMailSafe({
      to: email,
      subject: '[CampusResolve] Verify Your Account',
      html,
      type: 'account_verification'
    })
  } catch (error) {
    console.error('sendAccountVerification error:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  transporter,
  EMAIL_FROM,
  EMAIL_ADMIN,
  escapeHtml,
  sendMailSafe,
  sendComplaintConfirmation,
  sendComplaintAdminNotification,
  sendComplaintAssignment,
  sendStatusUpdate,
  sendResolutionNotification,
  sendFeedbackNotification,
  sendFeedbackAdminNotification,
  generatePasswordResetEmailHtml,
  sendPasswordResetEmail,
  sendPasswordResetOTP,
  sendLoginNotification,
  sendAccountVerification,

  // Aliases for backwards compatibility with any existing imports
  sendComplaintSubmittedEmails: async (complaint) => {
    await sendComplaintConfirmation(complaint)
    await sendComplaintAdminNotification(complaint)
    return { success: true }
  },
  sendComplaintAssignedEmails: sendComplaintAssignment,
  sendComplaintResolvedEmail: sendResolutionNotification,
  sendFeedbackReminderEmail: sendResolutionNotification,
  sendOTPEmail: (email, otp, name) => sendPasswordResetOTP(email, otp, name)
}
