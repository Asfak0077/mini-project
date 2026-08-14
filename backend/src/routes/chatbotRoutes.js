const express = require('express')
const crypto = require('crypto')
const Complaint = require('../models/Complaint')
const ChatLog = require('../models/ChatLog')
const { protect, authorize } = require('../middleware/authMiddleware')

const router = express.Router()

const {
  analyzeSentiment, generateQuickReplies, autoSuggestCategory,
  predictPriority, generateSummary, enhanceFeedbackText,
  generateFeedbackAnalyticsInsight, generateBio, answerChatbotQuestion
} = require('../utils/aiSimulator')

let Feedback
try { Feedback = require('../models/Feedback') } catch(e) { Feedback = null }

// ─── Intent Patterns ────────────────────────────────────────────────────────
const INTENTS = {
  GREETING:        /^(hi|hello|hey|greetings|morning|afternoon|evening)/i,
  THANKS:          /(thank|thanks|appreciate)/i,
  LOGIN:           /(how.*login|how.*sign in|how.*access|login help|sign in help)/i,
  GOOGLE_LOGIN:    /(google.*sign|google.*login|oauth|continue with google)/i,
  ADMIN_LOGIN:     /(admin.*login|login.*admin)/i,
  TEACHER_LOGIN:   /(teacher.*login|faculty.*login|login.*teacher|login.*faculty)/i,
  RESET_PASSWORD:  /(reset|forgot|change|recover).*(password|passcode)/i,
  SUBMIT_COMPLAINT:/(submit|create|make|file|new).*(complaint|issue|grievance)/i,
  TRACK_COMPLAINT: /(track|status|where|check).*(complaint|issue|grievance)/i,
  FEEDBACK:        /(feedback|rate|review|satisfaction|rating)/i,
  CONTACT_SUPPORT: /(contact|reach|talk|call|help).*(support|admin|teacher|faculty)/i,
  NOTIFICATION:    /(notification|bell|alert|updates|announcements)/i,
  PROFILE:         /(profile|avatar|picture|bio|personal info|update name|change password)/i,
  DASHBOARD:       /(dashboard|home page|main page|navigate|go to)/i,
  STATS:           /(stats|statistics|analytics|graph|chart|report)/i,
  FEEDBACK_ANALYTICS: /(feedback.*(report|analytics|stats|summary)|rating.*report|teacher.*performance)/i,
  ASSIGNED:        /(assigned|my complaints|workload)/i,
  OVERLOAD:        /(overload|busy|bottleneck)/i,
  FRUSTRATED:      /(urgent|ignored|no response|not resolved|worst|still pending|nobody|please fix|help me now|so frustrated|very frustrated)/i,
}

// ─── Empathy Prefix ─────────────────────────────────────────────────────────
const empathyPrefix = (isUrgent) =>
  isUrgent
    ? "💙 I understand this is really frustrating — I'm here to help you right away.\n\n"
    : ""

// ─── Core Response Generator ─────────────────────────────────────────────────
const generateResponse = async (message, userRole, lang = 'en', isUrgent = false) => {
  const prefix = empathyPrefix(isUrgent)

  // ── Admin-specific ───────────────────────────────────────────────────────
  if (userRole === 'admin') {
    if (INTENTS.FEEDBACK_ANALYTICS.test(message)) {
      let avgRating = 4.1, totalFeedback = 0, positive = 0, neutral = 0, negative = 0, deptMap = {}
      if (Feedback) {
        try {
          const allFeedback = await Feedback.find().limit(500).lean()
          totalFeedback = allFeedback.length
          allFeedback.forEach(fb => {
            const rating = fb.rating || fb.overallRating || 3
            if (rating >= 4) positive++
            else if (rating === 3) neutral++
            else negative++
            const dept = fb.department || 'General'
            if (!deptMap[dept]) deptMap[dept] = { total: 0, sum: 0 }
            deptMap[dept].total++
            deptMap[dept].sum += rating
          })
          const totalRating = allFeedback.reduce((s, f) => s + (f.rating || f.overallRating || 3), 0)
          avgRating = totalFeedback > 0 ? (totalRating / totalFeedback).toFixed(1) : 0
        } catch(e) { console.error('Feedback query error', e) }
      }
      const deptScores = Object.entries(deptMap).map(([dept, v]) => ({ dept, avg: (v.sum / v.total).toFixed(1) }))
      const insight = await generateFeedbackAnalyticsInsight(avgRating, negative, deptScores[0]?.dept)
      return {
        text: `${prefix}Here is the **AI Feedback Analytics Report**:\n\n${insight}`,
        quickActions: ['Show Stats', 'Detect Overload', 'Manage Users'],
        widgetData: { type: 'feedback_analytics', avgRating, totalFeedback, sentiment: { positive, neutral, negative }, deptScores: deptScores.slice(0, 4) }
      }
    }
    if (INTENTS.STATS.test(message)) {
      const total = await Complaint.countDocuments().catch(() => 0)
      const resolved = await Complaint.countDocuments({ status: 'Resolved' }).catch(() => 0)
      const pending = await Complaint.countDocuments({ status: { $in: ['Submitted', 'Assigned'] } }).catch(() => 0)
      return {
        text: `${prefix}Here are the **Live Campus Statistics**:\n- 📌 **Total Complaints:** ${total}\n- ✅ **Resolved:** ${resolved}\n- ⏳ **Pending:** ${pending}\n\nI've generated an analytics card below.`,
        quickActions: ['Detect Overload', 'Feedback Report', 'Assign Complaint'],
        widgetData: { type: 'stats', total, resolved }
      }
    }
    if (INTENTS.OVERLOAD.test(message)) {
      return {
        text: `${prefix}Based on AI analysis, the **Infrastructure** department is currently experiencing the highest volume of pending complaints. I recommend reassigning some cases to available faculty.\n\n**Action:** Admin Panel → Complaints → Reassign Teacher`,
        quickActions: ['Show Stats', 'Feedback Report', 'Manage Users']
      }
    }
  }

  // ── Teacher-specific ─────────────────────────────────────────────────────
  if (userRole === 'teacher') {
    if (INTENTS.ASSIGNED.test(message)) {
      return {
        text: `${prefix}**Viewing Your Assigned Complaints:**\n1. Go to **Teacher Dashboard**\n2. Click **My Complaints** tab\n3. Filter by status: Active / Resolved\n4. Click any complaint to view details & update status`,
        quickActions: ['Generate Templates', 'Update Status', 'Add Resolution Note']
      }
    }
    if (/(template|quick reply|generate)/i.test(message)) {
      const replies = await generateQuickReplies('Infrastructure')
      return {
        text: `${prefix}Here are **AI-generated Quick Reply templates** you can use:\n\n1. "${replies[0]}"\n2. "${replies[1]}"\n\nYou can also generate category-specific replies — just mention the category!`,
        quickActions: ['View Assigned', 'Generate More', 'Update Status']
      }
    }
    if (/(update status|mark resolved|close complaint)/i.test(message)) {
      return {
        text: `${prefix}**To Update a Complaint Status:**\n1. Go to **Teacher Dashboard**\n2. Click on the complaint\n3. Open the **Status** dropdown\n4. Select: In Progress / Resolved\n5. Add **Resolution Notes** (required)\n6. Click **Save Changes**`,
        quickActions: ['View Assigned', 'Generate Templates', 'Add Note']
      }
    }
    if (/(resolution note|add note|comment)/i.test(message)) {
      return {
        text: `${prefix}**To Add a Resolution Note:**\n1. Open the complaint from your dashboard\n2. Scroll to **Resolution Notes** field\n3. Type your detailed resolution steps\n4. Click **Update** to save\n\nStudents will be notified automatically! 📬`,
        quickActions: ['View Assigned', 'Update Status']
      }
    }
  }

  // ── Complaint ID Lookup ─────────────────────────────────────────────────
  const complaintIdMatch = message.match(/CMP-\d{4}/i)
  if (complaintIdMatch) {
    const cid = complaintIdMatch[0].toUpperCase()
    try {
      const complaint = await Complaint.findOne({ id: cid }) || await Complaint.findById(cid).catch(() => null)
      if (complaint) {
        return {
          text: `${prefix}Here is the status for **${cid}**:\n\n📋 **Title:** ${complaint.title || complaint.category}\n🏷️ **Status:** ${complaint.status}\n🏫 **Department:** ${complaint.department || 'N/A'}\n👤 **Assigned To:** ${complaint.assignedTeacherName || 'Pending Assignment'}\n📅 **Last Updated:** ${complaint.updatedAt ? new Date(complaint.updatedAt).toLocaleDateString() : 'N/A'}\n\n${complaint.resolutionNotes ? `✅ **Resolution Notes:** ${complaint.resolutionNotes}` : '⏳ Resolution in progress...'}`,
          quickActions: ['Track Another', 'Give Feedback', 'Contact Support']
        }
      } else {
        return {
          text: `${prefix}I couldn't find a complaint with ID **${cid}**. Please double-check the ID from your complaint history.`,
          quickActions: ['Submit Complaint', 'Contact Support', 'View Dashboard']
        }
      }
    } catch (e) { console.error(e) }
  }

  // ── Frustrated / Urgent users ────────────────────────────────────────────
  if (INTENTS.FRUSTRATED.test(message) && !isUrgent) {
    return {
      text: `💙 I completely understand your frustration, and I sincerely apologize for the delay.\n\n**Immediate Steps:**\n1. Check your complaint status → Dashboard → Complaint History\n2. If unresolved > 7 days, it qualifies for **auto-escalation**\n3. You can also contact Admin directly via the **Contact Support** page\n\nYou deserve a resolution. I'm escalating your concern! 🚀`,
      quickActions: ['Track Complaint', 'Contact Support', 'Submit New Complaint']
    }
  }

  // ── Login Help ────────────────────────────────────────────────────────────
  if (INTENTS.LOGIN.test(message)) {
    return {
      text: `${prefix}**How to Login to CampusResolve:**\n\n1. Open the CampusResolve portal\n2. Enter your **institutional email ID**\n3. Enter your **password**\n4. Click **Login**\n5. You'll be redirected to your role dashboard (Student / Teacher / Admin)\n\n💡 **Tip:** Use your college-assigned email address only.`,
      quickActions: ['Google Sign-In Help', 'Forgot Password?', 'Admin Login Help', 'Teacher Login Help']
    }
  }

  if (INTENTS.GOOGLE_LOGIN.test(message)) {
    return {
      text: `${prefix}**Google Sign-In Steps:**\n\n1. Click **"Continue with Google"** on the login screen\n2. Select your **institutional Gmail account**\n3. Grant the required permissions\n4. You'll be logged in automatically ✅\n\n⚠️ **Note:** Only pre-approved institutional email addresses can access CampusResolve. Personal Gmail accounts are not allowed.`,
      quickActions: ['Login Help', 'Forgot Password?', 'Contact Support']
    }
  }

  if (INTENTS.ADMIN_LOGIN.test(message)) {
    return {
      text: `${prefix}**Admin Login:**\n\n1. Go to the CampusResolve portal\n2. Enter your **admin email** (e.g. admin@campusresolve.edu)\n3. Enter your **admin password**\n4. Click Login — you'll access the **Admin Dashboard**\n\n🔐 Admin accounts are created by the system administrator. Contact your IT department if you need access.`,
      quickActions: ['Login Help', 'Reset Password', 'Contact Support']
    }
  }

  if (INTENTS.TEACHER_LOGIN.test(message)) {
    return {
      text: `${prefix}**Teacher / Faculty Login:**\n\n1. Go to the CampusResolve portal\n2. Enter your **Teacher ID** (e.g. TCH-CSE-001) as your username\n3. Enter your assigned **password**\n4. Click Login → access the **Teacher Dashboard**\n\n📋 **Department Teacher IDs:**\n- CSE: TCH-CSE-001\n- ECE: TCH-ECE-001\n- MECH: TCH-MECH-001\n- EEE: TCH-EEE-001\n- AIDS: TCH-AIDS-001\n- IT: TCH-IT-001`,
      quickActions: ['Login Help', 'Reset Password', 'Contact Support']
    }
  }

  // ── Password Reset ────────────────────────────────────────────────────────
  if (INTENTS.RESET_PASSWORD.test(message)) {
    return {
      text: `${prefix}**How to Reset Your Password:**\n\n1. Click **"Forgot Password"** on the login page\n2. Enter your registered **email ID**\n3. Check your **Gmail** for the OTP\n4. Enter the OTP on the verification screen\n5. Create a **new strong password**\n6. Click Save — then login again securely ✅\n\n⏱️ OTP is valid for **10 minutes** only.`,
      quickActions: ['Login Help', 'Google Sign-In Help', 'Contact Support']
    }
  }

  // ── Submit Complaint ──────────────────────────────────────────────────────
  if (INTENTS.SUBMIT_COMPLAINT.test(message)) {
    return {
      text: `${prefix}**How to Submit a Complaint:**\n\n1. Go to your **Student Dashboard**\n2. Click **"Complaint Form"** or **"Submit Complaint"**\n3. Fill in all required details:\n   - Title, Description, Department\n   - Category (AI will auto-suggest!)\n4. Optionally assign a preferred teacher\n5. Click **Submit** ✅\n\n💡 **AI Tip:** Type a detailed description and I'll suggest the right category and priority for you!`,
      quickActions: ['Track Complaint', 'AI Writing Help', 'View Dashboard']
    }
  }

  // ── Track Complaint ───────────────────────────────────────────────────────
  if (INTENTS.TRACK_COMPLAINT.test(message)) {
    return {
      text: `${prefix}**How to Track Your Complaint:**\n\nEnter your **Complaint ID** (format: CMP-1234) and I'll look it up instantly! 🔍\n\nOr you can:\n1. Go to **Dashboard → Complaint History**\n2. Filter by status: Submitted / In Progress / Resolved\n3. Click any complaint to view full details\n\n📌 Your Complaint ID is shown in the confirmation email when you submit.`,
      quickActions: ['Submit Complaint', 'Contact Support', 'View Dashboard'],
      widgetData: { type: 'awaiting_id', hint: 'Type your Complaint ID (e.g. CMP-1001)' }
    }
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  if (INTENTS.FEEDBACK.test(message)) {
    return {
      text: `${prefix}**How to Submit Feedback:**\n\n1. Go to **Dashboard → Feedback Portal**\n2. Select a **resolved complaint** to rate\n3. Rate your experience across metrics:\n   - Response Speed ⭐\n   - Resolution Quality ⭐\n   - Teacher Communication ⭐\n4. Write a comment (AI can help enhance it! ✨)\n5. Click **Submit Feedback**\n\n📊 Your feedback helps improve campus services for everyone!`,
      quickActions: ['Submit Complaint', 'AI Writing Help', 'View Notifications']
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  if (INTENTS.NOTIFICATION.test(message)) {
    return {
      text: `${prefix}**How Notifications Work:**\n\n🔔 Click the **Bell icon** in the top navigation bar to see all updates.\n\n**Types of Notifications:**\n- 📌 Complaint Submitted confirmation\n- 👤 Complaint Assigned to teacher\n- 🔄 Status Updated (In Progress)\n- ✅ Complaint Resolved\n- 📝 Feedback Reminder\n- 📧 OTP / Password Reset alerts\n\nNotifications are delivered in **real-time** via Socket.io!`,
      quickActions: ['Track Complaint', 'Give Feedback', 'View Dashboard']
    }
  }

  // ── Profile Help ──────────────────────────────────────────────────────────
  if (INTENTS.PROFILE.test(message)) {
    return {
      text: `${prefix}**Profile Management Guide:**\n\n👤 **Update Profile:**\n→ Click your avatar (top-right) → Profile Settings → Edit\n\n🔑 **Change Password:**\n→ Profile → Security Settings → Change Password\n\n📷 **Upload Profile Picture:**\n→ Profile → Click avatar → Upload Photo\n\n📋 **View Activity History:**\n→ Profile → Activity History tab\n\n✨ **Generate AI Bio:**\n→ Profile → Edit → Click "Generate with AI" button`,
      quickActions: ['Change Password', 'Login Help', 'View Dashboard']
    }
  }

  // ── Contact Support ───────────────────────────────────────────────────────
  if (INTENTS.CONTACT_SUPPORT.test(message)) {
    return {
      text: `${prefix}**Contact & Support Options:**\n\n1. 📧 **Email Support** → Use the Contact page in the portal\n2. 🏛️ **Visit Office** → Coordinator's office for urgent issues\n3. 📢 **Escalate Complaint** → Complaints pending > 7 days are auto-escalated\n4. 🤖 **AI Assistant** → I'm always here! Just ask me anything.\n\n**Emergency?** Please visit the campus coordinator's office directly.`,
      quickActions: ['Submit Complaint', 'Track Complaint', 'Reset Password']
    }
  }

  // ── Dashboard Navigation ──────────────────────────────────────────────────
  if (INTENTS.DASHBOARD.test(message)) {
    const roleActions = {
      admin: ['View Analytics', 'Manage Users', 'Assign Complaints', 'Broadcast Announcement'],
      teacher: ['View Assigned', 'Update Status', 'View Ratings'],
      student: ['Submit Complaint', 'Track Complaint', 'Give Feedback', 'View Notifications']
    }
    return {
      text: `${prefix}**Your Dashboard — Quick Navigation:**\n\n${(roleActions[userRole] || roleActions.student).map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n💡 Use the **sidebar menu** to navigate between sections. Your role-specific features are pre-loaded!`,
      quickActions: roleActions[userRole] || roleActions.student
    }
  }

  // ── Greeting ──────────────────────────────────────────────────────────────
  if (INTENTS.GREETING.test(message)) {
    const roleGreeting = {
      admin: { text: 'Hello Admin! 🛡️ I have live campus data ready. What would you like to monitor today?', actions: ['Show Stats', 'Feedback Report', 'Detect Overload', 'Manage Users'] },
      teacher: { text: 'Hello Faculty! 🎓 I can help you manage assigned complaints, generate quick replies, or summarize pending issues.', actions: ['View Assigned', 'Generate Templates', 'Update Status', 'View Ratings'] },
      student: { text: 'Hello! 👋 I\'m your CampusResolve AI Assistant. How can I help you today?', actions: ['Submit Complaint', 'Track Complaint', 'Reset Password', 'Give Feedback'] }
    }
    const g = roleGreeting[userRole] || roleGreeting.student
    return { text: g.text, quickActions: g.actions }
  }

  // ── Thanks ────────────────────────────────────────────────────────────────
  if (INTENTS.THANKS.test(message)) {
    return {
      text: "You're very welcome! 😊 I'm always here if you need anything else. Have a great day!",
      quickActions: ['Submit Complaint', 'Track Complaint', 'Give Feedback']
    }
  }

  // ── AI Writing Assistant (long draft detection) ───────────────────────────
  if (message.length > 50 && !INTENTS.SUBMIT_COMPLAINT.test(message) && !INTENTS.TRACK_COMPLAINT.test(message) && !INTENTS.FEEDBACK.test(message)) {
    const [suggestedCategory, predictedPriority, summary] = await Promise.all([
      autoSuggestCategory(message),
      predictPriority(message),
      generateSummary(message)
    ])
    return {
      text: `${prefix}It looks like you're describing a complaint. Here is my **AI Analysis**:\n\n📝 **Suggested Title:** ${summary}\n🏷️ **Detected Category:** ${suggestedCategory}\n⚡ **Predicted Priority:** ${predictedPriority}\n\nWould you like to formally submit this as a complaint?`,
      quickActions: ['Submit Complaint', 'Improve My Text', 'Contact Support']
    }
  }

  // ── Gemini AI Fallback ────────────────────────────────────────────────────
  const geminiAnswer = await answerChatbotQuestion(message, { role: userRole, lang, isUrgent })
  return {
    text: geminiAnswer,
    quickActions: userRole === 'admin'
      ? ['Show Stats', 'Feedback Report', 'Detect Overload']
      : userRole === 'teacher'
        ? ['View Assigned', 'Generate Templates', 'Update Status']
        : ['Submit Complaint', 'Track Complaint', 'Contact Support']
  }
}

// ─── POST /api/chatbot/message ────────────────────────────────────────────────
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId, userId, userRole, lang = 'en', isUrgent = false } = req.body
    if (!message) return res.status(400).json({ error: 'Message is required' })

    const currentSessionId = sessionId || crypto.randomUUID()

    // Detect frustration from message even if not flagged by frontend
    const autoUrgent = isUrgent || INTENTS.FRUSTRATED.test(message)

    const botResponse = await generateResponse(message, userRole, lang, autoUrgent)

    // Log asynchronously
    setImmediate(async () => {
      try {
        await ChatLog.updateOne(
          { sessionId: currentSessionId },
          {
            $set: { userId, userRole: userRole || 'guest' },
            $push: {
              messages: {
                $each: [
                  { sender: 'user', text: message },
                  { sender: 'bot', text: botResponse.text }
                ]
              }
            }
          },
          { upsert: true }
        )
      } catch (logError) { console.error('Failed to log chat:', logError) }
    })

    setTimeout(() => {
      res.json({
        sessionId: currentSessionId,
        text: botResponse.text,
        quickActions: botResponse.quickActions,
        widgetData: botResponse.widgetData || null,
        isUrgent: autoUrgent
      })
    }, 400)

  } catch (error) {
    console.error('Chatbot error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

// ─── GET /api/chatbot/logs (admin only) ───────────────────────────────────────
router.get('/logs', protect, authorize('admin'), async (req, res) => {
  try {
    const logs = await ChatLog.find().sort({ updatedAt: -1 }).limit(100)
    res.json(logs)
  } catch (error) {
    console.error('Failed to fetch chat logs:', error)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// ─── POST /api/chatbot/enhance-text ──────────────────────────────────────────
router.post('/enhance-text', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: 'Text is required' })
    const enhanced = await enhanceFeedbackText(text)
    res.json({ enhanced })
  } catch (error) {
    console.error('Enhance text error:', error)
    res.status(500).json({ error: 'Failed to enhance text' })
  }
})

// ─── POST /api/chatbot/generate-bio ──────────────────────────────────────────
router.post('/generate-bio', async (req, res) => {
  try {
    const { name, role, department } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const bio = await generateBio(name, role || 'student', department || '')
    res.json({ bio })
  } catch (error) {
    console.error('Generate bio error:', error)
    res.status(500).json({ error: 'Failed to generate bio' })
  }
})

const mongoose = require('mongoose')

// ─── POST /api/chatbot/user-context ──────────────────────────────────────────
router.post('/user-context', async (req, res) => {
  try {
    const { userId, userRole } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })
    if (mongoose.connection.readyState !== 1) {
      return res.json({ role: userRole, total: 0, resolved: 0, pending: 0, inProgress: 0 })
    }
    let contextData = { role: userRole }
    if (userRole === 'student') {
      const [total, resolved, pending, inProgress, resolvedWithoutFeedback] = await Promise.all([
        Complaint.countDocuments({ studentId: userId }).catch(() => 0),
        Complaint.countDocuments({ studentId: userId, status: 'Resolved' }).catch(() => 0),
        Complaint.countDocuments({ studentId: userId, status: { $in: ['Submitted', 'Assigned'] } }).catch(() => 0),
        Complaint.countDocuments({ studentId: userId, status: 'In Progress' }).catch(() => 0),
        Complaint.find({ studentId: userId, status: 'Resolved', $or: [{ studentFeedback: '' }, { studentFeedback: null }, { studentFeedback: { $exists: false } }] })
          .select('_id title category').limit(3).lean().catch(() => [])
      ])
      contextData = { role: userRole, total, resolved, pending, inProgress, resolvedWithoutFeedback }
    } else if (userRole === 'admin') {
      const [total, resolved, pending] = await Promise.all([
        Complaint.countDocuments().catch(() => 0),
        Complaint.countDocuments({ status: 'Resolved' }).catch(() => 0),
        Complaint.countDocuments({ status: { $in: ['Submitted', 'Assigned'] } }).catch(() => 0),
      ])
      contextData = { role: userRole, total, resolved, pending }
    } else if (userRole === 'teacher') {
      const [assigned, resolved] = await Promise.all([
        Complaint.countDocuments({ assignedTeacherId: userId }).catch(() => 0),
        Complaint.countDocuments({ assignedTeacherId: userId, status: 'Resolved' }).catch(() => 0)
      ])
      contextData = { role: userRole, assigned, resolved }
    }
    res.json(contextData)
  } catch (error) {
    console.error('User context error:', error)
    res.status(500).json({ error: 'Failed to fetch user context' })
  }
})

module.exports = router
