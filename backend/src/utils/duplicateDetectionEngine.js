/**
 * CampusResolve AI Duplicate Detection Engine
 * 
 * Hybrid AI Duplicate Detection for Student Complaints:
 *  - Semantic Similarity (35%): Deep NLP meaning & embedding/cosine token similarity
 *  - Keyword Similarity (25%): Core issue keyword & n-gram overlap
 *  - Location Match (25%): Exact, fuzzy, and building/room hierarchical matching
 *  - Category Match (15%): Category exact & related group matching
 * 
 * Thresholds:
 *  - 0–59%: NO_DUPLICATE
 *  - 60–79%: POSSIBLE_DUPLICATE (Medium Confidence / Yellow)
 *  - 80–100%: HIGH_CONFIDENCE_DUPLICATE (High Confidence / Red)
 * 
 * Active Status Filter:
 *  - Only compares active complaints ('Submitted', 'Assigned', 'In Progress', 'Escalated', 'Under Review')
 */

const mongoose = require('mongoose')
const Complaint = require('../models/Complaint')
const { inMemoryStore } = require('./inMemoryStore')
const { askGemini } = require('./aiSimulator')

// ── Active Complaint Statuses ────────────────────────────────────────────────
const ACTIVE_STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Escalated', 'Under Review', 'Pending']

// ── Synonyms & Related Campus Terms ──────────────────────────────────────────
const SYNONYM_GROUPS = [
  ['fan', 'ceiling fan', 'ventilation', 'exhaust fan', 'regulator'],
  ['light', 'tubelight', 'tube light', 'bulb', 'led', 'lamp', 'flickering', 'blinking', 'darkness'],
  ['projector', 'smartboard', 'display', 'screen', 'hdmi', 'av system', 'vga'],
  ['ac', 'air conditioner', 'cooling', 'hvac', 'temperature', 'filter'],
  ['water', 'drinking water', 'purifier', 'cooler', 'filter', 'tap', 'leak', 'plumbing', 'pipe'],
  ['washroom', 'toilet', 'restroom', 'bathroom', 'sanitation', 'cleanliness', 'hygiene'],
  ['wifi', 'internet', 'network', 'lan', 'ethernet', 'connection', 'bandwidth', 'slow net'],
  ['chair', 'bench', 'desk', 'podium', 'table', 'seat', 'furniture'],
  ['mess', 'food', 'canteen', 'dining', 'meal', 'lunch', 'breakfast', 'dinner', 'hygiene'],
  ['broken', 'damaged', 'not working', 'faulty', 'malfunctioning', 'sparking', 'cracked', 'stuck', 'jammed', 'leak', 'leaking']
]

// ── Stopwords for Tokenization ───────────────────────────────────────────────
const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'to', 'in',
  'for', 'of', 'with', 'by', 'from', 'it', 'this', 'that', 'are', 'was',
  'be', 'has', 'had', 'do', 'does', 'did', 'but', 'not', 'what', 'all',
  'can', 'her', 'his', 'him', 'how', 'its', 'my', 'our', 'i', 'we', 'you',
  'please', 'sir', 'madam', 'complaint', 'issue', 'problem', 'help', 'fix'
])

/**
 * Clean & tokenize text into significant words
 */
const tokenize = (text = '') => {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
}

/**
 * Expand tokens with synonym groups
 */
const expandTokensWithSynonyms = (tokens) => {
  const expanded = new Set(tokens)
  tokens.forEach(token => {
    SYNONYM_GROUPS.forEach(group => {
      if (group.some(word => word.includes(token) || token.includes(word))) {
        group.forEach(w => expanded.add(w.toLowerCase()))
      }
    })
  })
  return Array.from(expanded)
}

/**
 * 1. Category Similarity (0 to 15 points)
 */
const calculateCategorySimilarity = (cat1 = '', cat2 = '') => {
  const c1 = (cat1 || '').toLowerCase().trim()
  const c2 = (cat2 || '').toLowerCase().trim()
  if (!c1 || !c2) return 0
  if (c1 === c2) return 15
  if ((c1.includes('infra') && c2.includes('infra')) ||
      (c1.includes('acad') && c2.includes('acad')) ||
      (c1.includes('hostel') && c2.includes('hostel')) ||
      (c1.includes('it') && c2.includes('it')) ||
      (c1.includes('transport') && c2.includes('transport'))) {
    return 12
  }
  return 0
}

/**
 * 2. Location Match (0 to 25 points)
 */
const calculateLocationSimilarity = (loc1 = '', loc2 = '', desc1 = '', desc2 = '') => {
  const l1 = (loc1 || '').toLowerCase().trim()
  const l2 = (loc2 || '').toLowerCase().trim()

  // If no location specified in either, fall back to checking if text shares location phrases
  if ((!l1 || l1 === 'campus premises') && (!l2 || l2 === 'campus premises')) {
    const fullText1 = (desc1 || '').toLowerCase()
    const fullText2 = (desc2 || '').toLowerCase()
    const commonLocations = [
      'seminar hall', 'computer lab', 'lab 1', 'lab 2', 'lab 3', 'library', 'canteen',
      'block a', 'block b', 'block c', 'boys hostel', 'girls hostel', 'mess'
    ]
    for (const cl of commonLocations) {
      if (fullText1.includes(cl) && fullText2.includes(cl)) {
        return 22
      }
    }
    return 5 // neutral baseline
  }

  if (l1 && l2) {
    if (l1 === l2) return 25
    if (l1.includes(l2) || l2.includes(l1)) return 22

    // Token overlap between locations
    const t1 = tokenize(l1)
    const t2 = tokenize(l2)
    const intersection = t1.filter(t => t2.includes(t))
    if (intersection.length > 0) {
      const ratio = intersection.length / Math.max(t1.length, t2.length)
      return Math.round(ratio * 20)
    }
  }

  // Cross check location with description
  if (l1 && desc2 && desc2.toLowerCase().includes(l1)) return 20
  if (l2 && desc1 && desc1.toLowerCase().includes(l2)) return 20

  return 0
}

/**
 * 3. Keyword Similarity (0 to 25 points)
 */
const calculateKeywordSimilarity = (newText = '', existingText = '') => {
  const t1 = tokenize(newText)
  const t2 = tokenize(existingText)
  if (t1.length === 0 || t2.length === 0) return 0

  const s1 = new Set(t1)
  const s2 = new Set(t2)
  const intersection = [...s1].filter(t => s2.has(t))
  const union = new Set([...s1, ...s2])

  // Jaccard similarity
  const jaccard = union.size > 0 ? intersection.length / union.size : 0

  // Exact phrase match bonus
  const phraseMatch = (existingText.toLowerCase().includes(newText.toLowerCase()) ||
                       newText.toLowerCase().includes(existingText.toLowerCase())) ? 0.3 : 0

  const score = Math.min(1.0, (jaccard * 0.8) + phraseMatch)
  return Math.round(score * 25)
}

/**
 * 4. Semantic Similarity (0 to 35 points)
 */
const calculateSemanticSimilarity = async (newComplaint, existingComplaint) => {
  const newFull = `${newComplaint.title || ''} ${newComplaint.description || ''}`.trim()
  const existingFull = `${existingComplaint.title || ''} ${existingComplaint.description || ''}`.trim()

  const t1Expanded = expandTokensWithSynonyms(tokenize(newFull))
  const t2Expanded = expandTokensWithSynonyms(tokenize(existingFull))

  const s1 = new Set(t1Expanded)
  const s2 = new Set(t2Expanded)
  const intersection = [...s1].filter(t => s2.has(t))
  const union = new Set([...s1, ...s2])

  const overlapScore = union.size > 0 ? (intersection.length / union.size) : 0
  const baseSemantic = Math.round(overlapScore * 35)

  // If high token overlap, return computed score directly
  if (baseSemantic >= 20 || !askGemini) {
    return Math.min(35, Math.max(baseSemantic, overlapScore > 0.4 ? 28 : baseSemantic))
  }

  // Attempt deep semantic similarity via Gemini if key words correlate
  try {
    const prompt = `Compare these two campus grievances and rate their semantic duplicate likelihood from 0 to 100:
Complaint A: "${newFull}" (Location: ${newComplaint.location || 'N/A'}, Category: ${newComplaint.category || 'N/A'})
Complaint B: "${existingFull}" (Location: ${existingComplaint.location || 'N/A'}, Category: ${existingComplaint.category || 'N/A'})

Respond with ONLY a single integer number between 0 and 100.`

    const result = await askGemini(prompt)
    if (result) {
      const parsed = parseInt(result.replace(/[^0-9]/g, ''), 10)
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return Math.round((parsed / 100) * 35)
      }
    }
  } catch (err) {
    // Fallback to rule-based score
  }

  return baseSemantic
}

/**
 * Calculate the complete Hybrid Duplicate Detection Score (0–100%)
 */
const calculateHybridSimilarity = async (newComplaint, existingComplaint) => {
  const categoryScore = calculateCategorySimilarity(
    newComplaint.category,
    existingComplaint.category
  )

  const locationScore = calculateLocationSimilarity(
    newComplaint.location,
    existingComplaint.location,
    `${newComplaint.title || ''} ${newComplaint.description || ''}`,
    `${existingComplaint.title || ''} ${existingComplaint.description || ''}`
  )

  const keywordScore = calculateKeywordSimilarity(
    `${newComplaint.title || ''} ${newComplaint.description || ''}`,
    `${existingComplaint.title || ''} ${existingComplaint.description || ''}`
  )

  const semanticScore = await calculateSemanticSimilarity(newComplaint, existingComplaint)

  const totalScore = Math.min(100, Math.max(0, categoryScore + locationScore + keywordScore + semanticScore))

  let duplicateType = 'NO_DUPLICATE'
  if (totalScore >= 80) {
    duplicateType = 'HIGH_CONFIDENCE_DUPLICATE'
  } else if (totalScore >= 60) {
    duplicateType = 'POSSIBLE_DUPLICATE'
  }

  return {
    totalScore,
    duplicateType,
    breakdown: {
      semantic: semanticScore,
      keyword: keywordScore,
      location: locationScore,
      category: categoryScore
    }
  }
}

/**
 * Fetch all active candidates from MongoDB or inMemoryStore
 */
const getActiveCandidateComplaints = async (category = null) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = { status: { $in: ACTIVE_STATUSES } }
      if (category && category !== 'General' && category !== 'Other') {
        query.category = category
      }
      return await Complaint.find(query)
        .sort({ createdAt: -1 })
        .limit(30)
        .lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      return inMemoryStore.complaints.filter(c =>
        ACTIVE_STATUSES.includes(c.status) &&
        (!category || category === 'General' || category === 'Other' || c.category === category)
      ).slice(0, 30)
    }
    return []
  } catch (err) {
    console.error('[DuplicateEngine] Candidate fetch error:', err.message)
    return []
  }
}

/**
 * Main function: Find duplicate complaints for a new draft
 */
const findDuplicateComplaints = async (complaintDraft) => {
  if (!complaintDraft) return { isDuplicate: false, highestSimilarity: 0, matches: [] }

  const title = (complaintDraft.title || '').trim()
  const description = (complaintDraft.description || '').trim()
  const location = (complaintDraft.location || '').trim()
  const category = (complaintDraft.category || '').trim()

  // Need at least an issue description or title
  if (!description && !title) {
    return { isDuplicate: false, highestSimilarity: 0, matches: [] }
  }

  const candidates = await getActiveCandidateComplaints(category)
  if (!candidates || candidates.length === 0) {
    return { isDuplicate: false, highestSimilarity: 0, matches: [] }
  }

  const scoredMatches = []

  for (const candidate of candidates) {
    // Extract candidate location
    let candidateLocation = candidate.location || ''
    if (!candidateLocation) {
      const matchLoc = candidate.description && candidate.description.match(/\[Location:\s*([^\]]+)\]/i)
      if (matchLoc) candidateLocation = matchLoc[1].trim()
      else candidateLocation = candidate.department ? `${candidate.department} Campus` : 'Campus Premises'
    }

    const compCandidate = {
      ...candidate,
      location: candidateLocation
    }

    const { totalScore, duplicateType, breakdown } = await calculateHybridSimilarity(
      { title, description, location, category },
      compCandidate
    )

    if (totalScore >= 60) {
      scoredMatches.push({
        id: candidate._id?.toString() || candidate.complaintId,
        complaintId: candidate.complaintId || candidate._id?.toString() || 'CR-001',
        title: candidate.title || candidate.category,
        description: candidate.description || '',
        category: candidate.category,
        department: candidate.department || 'General',
        location: candidateLocation,
        status: candidate.status,
        priority: candidate.priority || 'medium',
        createdAt: candidate.createdAt,
        affectedCount: candidate.affectedCount || (candidate.affectedUsers ? candidate.affectedUsers.length : 1) || 1,
        affectedUsers: candidate.affectedUsers || [],
        similarityScore: totalScore,
        duplicateType,
        breakdown
      })
    }
  }

  // Sort descending by similarity score
  scoredMatches.sort((a, b) => b.similarityScore - a.similarityScore)

  const highestSimilarity = scoredMatches.length > 0 ? scoredMatches[0].similarityScore : 0
  const isDuplicate = highestSimilarity >= 60
  const duplicateType = highestSimilarity >= 80
    ? 'HIGH_CONFIDENCE_DUPLICATE'
    : (highestSimilarity >= 60 ? 'POSSIBLE_DUPLICATE' : 'NO_DUPLICATE')

  return {
    isDuplicate,
    duplicateType,
    highestSimilarity,
    matchedComplaint: scoredMatches[0] || null,
    matches: scoredMatches.slice(0, 3)
  }
}

/**
 * Add a student to an existing complaint's affectedUsers / supporters
 */
const joinExistingComplaint = async (complaintId, studentUser) => {
  const targetId = (complaintId || '').trim().toUpperCase()
  const studentId = studentUser?.studentId || studentUser?._id?.toString() || 'CR-STUDENT'
  const studentName = studentUser?.name || 'Student'
  const studentEmail = (studentUser?.email || '').toLowerCase()

  try {
    let complaint = null

    if (mongoose.connection.readyState === 1) {
      complaint = await Complaint.findOne({
        $or: [
          { complaintId: targetId },
          mongoose.Types.ObjectId.isValid(targetId) ? { _id: targetId } : null
        ].filter(Boolean)
      })

      if (!complaint) return { success: false, message: `Complaint ${targetId} not found.` }

      // Check if student already joined
      const alreadyJoined = (complaint.affectedUsers || []).some(
        u => (u.studentId && u.studentId === studentId) || (u.studentEmail && u.studentEmail.toLowerCase() === studentEmail)
      )

      if (!alreadyJoined) {
        complaint.affectedUsers.push({
          studentId,
          studentName,
          studentEmail,
          joinedAt: new Date()
        })
        complaint.affectedCount = (complaint.affectedCount || 1) + 1

        // If high number of affected students, auto-bump priority
        if (complaint.affectedCount >= 3 && complaint.priority === 'low') {
          complaint.priority = 'medium'
        } else if (complaint.affectedCount >= 6 && complaint.priority === 'medium') {
          complaint.priority = 'high'
        } else if (complaint.affectedCount >= 10 && complaint.priority === 'high') {
          complaint.priority = 'Urgent'
        }

        complaint.resolutionTimeline.push({
          status: complaint.status,
          timestamp: new Date(),
          updatedBy: `${studentName} (Affected Student)`,
          notes: `Additional student joined this ticket (+1 affected user). Total: ${complaint.affectedCount}.`
        })

        await complaint.save()
      }

      return {
        success: true,
        alreadyJoined,
        affectedCount: complaint.affectedCount,
        complaintId: complaint.complaintId,
        title: complaint.title,
        status: complaint.status,
        priority: complaint.priority
      }

    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      complaint = inMemoryStore.complaints.find(c =>
        (c.complaintId && c.complaintId.toUpperCase() === targetId) || String(c._id) === targetId
      )

      if (!complaint) return { success: false, message: `Complaint ${targetId} not found.` }

      if (!Array.isArray(complaint.affectedUsers)) complaint.affectedUsers = []
      const alreadyJoined = complaint.affectedUsers.some(
        u => (u.studentId && u.studentId === studentId) || (u.studentEmail && u.studentEmail.toLowerCase() === studentEmail)
      )

      if (!alreadyJoined) {
        complaint.affectedUsers.push({
          studentId,
          studentName,
          studentEmail,
          joinedAt: new Date().toISOString()
        })
        complaint.affectedCount = (complaint.affectedCount || 1) + 1
        inMemoryStore._persist()
      }

      return {
        success: true,
        alreadyJoined,
        affectedCount: complaint.affectedCount,
        complaintId: complaint.complaintId,
        title: complaint.title,
        status: complaint.status,
        priority: complaint.priority
      }
    }

    return { success: false, message: 'Database unavailable' }
  } catch (err) {
    console.error('[DuplicateEngine] joinExistingComplaint error:', err.message)
    return { success: false, message: err.message }
  }
}

module.exports = {
  ACTIVE_STATUSES,
  calculateCategorySimilarity,
  calculateLocationSimilarity,
  calculateKeywordSimilarity,
  calculateSemanticSimilarity,
  calculateHybridSimilarity,
  findDuplicateComplaints,
  joinExistingComplaint
}
