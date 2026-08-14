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
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    console.log('[AI] Gemini 1.5 Flash ready ✅')
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
  const cap = shortText.charAt(0).toUpperCase() + shortText.slice(1)
  return `${cap}. Overall, the complaint management process was handled adequately.`
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
 * Enhance short feedback text into a professional sentence using Gemini.
 */
const enhanceFeedbackText = async (shortText) => {
  const prompt = `Expand the following short, informal student feedback into 2 professional sentences suitable for a university complaint management system. Keep it respectful and constructive. Return ONLY the expanded text, no labels.\n\nOriginal: "${shortText}"`
  const result = await askGemini(prompt)
  if (result && result.length > 20) return result
  return _ruleEnhanceFeedback(shortText)
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

/**
 * Answer a campus assistant chatbot question using Gemini.
 * Now supports: multi-language, role-awareness, emotional tone, full feature context.
 */
const answerChatbotQuestion = async (question, context = {}) => {
  const { currentPage, role, userName, lang, isUrgent } = context
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

Answer helpfully in 2-4 sentences. If it's about submitting a complaint say: "Go to Dashboard → Complaint Form → Fill all details → Select department → Submit." Keep responses friendly, professional, and campus-specific. Do not mention external systems.`

  const result = await askGemini(prompt)
  if (result && result.length > 10) return result
  return "I'm here to help! Please use the navigation menu to access platform features. For complaints, go to your dashboard and click Submit Complaint."
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
}
