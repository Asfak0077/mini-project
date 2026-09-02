/**
 * AI Engine — powered by Google Gemini API (gemini-1.5-flash)
 * Falls back gracefully to the rule-based simulator if the key is missing or the API call fails.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')

// ── Gemini setup ─────────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY
let geminiModel = null

if (GEMINI_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    console.log('[AI] Gemini 2.0 Flash ready ✅')
  } catch (e) {
    console.warn('[AI] Gemini init failed, using rule-based fallback:', e.message)
  }
} else {
  console.warn('[AI] GEMINI_API_KEY not set — using rule-based fallback')
}

/**
 * Ask Gemini a question; returns null on any error so callers can fall back.
 */
const askGemini = async (prompt) => {
  if (!geminiModel) return null
  try {
    const result = await geminiModel.generateContent(prompt)
    return result.response.text().trim()
  } catch (err) {
    console.warn('[AI] Gemini call failed:', err.message)
    return null
  }
}

// ── Rule-based fallbacks ──────────────────────────────────────────────────────
const _ruleAnalyzeSentiment = (text) => {
  const lower = text.toLowerCase()
  const neg = ['bad', 'terrible', 'worst', 'angry', 'upset', 'fail', 'unprofessional', 'late', 'ignore']
  const pos = ['good', 'great', 'excellent', 'amazing', 'helpful', 'fast', 'solved', 'thanks', 'appreciate']
  let score = 0
  neg.forEach(w => { if (lower.includes(w)) score -= 1 })
  pos.forEach(w => { if (lower.includes(w)) score += 1 })
  if (score < 0) return 'Negative 🔴 (Needs Admin Review)'
  if (score > 0) return 'Positive 🟢'
  return 'Neutral ⚪'
}

const _ruleQuickReplies = (category) => {
  const templates = {
    Infrastructure: [
      "We've logged the maintenance request. A technician will inspect the area shortly.",
      "Parts have been ordered to fix this issue. We expect resolution in 2-3 days."
    ],
    Academics: [
      "Please meet me during office hours to discuss this further.",
      "The syllabus discrepancy has been noted and will be corrected in the portal."
    ],
    Transport: [
      "The transport coordinator has been informed about the route delay.",
      "We are adjusting the bus schedule. Please check the notice board tomorrow."
    ]
  }
  return templates[category] || [
    "Thank you for bringing this to my attention. I am looking into it.",
    "This issue has been resolved. Let me know if you face further problems."
  ]
}

const _ruleSuggestCategory = (description) => {
  const d = description.toLowerCase()
  if (d.match(/(fan|light|projector|wifi|internet|desk|chair|water|washroom|ac|cleaning)/)) return 'Infrastructure'
  if (d.match(/(marks|grade|exam|syllabus|teacher|class|lecture|notes|assignment)/)) return 'Academics'
  if (d.match(/(bus|driver|route|timing|transport|stop)/)) return 'Transport'
  if (d.match(/(fee|payment|fine|due|scholarship)/)) return 'Financial'
  if (d.match(/(hostel|mess|food|room|warden)/)) return 'Hostel'
  return 'General'
}

const _rulePriority = (description) => {
  const d = description.toLowerCase()
  if (d.match(/(emergency|urgent|fire|harassment|fight|immediate|danger|safety|health)/)) return 'Urgent'
  if (d.match(/(exam tomorrow|deadline|broken projector|no wifi|blocked)/)) return 'high'
  if (d.match(/(noisy|cleaning|bus late|marks mismatch)/)) return 'medium'
  return 'low'
}

const _ruleEnhanceFeedback = (shortText) => {
  const t = shortText.toLowerCase().trim()
  const expansions = [
    { match: /(teacher|faculty).*(good|great|nice|ok|fine|helpful)/, result: "The faculty member handled this complaint with great professionalism and provided timely, effective assistance." },
    { match: /(teacher|faculty).*(bad|poor|slow|late|rude|unhelpful)/, result: "The response from the faculty was below expectations. There is room for improvement in communication and responsiveness." },
    { match: /(resolved|solved|fixed|done|complete)/, result: "The complaint was resolved promptly and completely. I am satisfied with the outcome." },
    { match: /(slow|late|delay|long time|took time)/, result: "While the issue was eventually resolved, the response time was slower than expected." },
    { match: /(fast|quick|prompt|immediate|rapid)/, result: "The complaint was addressed with impressive speed. The faculty member responded quickly." },
    { match: /(thank|thanks|appreciate|grateful)/, result: "I sincerely appreciate the effort and dedication shown in resolving this complaint." },
    { match: /(no response|ignored|no reply|not resolved)/, result: "Unfortunately, the complaint did not receive an adequate response and requires further attention." },
  ]
  for (const e of expansions) {
    if (e.match.test(t)) return e.result
  }
  let clean = shortText.replace(/^i want to give feedback for.*?:/i, '').replace(/in [a-z0-9\s]+ department\.?/i, '').replace(/["']/g, '').trim()
  if (!clean || clean.length < 3) clean = 'The reported grievance'
  const cap = clean.charAt(0).toUpperCase() + clean.slice(1)
  return `The issue regarding ${cap.toLowerCase()} was resolved. Overall, the complaint management process was handled adequately.`
}

// ── Language prefix helper ────────────────────────────────────────────────────
const getLangInstruction = (lang) => {
  if (lang === 'ta') return 'Respond entirely in Tamil language (தமிழ்). '
  if (lang === 'hi') return 'Respond entirely in Hindi language (हिंदी). '
  return ''
}

// ── Exported AI functions ─────────────────────────────────────────────────────

/**
 * Analyze sentiment of feedback text using Gemini, fallback to rule engine.
 */
const analyzeSentiment = async (text) => {
  const prompt = `Analyze the sentiment of the following student feedback text and respond with ONLY one of these labels: "Positive 🟢", "Neutral ⚪", or "Negative 🔴 (Needs Admin Review)". No other text.\n\nFeedback: "${text}"`
  const result = await askGemini(prompt)
  if (result && (result.includes('Positive') || result.includes('Neutral') || result.includes('Negative'))) {
    return result
  }
  return _ruleAnalyzeSentiment(text)
}

/**
 * Generate 2 smart quick-reply suggestions for a teacher based on complaint category + description.
 */
const generateQuickReplies = async (category, description = '') => {
  const prompt = `You are a university complaint management assistant. Generate exactly 2 short, professional reply suggestions a teacher can send to a student for a "${category}" complaint. Context: "${description}". Format: return only 2 lines, each on its own line, no bullet points, no numbering, no quotes.`
  const result = await askGemini(prompt)
  if (result) {
    const lines = result.split('\n').map(l => l.trim()).filter(l => l.length > 10)
    if (lines.length >= 2) return [lines[0], lines[1]]
  }
  return _ruleQuickReplies(category)
}

/**
 * Auto-suggest category from description.
 */
const autoSuggestCategory = async (description) => {
  const prompt = `Classify the following university student complaint into exactly one category. Categories: Infrastructure, Academics, Transport, Financial, Hostel, General. Reply with ONLY the category name.\n\nComplaint: "${description}"`
  const result = await askGemini(prompt)
  const validCats = ['Infrastructure', 'Academics', 'Transport', 'Financial', 'Hostel', 'General']
  if (result && validCats.includes(result.trim())) return result.trim()
  return _ruleSuggestCategory(description)
}

/**
 * Predict priority from description.
 */
const predictPriority = async (description) => {
  const prompt = `Based on the following university complaint description, predict the priority level. Reply with ONLY one of: Urgent, high, medium, low.\n\nComplaint: "${description}"`
  const result = await askGemini(prompt)
  const validP = ['Urgent', 'high', 'medium', 'low']
  if (result && validP.includes(result.trim())) return result.trim()
  return _rulePriority(description)
}

/**
 * Generate a one-sentence summary of a complaint.
 */
const generateSummary = async (description) => {
  const prompt = `Summarize the following university student complaint in one clear sentence (max 60 characters).\n\nComplaint: "${description}"`
  const result = await askGemini(prompt)
  if (result && result.length > 5) {
    return result.length > 80 ? result.substring(0, 77) + '...' : result
  }
  const first = description.split('.')[0] || description
  return first.length > 50 ? first.substring(0, 47) + '...' : first
}

/**
 * Enhance student feedback text based on selected style/mode using Gemini.
 * @param {string} text
 * @param {'improve' | 'detailed' | 'short' | 'professional'} mode
 */
const enhanceFeedbackText = async (text, mode = 'improve') => {
  if (!text || typeof text !== 'string') return ''
  const trimmed = text.trim()
  if (!trimmed) return ''

  let stylePrompt = ''
  switch (mode) {
    case 'detailed':
      stylePrompt = 'Expand and elaborate on the following student feedback to be thorough, constructive, and detailed (3-4 sentences), noting the resolution quality, turnaround, and specific highlights or areas of follow-up.'
      break
    case 'short':
      stylePrompt = 'Condense and summarize the following student feedback into 1-2 concise, impactful, and constructive sentences.'
      break
    case 'professional':
      stylePrompt = 'Refine the following student feedback into an exceptionally professional, formal, polite, and constructive tone suitable for university academic governance and administration.'
      break
    case 'improve':
    default:
      stylePrompt = 'Rewrite and polish the following student feedback to be clearer, well-articulated, polite, and constructive (2 sentences).'
      break
  }

  const prompt = `${stylePrompt} Keep it respectful and actionable. Return ONLY the polished feedback text without quotes, introductory text, or labels.\n\nOriginal student feedback: "${trimmed}"`
  
  const result = await askGemini(prompt)
  if (result && result.length > 15) return result.replace(/^["']|["']$/g, '').trim()

  // Fallback to rule-based enhancement
  if (mode === 'short') {
    return trimmed.length > 120 ? trimmed.slice(0, 120) + '...' : trimmed
  }
  return _ruleEnhanceFeedback(trimmed)
}


/**
 * Generate a professional user bio using Gemini.
 */
const generateBio = async (name, role, department) => {
  const prompt = `Write a short, professional 2-sentence bio for a ${role} named "${name}" in the ${department || 'university'} department at a university. It should be suitable for an academic profile page. Return ONLY the bio text.`
  const result = await askGemini(prompt)
  if (result && result.length > 20) return result
  return `${name} is a dedicated ${role} at CampusResolve, committed to academic excellence and continuous improvement in the ${department || 'university'} department.`
}

/**
 * Generate an admin insight from feedback analytics.
 */
const generateFeedbackAnalyticsInsight = async (avgRating, negativeCount, topDept) => {
  const prompt = `Generate a 3-bullet insight report for a university admin based on these feedback metrics:
- Average student rating: ${avgRating}/5
- Negative feedback count this period: ${negativeCount}
- Department with most complaints: ${topDept || 'N/A'}

Format as 3 short bullet lines starting with relevant emojis. Be direct and actionable.`
  const result = await askGemini(prompt)
  if (result && result.length > 20) return result

  // Rule-based fallback
  const insights = []
  if (avgRating >= 4.5) {
    insights.push('🌟 Overall student satisfaction is excellent across all departments.')
  } else if (avgRating >= 3.5) {
    insights.push('📊 Student satisfaction is moderate. There is room for improvement in response speed.')
  } else {
    insights.push('⚠️ Student satisfaction is below average. Immediate review of complaint handling processes is recommended.')
  }
  if (negativeCount > 5) {
    insights.push(`🔴 ${topDept || 'Multiple departments'} received a high volume of low-rated feedback this period.`)
  }
  insights.push('💡 Recommendation: Schedule faculty performance reviews and monitor recurring complaint categories.')
  return insights.join('\n')
}

// ─── Structured Complaint Extraction (Gemini + Rule Fallback) ─────────────────

const _ruleExtractLocation = (text) => {
  if (/seminar\s*hall/i.test(text)) return 'Seminar Hall'
  if (/library/i.test(text)) return 'Central Library'
  if (/canteen|cafeteria/i.test(text)) return 'Campus Canteen'
  if (/mess/i.test(text)) return 'Hostel Mess'
  if (/auditorium/i.test(text)) return 'Main Auditorium'
  
  const roomMatch = text.match(/\b(room|lab|hall|block)\s+([A-Za-z0-9\-]+)/i)
  if (roomMatch && !/^(number|name|affected|details|here)$/i.test(roomMatch[2])) {
    return `${roomMatch[1].charAt(0).toUpperCase() + roomMatch[1].slice(1).toLowerCase()} ${roomMatch[2].toUpperCase()}`
  }

  const locRegex = /(?:in|at|near|inside|around)\s+([A-Za-z0-9\s]{2,20})/i
  const m = text.match(locRegex)
  if (m) {
    let loc = m[1].trim()
    loc = loc.replace(/\s+(has|is|was|are|were|for|and|to|since|with|the|been|flickering|broken|stopped|damaged)\b.*$/i, '')
    if (loc.length >= 3 && !/^(the|a|an|my|our)$/i.test(loc)) {
      return loc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    }
  }
  return ''
}

const _ruleExtractDraft = (text, history = []) => {
  const userMessages = (Array.isArray(history) ? history : [])
    .filter(h => h.sender === 'user')
    .map(h => h.text || '')
  const fullText = [...userMessages, text].filter(Boolean).join('. ')
  const category = _ruleSuggestCategory(fullText)
  const priority = _rulePriority(fullText)
  const location = _ruleExtractLocation(fullText) || _ruleExtractLocation(text)
  
  let firstProblem = userMessages[0] || text
  let title = firstProblem.slice(0, 50).trim()
  if (location && !title.toLowerCase().includes(location.toLowerCase())) {
    title = `${location} - ${title}`
  }
  if (title.length > 55) title = title.slice(0, 52) + '...'
  title = title.charAt(0).toUpperCase() + title.slice(1)

  const isComplete = Boolean(location && location !== 'Campus Premises')
  const missing = []
  if (!location || location === 'Campus Premises') missing.push('location')
  if (fullText.length < 15) missing.push('details')

  return {
    title: title || 'Campus Issue',
    description: fullText.trim(),
    category,
    department: 'CSE',
    location: location || 'Campus Premises',
    priority,
    isComplete,
    missingFields: missing,
    suggestedQuestion: missing.includes('location')
      ? 'Which building, department, or room is affected?'
      : ''
  }
}

/**
 * Extract structured complaint details using Gemini 1.5 Flash.
 */
const extractComplaintDraft = async (text, history = [], userDept = 'CSE') => {
  const historySnippet = history.slice(-4).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: "${m.text}"`).join('\n')
  
  const prompt = `You are the CampusResolve Complaint Intake AI.
Extract structured complaint data from the conversation history and the latest user message.

Valid categories: Infrastructure, Academics, Transport, Financial, Hostel, General.
Valid priorities: low, medium, high, Urgent.
Valid departments: CSE, ECE, MECH, EEE, AIDS, IT, General.

Conversation history:
${historySnippet || 'None'}

Latest user message: "${text}"

Respond with ONLY a raw JSON object (no markdown fences, no extra text) conforming to this exact schema:
{
  "title": "Short descriptive title (max 50 chars)",
  "description": "Clear, professional description of the grievance",
  "category": "One of the valid categories",
  "department": "${userDept || 'CSE'}",
  "location": "Specific room, hall, building, or location if mentioned, or empty string if not mentioned",
  "priority": "One of: low, medium, high, Urgent",
  "isComplete": true/false (true if both specific problem and location are clear),
  "missingFields": ["location"] or ["details"] or [],
  "suggestedQuestion": "Friendly follow-up question asking for the missing detail if not complete, else empty string"
}`

  const raw = await askGemini(prompt)
  if (raw) {
    try {
      const clean = raw.replace(/```json/gi, '').replace(/```/gi, '').trim()
      const parsed = JSON.parse(clean)
      if (parsed.title && parsed.category) {
        return {
          title: parsed.title,
          description: parsed.description || text,
          category: parsed.category,
          department: parsed.department || userDept || 'CSE',
          location: parsed.location || _ruleExtractLocation(text) || 'Campus Premises',
          priority: (parsed.priority || 'medium').toLowerCase() === 'urgent' ? 'Urgent' : (parsed.priority || 'medium').toLowerCase(),
          isComplete: parsed.isComplete ?? Boolean(parsed.location),
          missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : (!parsed.location ? ['location'] : []),
          suggestedQuestion: parsed.suggestedQuestion || (!parsed.location ? 'Which building, room, or area is affected?' : '')
        }
      }
    } catch (e) {
      // Fall through to rule fallback
    }
  }

  return _ruleExtractDraft(text, history)
}

/**
 * Evaluates the quality of a complaint draft and returns missing requirements.
 */
const evaluateComplaintQuality = (draft, rawText) => {
  const missing = []
  const text = (draft.description || rawText || '').trim().toLowerCase()

  if (!draft.location || draft.location === 'Campus Premises' || draft.location === '' || draft.location === 'not specified') {
    // Check if location was mentioned in raw text
    const loc = _ruleExtractLocation(text)
    if (!loc) {
      missing.push('location')
    }
  }

  if (text.length < 15 || text.split(' ').length < 3) {
    missing.push('clear problem description')
  }

  return {
    isComplete: missing.length === 0,
    missing,
    suggestedQuestion: missing.includes('location')
      ? 'Which building, lab, or room number is affected?'
      : missing.includes('clear problem description')
      ? 'Could you provide a few more details about what is happening?'
      : ''
  }
}

/**
 * Answer a database-backed question using verified real data and Gemini.
 */
const answerWithLiveContext = async (question, liveData, context = {}) => {
  const { role = 'student', userName = 'User', lang = 'en' } = context
  const langInstruction = getLangInstruction(lang)

  const prompt = `${langInstruction}You are the CampusResolve AI Assistant.
A user (${role}, named "${userName}") asked: "${question}"

Below is VERIFIED, AUTHORIZED live data retrieved directly from the CampusResolve database:
----------------------------------------
${JSON.stringify(liveData, null, 2)}
----------------------------------------

RULES:
1. Answer the user's question accurately using ONLY the verified data provided above.
2. NEVER invent complaint IDs, ticket numbers, statuses, dates, or resolution notes that are not in the data.
3. If no matching records exist in the verified data, clearly and politely inform the user that no records were found.
4. Format the response cleanly in markdown with bullet points or bold text where appropriate.
5. Keep your answer helpful, professional, and concise (under 4-5 sentences).`

  const result = await askGemini(prompt)
  if (result && result.length > 10) return result

  // Rule-based live data summary fallback
  if (liveData.complaint) {
    const c = liveData.complaint
    return `Here is the verified status for **${c.complaintId || c._id}**:\n\n📋 **Title:** ${c.title || c.category}\n🏷️ **Status:** ${c.status}\n⚡ **Priority:** ${c.priority}\n🏫 **Department:** ${c.department || 'N/A'}\n👤 **Assigned To:** ${c.assignedTeacherName || 'Pending Assignment'}\n📅 **Created:** ${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}\n\n${c.resolutionNotes ? `✅ **Resolution Notes:** ${c.resolutionNotes}` : '⏳ Resolution in progress.'}`
  }

  if (Array.isArray(liveData.complaints)) {
    if (liveData.complaints.length === 0) {
      return `No matching complaints were found in your record.`
    }
    const list = liveData.complaints.slice(0, 5).map((c, i) =>
      `${i + 1}. **${c.complaintId || c._id}** — *${c.title || c.category}* | Status: **${c.status}** (${c.priority || 'medium'})`
    ).join('\n')
    return `Here are your verified complaints:\n\n${list}\n\nType the Complaint ID (e.g., **${liveData.complaints[0].complaintId || 'CR-001'}**) for full details!`
  }

  if (liveData.stats) {
    const s = liveData.stats
    return `Here are the live campus platform statistics:\n- 📌 **Total Complaints:** ${s.total ?? 0}\n- ⏳ **Pending / Assigned:** ${s.pending ?? 0}\n- 🔄 **In Progress:** ${s.inProgress ?? 0}\n- ✅ **Resolved:** ${s.resolved ?? 0}`
  }

  return "I've fetched your records from the system. Please let me know if you need specific details."
}

/**
 * Answer a campus assistant chatbot question using Gemini.
 */
const answerChatbotQuestion = async (question, context = {}) => {
  const { currentPage, role, userName, lang, isUrgent } = context
  const lowerQ = (question || '').toLowerCase()

  // ── Public Knowledge Base Fast Answers ──────────────────────────────────────
  if (/what is campusresolve|about campusresolve/i.test(lowerQ)) {
    return "🏛️ **CampusResolve** is an intelligent university grievance and infrastructure redressal platform. It enables students to report campus issues, receive automated faculty assignments, track real-time resolution stages, and submit confidential service feedback."
  }
  if (/how (do i|to) submit a complaint|file a complaint|submit grievance|create a complaint/i.test(lowerQ)) {
    return "📝 **Submitting a Complaint:**\n1. Sign in to your CampusResolve account using your Velammal Student ID or Google account.\n2. Navigate to **File Grievance** or ask the AI Assistant.\n3. Select the category (e.g., Infrastructure, Lab Equipment, Hostel, Canteen), specify the location (Block/Lab/Room), describe the issue, and submit.\n4. Your ticket will be automatically assigned to the departmental faculty coordinator."
  }
  if (/types of complaints|categories|supported complaints|what can i report/i.test(lowerQ)) {
    return "📌 **Supported Complaint Categories:**\n• **Infrastructure:** Classrooms, furniture, lighting, fans, projectors\n• **Lab Equipment:** Computers, ACs, network switches, lab hardware\n• **Hostel Facilities:** Room maintenance, plumbing, electrical, hot water\n• **Sanitation & Hygiene:** Restroom cleanliness, water dispensers, waste management\n• **Canteen & Mess:** Food quality, hygiene, service\n• **Academic & Administration:** Timetable, library, transportation, administrative inquiries"
  }
  if (/how does feedback work|feedback information|rate resolution|about feedback/i.test(lowerQ)) {
    return "⭐ **How Feedback Works:**\nOnce an assigned faculty resolves your complaint, it becomes eligible for feedback. You can evaluate **Resolution Quality**, **Response Time**, and **Communication** using our 5-star rating system. Feedback is confidential and helps departments continuously improve campus services."
  }
  if (/how (do i|to) track|tracking|check status/i.test(lowerQ)) {
    return "🔍 **Complaint Tracking:**\nAfter logging in, open your **Student Dashboard** or **Complaint History** to view the live status of your tickets (`Submitted` → `Assigned` → `In Progress` → `Resolved`). You can also view official resolution remarks from the assigned faculty."
  }
  if (/login help|sign in help|how to login|forgot password|account help/i.test(lowerQ)) {
    return "🔐 **Login & Account Help:**\n• **Students:** Sign in using your registered Roll Number / Student ID (e.g., `23VEC371`) or official Google institutional account.\n• **Faculty:** Use your Faculty ID (e.g., `TCH-CSE-001`) and institutional password.\n• If you encounter password issues, click the **Forgot Password** link on the login page or contact the IT Helpdesk."
  }

  const langInstruction = getLangInstruction(lang)
  const empathyNote = isUrgent
    ? 'The user seems frustrated or stressed. Begin your response with a brief empathetic statement before giving the answer. '
    : ''

  const prompt = `${langInstruction}${empathyNote}You are CampusResolve AI Assistant — a smart, friendly virtual assistant for a university complaint and grievance management system called CampusResolve.

Platform features:
- Students can: submit complaints, track complaint status, view complaint history, give feedback, update profile, view notifications, use Google Sign-In
- Teachers can: view assigned complaints, update complaint status, add resolution notes, generate quick replies, view ratings
- Admins can: assign complaints to teachers, view platform analytics, manage users, broadcast announcements, view feedback reports, detect department overload

User Role: ${role || 'student'}
User Name: ${userName || 'User'}
Current Page: ${currentPage || 'Dashboard'}
Question: "${question}"

Answer helpfully in 2-4 sentences. Keep responses friendly, professional, and campus-specific. Do not mention external systems.`

  const result = await askGemini(prompt)
  if (result && result.length > 10) return result
  return "I'm here to help! Please use the navigation menu or sign in to access personal complaints, tracking, and resolution feedback."
}


// ─── AI Feedback Assistant Engine (Gemini + Rule Fallback) ───────────────────

const _ruleAnalyzeFeedback = (text) => {
  const lower = text.toLowerCase()
  const words = lower.trim().split(/\s+/)

  const isVague = words.length < 3 || /^(bad|good|ok|okay|fine|worst|nice|terrible|thanks)$/i.test(lower.trim())

  let hasPosQuality = /resolved|fixed|solved|done|completed|working|great job|well done/i.test(lower)
  let hasNegQuality = /not resolved|still broken|unsolved|poor quality|did not fix|not working/i.test(lower)
  let hasSlowTime = /took too long|slow|delayed|late|long time|took days|took weeks|delay/i.test(lower)
  let hasFastTime = /fast|quick|prompt|rapid|immediate|speedy/i.test(lower)
  let hasPoorComm = /no update|no response|ignored|didn't inform|did not receive updates|unresponsive|rude|no reply/i.test(lower)
  let hasGoodComm = /polite|helpful|good communication|kept updated|responsive|courteous/i.test(lower)

  let sentiment = 'Neutral'
  let suggestedRating = 3

  if ((hasPosQuality && (hasSlowTime || hasPoorComm)) || (/good.*but/i.test(lower)) || (/fixed.*however/i.test(lower))) {
    sentiment = 'Mixed'
    suggestedRating = 3
  } else if (hasNegQuality || (hasSlowTime && hasPoorComm) || /worst|terrible|horrible|angry|useless/i.test(lower)) {
    sentiment = 'Negative'
    suggestedRating = hasNegQuality ? 1 : 2
  } else if (hasPosQuality || hasFastTime || hasGoodComm || /excellent|amazing|very good|super/i.test(lower)) {
    sentiment = 'Positive'
    suggestedRating = 5
  }

  const topics = []
  if (hasPosQuality || hasNegQuality) topics.push('Resolution Quality')
  if (hasSlowTime || hasFastTime) topics.push('Response Time')
  if (hasPoorComm || hasGoodComm) topics.push('Communication')
  if (/staff|faculty|teacher|warden|coordinator/i.test(lower)) topics.push('Staff Behaviour')
  if (topics.length === 0) topics.push('Overall Experience')

  const resolutionQuality = hasNegQuality ? 'Poor' : (hasPosQuality ? 'Positive' : 'Satisfactory')
  const responseTime = hasSlowTime ? 'Poor' : (hasFastTime ? 'Good' : 'Moderate')
  const communication = hasPoorComm ? 'Poor' : (hasGoodComm ? 'Good' : 'Moderate')

  let suggestedFeedback = _ruleEnhanceFeedback(text)
  if (sentiment === 'Mixed') {
    suggestedFeedback = "The issue was eventually resolved successfully, but the resolution took longer than expected and I did not receive sufficient updates during the process."
  } else if (sentiment === 'Negative') {
    suggestedFeedback = "The resolution process was unsatisfactory due to excessive delays and lack of communication from the assigned team."
  }

  let suggestedFollowUp = sentiment === 'Negative' || sentiment === 'Mixed'
    ? "We apologize that the resolution took longer than expected. Could you please confirm whether the issue is now fully resolved?"
    : "Thank you for sharing your feedback with us. We will continue striving to provide prompt service."

  return {
    sentiment,
    resolutionQuality,
    responseTime,
    communication,
    suggestedRating,
    topics,
    summary: sentiment === 'Negative' || sentiment === 'Mixed'
      ? "Student reported concerns regarding resolution delays and communication."
      : "Student expressed overall satisfaction with the grievance handling.",
    suggestedFeedback,
    suggestedFollowUp,
    isMeaningful: !isVague,
    missingAspects: isVague ? ['Response Time', 'Communication', 'Resolution Quality'] : []
  }
}

/**
 * Intelligently analyze student feedback using Gemini 1.5 Flash.
 */
const analyzeFeedback = async (text) => {
  const prompt = `You are the CampusResolve AI Feedback Analyst.
Analyze the following student feedback about a resolved campus complaint:
Feedback text: "${text}"

Respond with ONLY a raw JSON object (no markdown fences, no extra text) conforming to this exact schema:
{
  "sentiment": "Positive" or "Neutral" or "Mixed" or "Negative",
  "resolutionQuality": "Positive" or "Satisfactory" or "Poor",
  "responseTime": "Good" or "Moderate" or "Poor",
  "communication": "Good" or "Moderate" or "Poor",
  "suggestedRating": 1 to 5 integer,
  "topics": ["Resolution Quality", "Response Time", "Communication", "Staff Behaviour", "Technical Quality", "Overall Experience"],
  "summary": "1 concise sentence summarizing student feedback sentiment and cause",
  "suggestedFeedback": "1 polished constructive sentence expanding the student's thought professionally without altering their intent",
  "suggestedFollowUp": "1 professional follow-up question for faculty/admin if negative or mixed, else empty string",
  "isMeaningful": true/false (false if just 1-2 generic words like 'bad', 'ok', 'good'),
  "missingAspects": ["Response Time", "Communication", "Resolution Quality"] if not meaningful, else []
}`

  const raw = await askGemini(prompt)
  if (raw) {
    try {
      const clean = raw.replace(/```json/gi, '').replace(/```/gi, '').trim()
      const parsed = JSON.parse(clean)
      if (parsed.sentiment && parsed.suggestedRating) {
        return {
          sentiment: parsed.sentiment,
          resolutionQuality: parsed.resolutionQuality || 'Satisfactory',
          responseTime: parsed.responseTime || 'Moderate',
          communication: parsed.communication || 'Moderate',
          suggestedRating: Math.min(5, Math.max(1, parseInt(parsed.suggestedRating, 10) || 3)),
          topics: Array.isArray(parsed.topics) && parsed.topics.length > 0 ? parsed.topics : ['Overall Experience'],
          summary: parsed.summary || 'Student feedback recorded.',
          suggestedFeedback: parsed.suggestedFeedback || _ruleEnhanceFeedback(text),
          suggestedFollowUp: parsed.suggestedFollowUp || (parsed.suggestedRating <= 2 ? "We apologize for the delay. Could you please confirm if the issue is now functioning properly?" : ''),
          isMeaningful: parsed.isMeaningful ?? (text.trim().split(/\s+/).length >= 3),
          missingAspects: Array.isArray(parsed.missingAspects) ? parsed.missingAspects : []
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  return _ruleAnalyzeFeedback(text)
}

/**
 * Generate aggregated feedback insights for Admin from verified DB metrics.
 */
const generateAggregatedFeedbackInsight = async (metrics) => {
  const {
    total = 0,
    avgRating = 0,
    positivePct = 0,
    negativePct = 0,
    topAppreciated = 'Quick resolution',
    topConcern = 'Delayed updates',
    trendPct = '+8%'
  } = metrics

  const prompt = `You are the CampusResolve AI Analytics Engine.
Generate an executive AI Feedback Insight report for the University Admin based on these strictly VERIFIED database metrics:
- Total Feedbacks: ${total}
- Average Rating: ${avgRating}/5
- Positive Feedback: ${positivePct}%
- Negative Feedback: ${negativePct}%
- Most Common Positive Topic: ${topAppreciated}
- Most Common Concern: ${topConcern}
- Satisfaction Trend: ${trendPct}

Format with clear headers and bullet points. Explain trends clearly without inventing any new numbers. Keep it under 5 lines.`

  const result = await askGemini(prompt)
  if (result && result.length > 20) return result

  return `📊 **AI Feedback Insight Report**:\n- ⭐ **Overall Satisfaction:** ${avgRating} / 5 (${positivePct}% positive)\n- 🌟 **Most Appreciated:** ${topAppreciated}\n- ⚠️ **Most Common Concern:** ${topConcern}\n- 📈 **Trend:** Student satisfaction improved by ${trendPct} compared to the previous period.`
}

/**
 * Rule-based heuristic resolution predictor fallback.
 */
const _rulePredictComplaintResolution = (complaintData, historicalStats = null) => {
  const {
    title = '',
    description = '',
    category = 'Infrastructure',
    location = '',
    priority = 'medium',
    department = 'General'
  } = complaintData

  const combined = `${title} ${description} ${location}`.toLowerCase()
  const hasHistory = historicalStats && historicalStats.count >= 2
  const histCount = hasHistory ? historicalStats.count : 0
  const histAvgHours = hasHistory ? Number(historicalStats.avgHours) : null
  const histSlaRate = hasHistory ? Number(historicalStats.slaRate) : null

  // Determine Recommended Department
  let recommendedDepartment = 'Maintenance'
  if (combined.match(/(wifi|internet|network|router|portal|login|projector|pc|computer|software|lab pc|printer|smart board)/)) {
    recommendedDepartment = 'IT Support'
  } else if (combined.match(/(syllabus|marks|exam|grade|attendance|assignment|lecture|faculty|professor|notes|hall ticket)/) || category === 'Academic') {
    recommendedDepartment = 'Academic Department'
  } else if (combined.match(/(hostel|mess|food|warden|room|bed|drinking water|geyser|laundry)/) || category === 'Hostel') {
    recommendedDepartment = 'Hostel Administration'
  } else if (combined.match(/(bus|route|driver|transport|van|stop|timing)/) || category === 'Transport') {
    recommendedDepartment = 'Transport Office'
  } else if (category === 'Infrastructure') {
    recommendedDepartment = 'Maintenance'
  } else {
    recommendedDepartment = department && department !== 'General' ? `${department} Department` : 'General Administration'
  }

  // Determine Urgency / Suggested Priority
  let suggestedPriority = 'Medium'
  let escalationRisk = 'Low'
  let expectedResolutionTime = 'Estimated: 6–12 hours'
  let slaSuccessProbability = 92
  let confidenceScore = 88

  if (combined.match(/(emergency|urgent|fire|electric shock|spark|flood|severe|harassment|fight|immediate danger|safety)/) || priority === 'high' || priority === 'Urgent') {
    suggestedPriority = 'Critical'
    escalationRisk = 'High'
    expectedResolutionTime = 'Estimated: 2–4 hours'
    slaSuccessProbability = 84
    confidenceScore = 94
  } else if (combined.match(/(exam tomorrow|deadline|broken projector|lab test|no power|fan stopped|water leaking)/) || priority === 'high') {
    suggestedPriority = 'High'
    escalationRisk = 'Medium'
    expectedResolutionTime = 'Estimated: 4–8 hours'
    slaSuccessProbability = 89
    confidenceScore = 90
  } else if (combined.match(/(noisy|cleaning|slow internet|dustbin|routine|minor)/) || priority === 'low') {
    suggestedPriority = 'Low'
    escalationRisk = 'Low'
    expectedResolutionTime = 'Estimated: 1–2 days'
    slaSuccessProbability = 96
    confidenceScore = 85
  } else {
    suggestedPriority = 'Medium'
    escalationRisk = 'Low'
    expectedResolutionTime = 'Estimated: 6–12 hours'
    slaSuccessProbability = 92
    confidenceScore = 87
  }

  // Factor in real historical stats if available
  if (hasHistory) {
    if (histAvgHours && histAvgHours > 0) {
      if (histAvgHours <= 4) expectedResolutionTime = 'Estimated: 2–4 hours'
      else if (histAvgHours <= 8) expectedResolutionTime = 'Estimated: 4–8 hours'
      else if (histAvgHours <= 16) expectedResolutionTime = 'Estimated: 8–16 hours'
      else if (histAvgHours <= 24) expectedResolutionTime = 'Estimated: 12–24 hours'
      else expectedResolutionTime = `Estimated: ${Math.round(histAvgHours / 24)}–${Math.round(histAvgHours / 24) + 1} days`
    }
    if (histSlaRate !== null && !isNaN(histSlaRate)) {
      slaSuccessProbability = Math.min(99, Math.max(50, Math.round(histSlaRate)))
    }
    confidenceScore = Math.min(98, confidenceScore + 5)
  }

  // Determine Explanation & Action
  let aiExplanation = ''
  let recommendedAction = ''

  if (hasHistory) {
    aiExplanation = `Similar ${category.toLowerCase()} complaints in this area were resolved in an average of ${histAvgHours} hours with ${histSlaRate}% on-time SLA fulfillment.`
  } else {
    const locSnippet = location ? ` in ${location}` : ''
    aiExplanation = `Similar ${category.toLowerCase()} complaints${locSnippet} are typically assigned and resolved within standard campus resolution timelines.`
  }

  if (suggestedPriority === 'Critical' || escalationRisk === 'High') {
    recommendedAction = `Expedite direct notification to the ${recommendedDepartment} supervisor for prompt intervention.`
  } else if (recommendedDepartment === 'IT Support') {
    recommendedAction = `Assign ticket to the systems administrator and check connected network switches / peripherals.`
  } else if (recommendedDepartment === 'Maintenance') {
    recommendedAction = `Route ticket to the facility technician for on-site inspection and repairs.`
  } else if (recommendedDepartment === 'Hostel Administration') {
    recommendedAction = `Dispatch hostel caretaker for immediate floor verification.`
  } else {
    recommendedAction = `Assign this complaint to the ${recommendedDepartment} coordinator for review.`
  }

  return {
    expectedResolutionTime,
    slaSuccessProbability,
    escalationRisk,
    suggestedPriority,
    recommendedDepartment,
    confidenceScore,
    confidenceLevel: confidenceScore >= 85 ? 'High' : 'Medium',
    aiExplanation,
    recommendedAction,
    dataSource: hasHistory ? 'historical' : 'general_patterns',
    historicalCount: histCount,
    avgHistoricalHours: histAvgHours
  }
}

/**
 * Predict complaint resolution metrics using Gemini 1.5 Flash + Real Historical telemetry.
 */
const predictComplaintResolution = async (complaintData, historicalStats = null) => {
  const {
    title = '',
    description = '',
    category = 'Infrastructure',
    location = '',
    priority = 'medium',
    department = 'General',
    timeOfSubmission = new Date().toISOString()
  } = complaintData

  const hasHistory = historicalStats && historicalStats.count >= 2
  const histCount = hasHistory ? historicalStats.count : 0
  const histAvgHours = hasHistory ? Number(historicalStats.avgHours) : null
  const histSlaRate = hasHistory ? Number(historicalStats.slaRate) : null

  const prompt = `You are the CampusResolve AI Resolution Intelligence engine for a modern university complaint system.
Analyze the following student complaint before submission and generate an accurate prediction of how it will be resolved:

Complaint Input:
- Title: "${title}"
- Description: "${description}"
- Category: "${category}"
- Location: "${location || 'Campus Premises'}"
- Department: "${department}"
- Student Priority: "${priority}"
- Submission Time: "${timeOfSubmission}"
${hasHistory ? `- Real Database Historical Telemetry: ${histCount} similar complaints recorded. Average resolution time: ${histAvgHours} hours. Historical SLA compliance: ${histSlaRate}%.` : '- Database Historical Telemetry: Limited historical records for this specific pattern.'}

Respond with ONLY a raw JSON object (strictly no backticks, no markdown code block wrapper) conforming exactly to this structure:
{
  "expectedResolutionTime": "Estimated: 4–8 hours" (or "Estimated: 2–4 hours", "Estimated: 12–24 hours", "Estimated: 1–2 days"),
  "slaSuccessProbability": integer between 50 and 99,
  "escalationRisk": "Low" or "Medium" or "High",
  "suggestedPriority": "Low" or "Medium" or "High" or "Critical",
  "recommendedDepartment": "Maintenance" or "IT Support" or "Academic Department" or "Hostel Administration" or "Transport Office" or "General Administration",
  "confidenceScore": integer between 70 and 98,
  "confidenceLevel": "High" or "Medium" or "Low",
  "aiExplanation": "1-2 brief student-friendly sentences explaining why this prediction was generated without technical jargon.",
  "recommendedAction": "1 concise sentence recommending immediate assignment or handling action.",
  "dataSource": "${hasHistory ? 'historical' : 'general_patterns'}"
}`

  const raw = await askGemini(prompt)
  if (raw) {
    try {
      const clean = raw.replace(/```json/gi, '').replace(/```/gi, '').trim()
      const parsed = JSON.parse(clean)
      if (parsed.expectedResolutionTime && parsed.slaSuccessProbability) {
        return {
          expectedResolutionTime: parsed.expectedResolutionTime,
          slaSuccessProbability: Math.min(99, Math.max(40, parseInt(parsed.slaSuccessProbability, 10) || 88)),
          escalationRisk: ['Low', 'Medium', 'High'].includes(parsed.escalationRisk) ? parsed.escalationRisk : 'Low',
          suggestedPriority: ['Low', 'Medium', 'High', 'Critical'].includes(parsed.suggestedPriority) ? parsed.suggestedPriority : 'Medium',
          recommendedDepartment: parsed.recommendedDepartment || 'Maintenance',
          confidenceScore: Math.min(99, Math.max(65, parseInt(parsed.confidenceScore, 10) || 88)),
          confidenceLevel: parsed.confidenceLevel || 'High',
          aiExplanation: parsed.aiExplanation,
          recommendedAction: parsed.recommendedAction,
          dataSource: hasHistory ? 'historical' : 'general_patterns',
          historicalCount: histCount,
          avgHistoricalHours: histAvgHours
        }
      }
    } catch (e) {
      console.warn('[AI] Resolution prediction JSON parsing failed, using heuristic engine:', e.message)
    }
  }

  return _rulePredictComplaintResolution(complaintData, historicalStats)
}

module.exports = {
  analyzeSentiment,
  generateQuickReplies,
  autoSuggestCategory,
  predictPriority,
  generateSummary,
  enhanceFeedbackText,
  generateBio,
  generateFeedbackAnalyticsInsight,
  answerChatbotQuestion,
  getLangInstruction,
  extractComplaintDraft,
  evaluateComplaintQuality,
  answerWithLiveContext,
  analyzeFeedback,
  generateAggregatedFeedbackInsight,
  predictComplaintResolution,
  askGemini
}


