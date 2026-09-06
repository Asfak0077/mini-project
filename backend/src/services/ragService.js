/**
 * CampusResolve RAG (Retrieval-Augmented Generation) & LLM Engine
 * Primary Provider: NVIDIA NIM API (OpenAI-compatible)
 * - Embeddings: nvidia/nemotron-3-embed-1b (2048 dims)
 * - LLM Generation: meta/llama-3.2-11b-vision-instruct
 * Resilient Fallback: OpenRouter SDK
 */

const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')

// ── Environment & Config ──────────────────────────────────────────────────────
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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'
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const NVIDIA_EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL || 'nvidia/nemotron-3-embed-1b'
const NVIDIA_CHAT_MODEL = process.env.NVIDIA_CHAT_MODEL || 'meta/llama-3.2-11b-vision-instruct'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_EMBED_MODEL = process.env.OPENROUTER_EMBED_MODEL || 'nvidia/nemotron-3-embed-1b:free'
const OPENROUTER_CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || 'minimax/minimax-m3:free'

const FALLBACK_CHAT_MODELS = [
  'meta/llama-3.2-11b-vision-instruct',
  'minimax/minimax-m3:free',
  'nvidia/nemotron-3.5-lightning:free',
  'liquid/lfm-2.5-2.6b:free'
]

const CACHE_FILE = path.join(__dirname, '../../data/rag_embeddings_cache.json')

// ── Initialize Clients ────────────────────────────────────────────────────────
let nvidiaClient = null
if (NVIDIA_API_KEY) {
  try {
    nvidiaClient = new OpenAI({
      apiKey: NVIDIA_API_KEY,
      baseURL: NVIDIA_BASE_URL
    })
    console.log(`[RAG] NVIDIA NIM initialized ✅ (Embedding: ${NVIDIA_EMBED_MODEL}, Chat: ${NVIDIA_CHAT_MODEL})`)
  } catch (err) {
    console.warn('[RAG] NVIDIA NIM client initialization failed:', err.message)
  }
}

let openrouterClient = null
function getOpenRouterClient() {
  if (!openrouterClient && OPENROUTER_API_KEY) {
    try {
      const { OpenRouter } = require('@openrouter/sdk')
      openrouterClient = new OpenRouter({
        apiKey: OPENROUTER_API_KEY
      })
    } catch (e) {
      // optional
    }
  }
  return openrouterClient
}

// ── Cosine Similarity ─────────────────────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ── Official Campus Knowledge Base Chunks ────────────────────────────────────
const KNOWLEDGE_DOCS = [
  {
    id: 'doc-grievance-policy',
    title: 'Grievance Submission and Redressal Policy',
    category: 'Policy',
    text: `CampusResolve Grievance Redressal Policy:
Students, faculty, and administrative staff are entitled to raise concerns without fear of retaliation.
Workflow Stages:
1. Submitted: Student files ticket specifying Title, Category, Department, Priority, and optional attachments.
2. Assigned: Ticket is routed to designated faculty or department coordinator within 12 hours.
3. In Progress: Faculty reviews, inspects site or records, and initiates remediation.
4. Resolved: Faculty logs detailed resolution notes and marks the ticket Resolved.
Standard initial response Service Level Agreement (SLA) is under 24 hours. Normal resolution turnaround is 24-48 hours.`
  },
  {
    id: 'doc-auto-escalation',
    title: 'Auto-Escalation and SLA Breach Rules',
    category: 'Policy',
    text: `Auto-Escalation & SLA Rules:
- If a complaint remains unassigned or unresolved for more than 7 days, the system automatically triggers Auto-Escalation.
- Escalated tickets are flagged with 'Urgent' priority and routed directly to the Chief Grievance Officer, Dean of Student Affairs, and College Ombudsman.
- Daily escalation cron monitors tickets and sends high-priority notifications via Socket.io and email alerts to administrators.`
  },
  {
    id: 'doc-dept-routing',
    title: 'Department Responsibility and Complaint Categories',
    category: 'Routing',
    text: `Complaint Categories and Routing Matrix:
- Infrastructure: Classrooms, lab benches, chairs, projector cables/HDMI, air conditioning, restrooms, cleanliness, drinking water dispensers, and campus Wi-Fi network. Managed by Estate & Infrastructure Maintenance.
- Academics: Lecture scheduling, continuous assessment/internal marks discrepancies, attendance shortage disputes, exam hall tickets, laboratory apparatus, and library books. Handled by Department HODs & Academic Dean.
- Transport: College bus punctuality, bus pass verification, route stops, driver behavior, and campus shuttle services. Handled by Transport Office.
- Financial: Semester tuition fees, scholarship disbursement delays, fee payment receipts, fine appeals, and caution deposit refunds. Handled by Accounts & Finance Office.
- Hostel & Mess: Hostel room allotment, water supply, electricity, mess food hygiene, nutritional quality, and warden permissions. Handled by Chief Warden Office.
- General & Anti-Ragging: Zero tolerance for harassment, ragging, discrimination, or safety concerns. Immediate priority escalation to Anti-Ragging Committee.`
  },
  {
    id: 'doc-faculty-workflow',
    title: 'Faculty Complaint Resolution Workflow',
    category: 'Faculty',
    text: `Faculty / Teacher Portal Guidelines:
- Faculty access complaints through Teacher Dashboard using their Teacher ID (e.g., TCH-CSE-001).
- Faculty can filter by Active and Resolved tickets, view student details, and inspect file attachments.
- To resolve a complaint: Change status to 'Resolved' and enter comprehensive 'Resolution Notes' explaining what actions were taken.
- AI Quick Reply templates assist teachers in drafting immediate, polite acknowledgments and status updates to students.`
  },
  {
    id: 'doc-feedback-analytics',
    title: 'Student Feedback, Ratings, and Quality Audits',
    category: 'Feedback',
    text: `Student Feedback and Quality Assurance:
- Once a complaint is marked Resolved, the student receives a prompt to rate the resolution (1 to 5 stars) across Response Speed, Quality of Fix, and Faculty Communication.
- Optional textual feedback can be enhanced into professional sentences using the AI Writing Assistant.
- If a complaint receives a rating of 2 stars or below, it automatically flags an admin review alert for quality inspection.`
  },
  {
    id: 'doc-account-security',
    title: 'User Authentication, Google OAuth, and OTP Reset',
    category: 'Security',
    text: `Authentication and Security Rules:
- Students login with their institutional email (@campusresolve.edu) and student roll number.
- Faculty login with Teacher ID (e.g., TCH-CSE-001, TCH-ECE-001) or institutional email.
- Password recovery uses a 6-digit cryptographic OTP sent directly to the registered Gmail/email address, valid for 10 minutes.
- Google Sign-In is strictly enforced for verified institutional domain accounts only; personal Gmail IDs cannot access protected campus resources.`
  },
  {
    id: 'doc-contacts-helpline',
    title: 'Campus Helpline, Office Locations, and Emergency Contacts',
    category: 'Contacts',
    text: `Campus Contacts and Physical Locations:
- Grievance Redressal Cell: Room 102, Administrative Block, Main Campus. Open Monday to Saturday 9:00 AM - 5:00 PM.
- IT Helpdesk / Network Operations: Ground Floor, Tech Block B. For Wi-Fi MAC registration and portal password resets.
- Chief Grievance Officer: grievance.officer@campusresolve.edu | Phone: +91 99999 00000
- Anti-Ragging & Emergency 24/7 Helpline: 1800-180-5522 | security@campusresolve.edu`
  },
  {
    id: 'doc-common-fixes',
    title: 'Common Campus Solutions & Self-Service Guide',
    category: 'Troubleshooting',
    text: `Frequently Resolved Issues & Action Steps:
- Projector or HDMI disconnected in lecture hall: Report under Infrastructure. AV technicians keep backup cables at Tech Block B Room 304.
- Campus Wi-Fi showing 'Connected, no internet': Clear browser captive portal cache or visit IT desk for certificate re-installation.
- Internal marks discrepancy in portal: Student must file grievance within 5 working days of marks entry, attaching test paper copy.
- Bus delay or breakdown: Transport coordinator dispatches backup bus within 30 minutes. Notifications broadcast on dashboard announcement board.`
  }
]

// ── In-memory Knowledge Store with Embeddings ─────────────────────────────────
let indexedChunks = []
let isIndexing = false

/**
 * Generate embedding for a single text using NVIDIA NIM (primary) or OpenRouter (fallback)
 */
async function generateEmbedding(text) {
  const clean = text.trim().slice(0, 4000)

  // 1. Try NVIDIA NIM embeddings
  if (nvidiaClient) {
    try {
      const response = await nvidiaClient.embeddings.create({
        model: NVIDIA_EMBED_MODEL,
        input: [clean]
      })
      const emb = response?.data?.[0]?.embedding
      if (Array.isArray(emb) && emb.length > 0) {
        return emb
      }
    } catch (err) {
      console.warn('[RAG] NVIDIA embedding call failed:', err.message)
    }
  }

  // 2. Try OpenRouter fallback
  const orClient = getOpenRouterClient()
  if (orClient) {
    try {
      const response = await orClient.embeddings.generate({
        requestBody: {
          model: OPENROUTER_EMBED_MODEL,
          input: clean,
          encodingFormat: 'float'
        }
      })
      const emb = response?.data?.[0]?.embedding
      if (Array.isArray(emb) && emb.length > 0) {
        return emb
      }
    } catch (err) {
      console.warn('[RAG] OpenRouter embedding fallback failed:', err.message)
    }
  }

  return null
}

/**
 * Load cached embeddings from disk if available and valid
 */
function loadCachedEmbeddings() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
      if (Array.isArray(data) && data.length > 0 && data[0]?.embedding?.length === 2048) {
        indexedChunks = data
        console.log(`[RAG] Loaded ${indexedChunks.length} cached NVIDIA embeddings from disk ✅`)
        return true
      } else {
        console.log('[RAG] Cached embeddings need re-indexing with NVIDIA NIM vectors.')
      }
    }
  } catch (e) {
    console.warn('[RAG] Failed reading cache file:', e.message)
  }
  return false
}

/**
 * Save embeddings cache to disk
 */
function saveCachedEmbeddings() {
  try {
    const dir = path.dirname(CACHE_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(CACHE_FILE, JSON.stringify(indexedChunks, null, 2), 'utf8')
    console.log(`[RAG] Saved ${indexedChunks.length} embeddings to cache 💾`)
  } catch (e) {
    console.warn('[RAG] Could not write cache:', e.message)
  }
}

/**
 * Initialize knowledge base index with embeddings
 */
async function initializeKnowledgeBase(forceReindex = false) {
  if (indexedChunks.length > 0 && !forceReindex) {
    return indexedChunks
  }

  if (!forceReindex && loadCachedEmbeddings()) {
    return indexedChunks
  }

  if (isIndexing) {
    while (isIndexing) {
      await new Promise(r => setTimeout(r, 200))
    }
    return indexedChunks
  }

  isIndexing = true
  const modelName = nvidiaClient ? NVIDIA_EMBED_MODEL : OPENROUTER_EMBED_MODEL
  console.log(`[RAG] Indexing ${KNOWLEDGE_DOCS.length} knowledge chunks using ${modelName}...`)

  try {
    const newIndexed = []
    for (const doc of KNOWLEDGE_DOCS) {
      const contentToEmbed = `${doc.title} (${doc.category}):\n${doc.text}`
      const embedding = await generateEmbedding(contentToEmbed)
      if (embedding) {
        newIndexed.push({
          ...doc,
          embedding
        })
      } else {
        console.warn(`[RAG] Skipping chunk ${doc.id} due to embedding failure`)
      }
    }

    if (newIndexed.length > 0) {
      indexedChunks = newIndexed
      saveCachedEmbeddings()
      console.log(`[RAG] Knowledge base indexed successfully with ${indexedChunks.length} vectors! 🎯`)
    }
  } catch (err) {
    console.error('[RAG] Knowledge base indexing failed:', err.message)
  } finally {
    isIndexing = false
  }

  return indexedChunks
}

/**
 * Retrieve Top-K most relevant knowledge chunks using vector cosine similarity
 */
async function retrieveRelevantKnowledge(queryText, topK = 3) {
  if (!queryText || !queryText.trim()) return []

  // Ensure index is loaded
  if (indexedChunks.length === 0) {
    await initializeKnowledgeBase()
  }

  // Generate embedding for user query
  const queryEmbedding = await generateEmbedding(queryText)
  if (!queryEmbedding) {
    console.warn('[RAG] Query embedding failed, using keyword relevance ranking fallback')
    const lower = queryText.toLowerCase()
    return KNOWLEDGE_DOCS.map(doc => {
      let score = 0
      const words = lower.split(/\s+/).filter(w => w.length > 3)
      words.forEach(w => {
        if (doc.text.toLowerCase().includes(w)) score += 1
        if (doc.title.toLowerCase().includes(w)) score += 2
      })
      return { ...doc, similarity: score / 10 }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
  }

  // Vector Cosine Similarity scoring
  const scored = indexedChunks.map(chunk => ({
    id: chunk.id,
    title: chunk.title,
    category: chunk.category,
    text: chunk.text,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }))

  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, topK)
}

/**
 * Chat completion using NVIDIA NIM with OpenRouter fallback
 */
async function generateLLMCompletion(messages, options = {}) {
  const {
    temperature = 0.3,
    maxTokens = 600,
    preferredModel = NVIDIA_CHAT_MODEL
  } = options

  // 1. Try NVIDIA NIM first
  if (nvidiaClient) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('NVIDIA NIM response queue > 7s')), 7000)
      )

      const completionPromise = nvidiaClient.chat.completions.create({
        model: preferredModel || NVIDIA_CHAT_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens
      })

      const response = await Promise.race([completionPromise, timeoutPromise])
      const content = response?.choices?.[0]?.message?.content
      if (content && typeof content === 'string' && content.trim().length > 0) {
        return {
          content: content.trim(),
          modelUsed: preferredModel || NVIDIA_CHAT_MODEL
        }
      }
    } catch (err) {
      console.warn(`[NVIDIA NIM LLM] Call failed: ${err.message}. Trying fallback candidate...`)
    }
  }

  // 2. Try Gemini fallback if configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      if (text) {
        return {
          content: text,
          modelUsed: 'gemini-1.5-flash'
        }
      }
    } catch (gErr) {
      console.warn(`[Gemini LLM Fallback] Failed: ${gErr.message}`)
    }
  }

  // 3. Try OpenRouter fallback
  const orClient = getOpenRouterClient()
  if (orClient) {
    for (const model of FALLBACK_CHAT_MODELS) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${model} timed out after 10s`)), 10000)
        )

        const response = await Promise.race([
          orClient.chat.send({
            chatRequest: {
              model,
              messages,
              temperature,
              max_tokens: maxTokens
            }
          }),
          timeoutPromise
        ])

        const content = response?.choices?.[0]?.message?.content
        if (content && typeof content === 'string' && content.trim().length > 0) {
          return {
            content: content.trim(),
            modelUsed: model
          }
        }
      } catch (err) {
        console.warn(`[OpenRouter LLM] Model ${model} failed: ${err.message}`)
      }
    }
  }

  throw new Error('All LLM candidate models (NVIDIA NIM & OpenRouter) failed')
}

/**
 * Generate full RAG-grounded response for chatbot and grievance queries
 */
async function generateRAGResponse(query, context = {}) {
  const {
    role = 'student',
    userName = 'Student',
    currentPage = 'Dashboard',
    isUrgent = false,
    lang = 'en'
  } = context

  // 1. Vector Retrieval
  const topChunks = await retrieveRelevantKnowledge(query, 3)

  const knowledgeContext = topChunks.length > 0
    ? topChunks.map((c, i) => `[Document ${i + 1}: ${c.title} (${c.category}) (Match: ${(c.similarity * 100).toFixed(1)}%)]\n${c.text}`).join('\n\n')
    : 'No specific campus policy document matched. Rely on general university redressal practices.'

  // 2. Language instructions
  let langInstruction = ''
  if (lang === 'ta') langInstruction = 'You must reply entirely in Tamil language (தமிழ்). '
  else if (lang === 'hi') langInstruction = 'You must reply entirely in Hindi language (हिंदी). '

  // 3. Empathy note
  const empathyInstruction = isUrgent
    ? 'The user appears frustrated or in urgent distress. Begin your answer with a warm, comforting empathetic statement assuring them their issue will be addressed promptly.'
    : ''

  // 4. System prompt
  const systemPrompt = `You are CampusResolve AI Assistant — the intelligent, compassionate virtual advisor for CampusResolve, a digital university grievance redressal and complaint management platform.

Role: ${role}
User: ${userName}
Current Page: ${currentPage}
${langInstruction}
${empathyInstruction}

--- RETRIEVED OFFICIAL UNIVERSITY KNOWLEDGE (Via NVIDIA NIM RAG Vector Search) ---
${knowledgeContext}
--- END RETRIEVED KNOWLEDGE ---

Instructions:
1. Answer the user's question directly, accurately, and concisely (2 to 4 sentences or a clean bulleted breakdown).
2. Ground your instructions in the official campus policies provided above (e.g. 24h SLA, 7-day auto-escalation, specific departments, room numbers, contact info).
3. If the user asks how to file or track a complaint, provide exact portal navigation steps (e.g. Dashboard → Complaint Form / Complaint History).
4. Maintain a supportive, professional, and friendly academic tone. Do not fabricate external links.`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ]

  // 5. LLM call
  try {
    const result = await generateLLMCompletion(messages, {
      temperature: 0.3,
      maxTokens: 500
    })

    return {
      text: result.content,
      model: result.modelUsed,
      sources: topChunks.map(c => ({ title: c.title, category: c.category, score: Number((c.similarity * 100).toFixed(1)) }))
    }
  } catch (error) {
    console.error('[RAG] LLM generation error:', error.message)
    return null
  }
}

module.exports = {
  getOpenRouterClient,
  generateEmbedding,
  cosineSimilarity,
  retrieveRelevantKnowledge,
  generateLLMCompletion,
  generateRAGResponse,
  initializeKnowledgeBase,
  EMBED_MODEL: NVIDIA_EMBED_MODEL,
  CHAT_MODEL: NVIDIA_CHAT_MODEL,
  KNOWLEDGE_DOCS
}
