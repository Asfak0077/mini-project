const mongoose = require('mongoose')
const Complaint = require('../models/Complaint')
const ComplaintAIAnalysis = require('../models/ComplaintAIAnalysis')
const { inMemoryStore } = require('../utils/inMemoryStore')
const { askGemini } = require('../utils/aiSimulator')
const { createNotification } = require('../utils/notificationHelper')
const { emitToRole, emitToUser, getIO } = require('../utils/socketService')

// ── Notification Cooldown Tracker (In-memory, 6 hours TTL) ──
const notificationCooldowns = new Map()
const COOLDOWN_MS = 6 * 60 * 60 * 1000

const isNotificationAllowed = (key) => {
  const last = notificationCooldowns.get(key)
  if (!last) return true
  return Date.now() - last > COOLDOWN_MS
}

const markNotificationSent = (key) => {
  notificationCooldowns.set(key, Date.now())
}

// ── Category & Priority Target SLAs (Hours) ──
const CATEGORY_SLA_HOURS = {
  Infrastructure: 48,
  Academics: 24,
  Hostel: 24,
  Transport: 24,
  Financial: 48,
  General: 48
}

const PRIORITY_SLA_HOURS = {
  Urgent: 4,
  high: 12,
  medium: 24,
  low: 48
}

/**
 * ── RAG RETRIEVAL ENGINE ──
 * Retrieves relevant database context: similar historical complaints,
 * resolutions, department workloads, and recurring location incidents.
 */
const retrieveComplaintRAGContext = async (complaint) => {
  const currentId = String(complaint._id || complaint.id || '')
  const category = complaint.category || 'General'
  const department = complaint.department || 'General'
  const location = (complaint.location || '').trim().toLowerCase()
  const titleWords = (complaint.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3)

  let allComplaints = []
  if (mongoose.connection.readyState === 1) {
    allComplaints = await Complaint.find({}).sort({ createdAt: -1 }).limit(100).lean().catch(() => [])
  } else {
    allComplaints = inMemoryStore.complaints || []
  }

  // Filter similar historical complaints (excluding current)
  const similar = allComplaints.filter(c => {
    const cid = String(c._id || c.id || '')
    if (cid === currentId) return false

    const sameCat = c.category === category
    const sameDept = c.department === department
    const sameLoc = location && (c.location || '').toLowerCase().includes(location)
    const text = `${c.title || ''} ${c.description || ''}`.toLowerCase()
    const wordMatch = titleWords.some(w => text.includes(w))

    return sameCat || sameLoc || (sameDept && wordMatch)
  })

  // Similar resolved complaints with actual resolution notes
  const similarResolved = similar.filter(c => c.status === 'Resolved' && (c.resolutionNotes || c.adminRemarks))

  // Department metrics
  const deptComplaints = allComplaints.filter(c => c.department === department)
  const pendingDeptCount = deptComplaints.filter(c => c.status !== 'Resolved').length
  const resolvedDept = deptComplaints.filter(c => c.status === 'Resolved')

  let avgDeptResolutionHours = 24
  if (resolvedDept.length > 0) {
    let sumHours = 0
    resolvedDept.forEach(c => {
      const start = new Date(c.createdAt || 0).getTime()
      const end = new Date(c.resolutionDate || c.updatedAt || c.createdAt).getTime()
      sumHours += Math.max(0.5, (end - start) / (1000 * 60 * 60))
    })
    avgDeptResolutionHours = Number((sumHours / resolvedDept.length).toFixed(1))
  }

  // Determine confidence tier based on real data density
  let confidenceLevel = 'Medium Confidence'
  let confidenceScore = 75
  let dataSourceNote = `Analysis based on complaint details and campus operational telemetry.`

  if (similar.length >= 6) {
    confidenceLevel = 'High Confidence'
    confidenceScore = Math.min(95, 78 + similar.length)
    dataSourceNote = `Based on ${similar.length} verified similar campus complaints in ${department} department.`
  } else if (similar.length >= 2) {
    confidenceLevel = 'Medium Confidence'
    confidenceScore = 72
    dataSourceNote = `Based on ${similar.length} similar complaints and department resolution history.`
  } else {
    confidenceLevel = 'Low Confidence'
    confidenceScore = 55
    dataSourceNote = `Limited historical data is available. This analysis is based mainly on the current complaint description and institutional standards.`
  }

  return {
    allComplaints,
    similar,
    similarResolved,
    pendingDeptCount,
    avgDeptResolutionHours,
    confidenceLevel,
    confidenceScore,
    dataSourceNote
  }
}

/**
 * 1. AI ROOT CAUSE ANALYSIS (CATEGORY & CONTEXT AWARE WITH RAG)
 * Produces realistic, specific diagnostics instead of generic static placeholders.
 */
const analyzeRootCause = async (complaint, ragContext) => {
  const title = complaint.title || 'Untitled Issue'
  const description = complaint.description || ''
  const category = complaint.category || 'General'
  const location = complaint.location || 'Campus Facility'
  const department = complaint.department || 'General'

  // Extract resolved patterns for RAG prompt
  const historicalResolutions = (ragContext.similarResolved || []).slice(0, 4).map(r => ({
    title: r.title,
    location: r.location,
    resolution: r.resolutionNotes || r.adminRemarks || 'Standard technician servicing'
  }))

  const prompt = `
You are a Senior Campus Facilities & IT Diagnostic Specialist at an academic institution.
Analyze this specific campus complaint and identify possible root causes and actionable troubleshooting steps.

Complaint Data:
- Category: ${category}
- Department: ${department}
- Specific Location: ${location}
- Complaint Title: ${title}
- Grievance Details: ${description}

Verified Historical Resolutions for Similar Incidents:
${JSON.stringify(historicalResolutions, null, 2)}

Strict Requirements:
1. The analysis MUST be category-specific (e.g. plumbing: valves/pipes; AV: cables/lamp; electrical: capacitor/MCB/wiring; Wi-Fi: AP DHCP/channel; academic: portal sync/OD).
2. KEEP ALL TEXT SHORT, PUNCHY AND CONCISE:
   - "summary": Max 1 brief sentence (under 12 words).
   - "cause": 3 to 6 words max (e.g. "Faulty Fan Capacitor", "Loose Wall Regulator Wiring", "Blown Display Lamp").
   - "recommendedActions": 2 to 3 short steps, max 5 to 8 words each (e.g. "Isolate power at distribution board", "Test and replace capacitor", "Inspect terminal connections").
3. Return ONLY a valid JSON object matching this exact schema:
{
  "summary": "Brief 1-sentence diagnosis under 12 words",
  "possibleRootCauses": [
    {
      "cause": "Short cause (3-6 words)",
      "confidence": <integer percentage 55-92>
    },
    {
      "cause": "Short secondary cause (3-6 words)",
      "confidence": <integer percentage 35-75>
    }
  ],
  "impactLevel": "Low" | "Medium" | "High" | "Critical",
  "recommendedDepartment": "${department}",
  "recommendedActions": [
    "Short step 1 (under 8 words)",
    "Short step 2 (under 8 words)",
    "Short step 3 (under 8 words)"
  ]
}
Do not include markdown backticks or commentary. Return only raw JSON.
`

  try {
    const rawAi = await askGemini(prompt)
    if (rawAi) {
      const cleanJson = rawAi.replace(/^```json/i, '').replace(/```$/i, '').trim()
      const parsed = JSON.parse(cleanJson)
      if (Array.isArray(parsed.possibleRootCauses) && parsed.possibleRootCauses.length > 0) {
        return {
          summary: parsed.summary || `Issue in ${location} indicates ${category.toLowerCase()} component failure.`,
          confidence: ragContext.confidenceScore,
          confidenceLevel: ragContext.confidenceLevel,
          dataSourceNote: ragContext.dataSourceNote,
          possibleRootCauses: parsed.possibleRootCauses.slice(0, 2).map(c => ({
            cause: String(c.cause || 'Hardware discrepancy').slice(0, 45),
            confidence: Math.min(95, Math.max(25, Math.round(Number(c.confidence) || 68)))
          })),
          impactLevel: ['Low', 'Medium', 'High', 'Critical'].includes(parsed.impactLevel) ? parsed.impactLevel : 'Medium',
          recommendedDepartment: parsed.recommendedDepartment || department,
          recommendedActions: Array.isArray(parsed.recommendedActions) && parsed.recommendedActions.length > 0
            ? parsed.recommendedActions.slice(0, 3).map(a => String(a).slice(0, 60))
            : ['Inspect physical hardware', 'Verify power and connections'],
          disclaimer: 'AI Recommendation & Confidence Estimate'
        }
      }
    }
  } catch (err) {
    console.warn('[AI Root Cause] LLM query failed, generating category-specific diagnostic fallback:', err.message)
  }

  // ── High-Precision Category-Specific Diagnostic Fallback ──
  return getCategoryAwareRootCause(title, description, category, location, department, ragContext)
}

const getCategoryAwareRootCause = (title, desc, category, location, department, ragContext) => {
  const text = `${title} ${desc}`.toLowerCase()
  let causes = []
  let actions = []
  let summary = ''
  let impact = 'Medium'

  if (category === 'Hostel' || text.match(/water|pipe|leak|tap|drain|flush|plumb|sink|washroom|toilet/i)) {
    causes = [
      { cause: 'Pipe Gasket or Seal Leak', confidence: 82 },
      { cause: 'Drainage Line Obstruction', confidence: 64 }
    ]
    actions = [
      'Shut off local water isolation valve',
      'Replace worn coupling gaskets',
      'Verify water reservoir pump pressure'
    ]
    summary = `Sanitation issue in ${location} likely due to worn pipe seal.`
    impact = text.match(/flood|overflow|burst/i) ? 'High' : 'Medium'
  } else if (text.match(/projector|hdmi|vga|screen|display|audio|mic|speaker|board/i)) {
    causes = [
      { cause: 'Loose HDMI or VGA Cable', confidence: 78 },
      { cause: 'Projector Lamp Exhaustion', confidence: 54 }
    ]
    actions = [
      'Reseat display cabling at both ends',
      'Clean cooling fan intake filters',
      'Test video feed with secondary device'
    ]
    summary = `Display signal interruption in ${location}.`
  } else if (text.match(/wifi|wi-fi|internet|lan|network|router|ethernet|dns|slow/i)) {
    causes = [
      { cause: 'Access Point Client Congestion', confidence: 84 },
      { cause: 'Switch Port Link Negotiation Error', confidence: 62 }
    ]
    actions = [
      'Soft-reboot the local access point',
      'Check DHCP IP pool subnet allocation',
      'Verify switch port link speed'
    ]
    summary = `Network connectivity issue in ${location}.`
    impact = 'High'
  } else if (text.match(/fan|light|ac|air condition|power|switch|socket|spark|wire|tripped/i)) {
    causes = [
      { cause: 'Blown Fan Motor Capacitor', confidence: 82 },
      { cause: 'Faulty Wall Speed Regulator', confidence: 64 }
    ]
    actions = [
      'Isolate power at distribution board',
      'Test and replace fan capacitor',
      'Inspect wall regulator wiring'
    ]
    summary = `Electrical fixture in ${location} indicates capacitor or regulator fault.`
    impact = text.match(/spark|fire|smoke|shock/i) ? 'Critical' : 'Medium'
  } else if (category === 'Academics' || text.match(/marks|exam|grade|attendance|result|cgpa|syllabus|test/i)) {
    causes = [
      { cause: 'ERP academic portal record synchronization latency', confidence: 82 },
      { cause: 'On-Duty (OD) medical slip verification pending coordinator sign-off', confidence: 65 }
    ]
    actions = [
      'Cross-reference raw paper evaluation registers with portal entries',
      'Verify approved OD attendance documentation with HOD office',
      'Prompt department examination coordinator for portal reconciliation'
    ]
    summary = `Academic discrepancy requires manual reconciliation between physical records and ERP portal.`
  } else {
    causes = [
      { cause: `Physical fixture fatigue or maintenance wear in ${location}`, confidence: 70 },
      { cause: 'Operational hardware adjustment or component replacement required', confidence: 55 }
    ]
    actions = [
      'Conduct on-site technical inspection of reported facility',
      'Assess component condition and order replacement spare parts',
      'Log servicing verification once technician completes repair'
    ]
    summary = `Reported ${category.toLowerCase()} issue in ${location} requires localized technician assessment.`
  }

  return {
    summary,
    confidence: ragContext.confidenceScore,
    confidenceLevel: ragContext.confidenceLevel,
    dataSourceNote: ragContext.dataSourceNote,
    possibleRootCauses: causes,
    impactLevel: impact,
    recommendedDepartment: department || 'Maintenance',
    recommendedActions: actions,
    disclaimer: 'AI Recommendation & Confidence Estimate — Not a confirmed fact'
  }
}

/**
 * 2. SLA BREACH PREDICTION & FINAL RESOLUTION ANALYSIS
 * - Active complaints: Real dynamic breach probability, risk level, time remaining, factors.
 * - Resolved complaints: Final SLA Analysis (actual resolution hours vs target SLA).
 */
const predictSLABreach = (complaint, ragContext) => {
  const now = Date.now()
  const createdAt = new Date(complaint.createdAt || now).getTime()
  const hoursElapsed = Math.max(0, (now - createdAt) / (1000 * 60 * 60))

  const catSla = CATEGORY_SLA_HOURS[complaint.category] || 48
  const prioSla = PRIORITY_SLA_HOURS[complaint.priority] || 24
  const targetSlaHours = Math.min(catSla, prioSla)

  // ── FOR RESOLVED COMPLAINTS: Final SLA Analysis ──
  if (complaint.status === 'Resolved') {
    const resDate = complaint.resolutionDate
      ? new Date(complaint.resolutionDate).getTime()
      : complaint.updatedAt
      ? new Date(complaint.updatedAt).getTime()
      : now

    const actualResolutionHours = Number(Math.max(0.2, (resDate - createdAt) / (1000 * 60 * 60)).toFixed(1))
    const isWithinSla = actualResolutionHours <= targetSlaHours
    const finalOutcome = isWithinSla ? 'Resolved Within SLA' : 'SLA Breached'

    return {
      isResolved: true,
      finalOutcome,
      actualResolutionHours,
      targetSlaHours,
      hoursRemaining: 0,
      hoursElapsed: actualResolutionHours,
      riskLevel: 'COMPLETED',
      breachProbability: isWithinSla ? 0 : 100,
      confidence: 100,
      confidenceLevel: 'High Confidence',
      timeRemaining: 'Resolved',
      predictedResolutionTime: `Completed in ${actualResolutionHours}h`,
      factors: [
        `Target SLA window: ${targetSlaHours} hours`,
        `Actual resolution duration: ${actualResolutionHours} hours`,
        isWithinSla
          ? 'Completed within university SLA standards.'
          : `Exceeded target SLA window by ${Number((actualResolutionHours - targetSlaHours).toFixed(1))} hours.`
      ],
      reason: [
        isWithinSla
          ? `Grievance resolved successfully in ${actualResolutionHours} hours (Target SLA: ${targetSlaHours}h).`
          : `Grievance resolved after ${actualResolutionHours} hours, exceeding the ${targetSlaHours}h SLA target.`
      ],
      recommendedAction: 'Grievance lifecycle closed. Student feedback recorded.'
    }
  }

  // ── FOR ACTIVE / PENDING / ESCALATED COMPLAINTS ──
  const hoursRemaining = Number((targetSlaHours - hoursElapsed).toFixed(1))
  const timeline = Array.isArray(complaint.resolutionTimeline) ? complaint.resolutionTimeline : []
  const lastUpdate = timeline.length > 0
    ? new Date(timeline[timeline.length - 1].timestamp).getTime()
    : createdAt
  const hoursSinceLastUpdate = Math.max(0, (now - lastUpdate) / (1000 * 60 * 60))

  const factors = []
  let breachProbability = 10

  // 1. Time progression
  if (hoursRemaining <= 0) {
    breachProbability = 96
    factors.push(`SLA target window of ${targetSlaHours} hours has elapsed (Overdue by ${Math.abs(hoursRemaining)}h).`)
  } else {
    const elapsedPercent = hoursElapsed / targetSlaHours
    breachProbability = Math.round(elapsedPercent * 65)
    factors.push(`${Math.round(hoursRemaining)} hours remain before ${targetSlaHours}h SLA deadline.`)
  }

  // 2. Department queue & historical benchmarks
  const pendingCount = ragContext.pendingDeptCount || 0
  if (pendingCount >= 8) {
    breachProbability += 15
    factors.push(`Department backlog is high (${pendingCount} active complaints).`)
  } else if (pendingCount >= 4) {
    breachProbability += 8
    factors.push(`Department queue has moderate active workload (${pendingCount} complaints).`)
  }

  if (ragContext.avgDeptResolutionHours > targetSlaHours) {
    breachProbability += 8
    factors.push(`Department historical average resolution (${ragContext.avgDeptResolutionHours}h) exceeds target SLA.`)
  }

  // 3. Status staleness
  if (hoursSinceLastUpdate > 24) {
    breachProbability += 18
    factors.push(`Complaint has received no updates or remarks for ${Math.round(hoursSinceLastUpdate)} hours.`)
  } else if (hoursSinceLastUpdate > 12) {
    breachProbability += 10
    factors.push(`No timeline progress recorded in the last ${Math.round(hoursSinceLastUpdate)} hours.`)
  }

  // 4. Assignment status
  if (!complaint.assignedTeacherId && hoursElapsed > 2) {
    breachProbability += 15
    factors.push('Grievance remains unassigned to faculty coordinator.')
  }

  // 5. Escalation status
  if (complaint.status === 'Escalated') {
    breachProbability = Math.max(85, breachProbability + 20)
    factors.push('Complaint has been flagged as Escalated.')
  }

  breachProbability = Math.min(98, Math.max(5, breachProbability))

  // Risk categorization according to prompt:
  // 0-20% = Low Risk, 21-50% = Moderate Risk, 51-75% = High Risk, 76-100% = Critical Risk
  let riskLevel = 'LOW'
  let recommendedAction = 'Routine resolution progress under standard monitoring.'

  if (breachProbability >= 76 || hoursRemaining <= 0) {
    riskLevel = 'CRITICAL'
    recommendedAction = 'Immediate escalation to Department Head (HOD) and assign dedicated emergency technician.'
  } else if (breachProbability >= 51) {
    riskLevel = 'HIGH'
    recommendedAction = 'Escalate to department supervisor and request an immediate status update.'
  } else if (breachProbability >= 21) {
    riskLevel = 'MODERATE'
    recommendedAction = 'Prompt assigned faculty coordinator to submit mid-point progress remark.'
  }

  const timeRemainingStr = hoursRemaining > 0
    ? `${Math.round(hoursRemaining)} hours remaining`
    : `Overdue by ${Math.abs(Math.round(hoursRemaining))} hours`

  const predictedResolutionTime = hoursRemaining > 0
    ? `${Math.round(Math.max(2, hoursRemaining * 1.15))} hours`
    : 'Immediate resolution needed'

  return {
    isResolved: false,
    finalOutcome: 'In Progress',
    actualResolutionHours: null,
    targetSlaHours,
    hoursRemaining,
    hoursElapsed: Number(hoursElapsed.toFixed(1)),
    riskLevel,
    breachProbability,
    confidence: ragContext.confidenceScore,
    confidenceLevel: ragContext.confidenceLevel,
    timeRemaining: timeRemainingStr,
    predictedResolutionTime,
    factors,
    reason: factors,
    recommendedAction
  }
}

/**
 * 3. COMPLAINT HEALTH SCORE (0 TO 100 WEIGHTED CALCULATION)
 * Weighted factors:
 *   SLA compliance: 30%
 *   Status progress: 20%
 *   Response/update frequency: 15%
 *   Assignment status: 10%
 *   Priority & severity: 10%
 *   Complaint recurrence: 10%
 *   User feedback: 5%
 *
 * Health labels:
 *   90-100 = Excellent
 *   75-89  = Healthy
 *   50-74  = Needs Attention
 *   25-49  = At Risk
 *   0-24   = Critical
 */
const calculateComplaintHealthScore = (complaint, slaPrediction, recurringIssue) => {
  const now = Date.now()
  const createdAt = new Date(complaint.createdAt || now).getTime()
  const hoursElapsed = Math.max(0, (now - createdAt) / (1000 * 60 * 60))
  const targetSla = slaPrediction.targetSlaHours || 48

  const timeline = Array.isArray(complaint.resolutionTimeline) ? complaint.resolutionTimeline : []
  const lastUpdate = timeline.length > 0
    ? new Date(timeline[timeline.length - 1].timestamp).getTime()
    : createdAt
  const hoursSinceLastUpdate = Math.max(0, (now - lastUpdate) / (1000 * 60 * 60))

  let slaCompliance = 30
  let statusProgress = 20
  let updateFrequency = 15
  let assignmentStatus = 10
  let prioritySeverity = 10
  let recurrence = 10
  let feedback = 5

  // 1. SLA Compliance (30%)
  if (complaint.status === 'Resolved') {
    const isWithin = slaPrediction.isResolved ? slaPrediction.actualResolutionHours <= targetSla : hoursElapsed <= targetSla
    slaCompliance = isWithin ? 30 : 12
  } else {
    if (hoursElapsed > targetSla) {
      slaCompliance = Math.max(2, Math.round(30 - ((hoursElapsed - targetSla) / 10) * 8))
    } else {
      const ratio = hoursElapsed / targetSla
      if (ratio <= 0.4) slaCompliance = 30
      else if (ratio <= 0.7) slaCompliance = 24
      else slaCompliance = 16
    }
  }

  // 2. Status Progress (20%)
  if (complaint.status === 'Resolved') {
    statusProgress = 20
  } else if (complaint.status === 'In Progress') {
    statusProgress = timeline.length >= 2 ? 18 : 15
  } else if (complaint.status === 'Assigned') {
    statusProgress = 12
  } else if (complaint.status === 'Submitted') {
    statusProgress = hoursElapsed > 6 ? 6 : 10
  } else if (complaint.status === 'Escalated') {
    statusProgress = 4
  }

  // 3. Response / Update Frequency (15%)
  if (complaint.status === 'Resolved') {
    updateFrequency = 15
  } else {
    if (hoursSinceLastUpdate <= 6) updateFrequency = 15
    else if (hoursSinceLastUpdate <= 12) updateFrequency = 12
    else if (hoursSinceLastUpdate <= 24) updateFrequency = 8
    else updateFrequency = 3
  }

  // 4. Assignment Status (10%)
  if (complaint.assignedTeacherId || complaint.assignedTeacherName) {
    assignmentStatus = 10
  } else {
    assignmentStatus = hoursElapsed <= 2 ? 7 : hoursElapsed <= 6 ? 4 : 1
  }

  // 5. Priority & Severity (10%)
  if (complaint.priority === 'low') prioritySeverity = 10
  else if (complaint.priority === 'medium') prioritySeverity = 9
  else if (complaint.priority === 'high') prioritySeverity = 7
  else if (complaint.priority === 'Urgent') prioritySeverity = 5

  // 6. Recurrence (10%)
  if (!recurringIssue || !recurringIssue.isRecurring) {
    recurrence = 10
  } else if (recurringIssue.recurrenceCount === 2) {
    recurrence = 6
  } else {
    recurrence = 2
  }

  // 7. Feedback (5%)
  if (typeof complaint.satisfactionRating === 'number') {
    if (complaint.satisfactionRating >= 4) feedback = 5
    else if (complaint.satisfactionRating === 3) feedback = 3
    else feedback = 1
  } else {
    feedback = 4 // Neutral default prior to closure
  }

  const totalScore = Math.min(100, Math.max(0, Math.round(
    slaCompliance + statusProgress + updateFrequency + assignmentStatus + prioritySeverity + recurrence + feedback
  )))

  // Health labels: 90-100 = Excellent, 75-89 = Healthy, 50-74 = Needs Attention, 25-49 = At Risk, 0-24 = Critical
  let status = 'Healthy'
  let healthLabel = 'Healthy'
  let reason = 'Complaint is progressing under standard SLA.'

  if (totalScore >= 90) {
    status = 'Excellent'
    healthLabel = 'Excellent'
    reason = complaint.status === 'Resolved'
      ? 'Complaint was successfully resolved within SLA with high satisfaction.'
      : 'Grievance is on track with prompt updates and zero SLA delay risk.'
  } else if (totalScore >= 75) {
    status = 'Healthy'
    healthLabel = 'Healthy'
    reason = complaint.status === 'Resolved'
      ? 'Complaint resolved satisfactorily.'
      : 'Complaint is actively assigned and progressing within SLA parameters.'
  } else if (totalScore >= 50) {
    status = 'Needs Attention'
    healthLabel = 'Needs Attention'
    if (hoursSinceLastUpdate > 18) {
      reason = 'The complaint is assigned, but there have been no recent updates and the SLA deadline is approaching.'
    } else if (!complaint.assignedTeacherId) {
      reason = 'Complaint is awaiting faculty assignment to proceed with investigation.'
    } else {
      reason = 'Moderate delay in resolution progress; ongoing monitoring recommended.'
    }
  } else if (totalScore >= 25) {
    status = 'At Risk'
    healthLabel = 'At Risk'
    reason = hoursElapsed > targetSla
      ? 'SLA target has been breached and progress remains stalled.'
      : 'High risk of SLA breach due to prolonged lack of status progression.'
  } else {
    status = 'Critical'
    healthLabel = 'Critical'
    reason = 'Severe breach or escalated backlog requiring immediate administrative intervention.'
  }

  return {
    score: totalScore,
    status,
    healthLabel,
    reason,
    factors: {
      slaRisk: slaPrediction.riskLevel,
      recentUpdates: hoursSinceLastUpdate <= 12 ? 'Good' : hoursSinceLastUpdate <= 24 ? 'Moderate' : 'Delayed',
      impact: complaint.priority === 'Urgent' ? 'Critical' : complaint.priority === 'high' ? 'High' : 'Normal',
      recurringRisk: recurringIssue?.isRecurring ? 'Elevated' : 'Low'
    },
    breakdown: {
      slaCompliance,
      statusProgress,
      updateFrequency,
      assignmentStatus,
      prioritySeverity,
      recurrence,
      feedback
    },
    recommendedAction: slaPrediction.recommendedAction || 'Monitor department progress'
  }
}

/**
 * 4. RECURRING ISSUE DETECTION
 */
const detectRecurringIssue = (complaint, allComplaints = []) => {
  const now = Date.now()
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const complaintId = String(complaint._id || complaint.id || '')
  const location = (complaint.location || '').trim().toLowerCase()
  const category = (complaint.category || '').trim().toLowerCase()
  const text = `${complaint.title || ''} ${complaint.description || ''}`.toLowerCase()

  const patterns = [
    { regex: /projector|display|hdmi|vga/i, name: 'Projector failures' },
    { regex: /wifi|wi-fi|internet|network|lan/i, name: 'Network & Wi-Fi drops' },
    { regex: /ac|air condition|cooler/i, name: 'HVAC / Cooling failures' },
    { regex: /fan|light|tube|switch/i, name: 'Electrical fixture breakdowns' },
    { regex: /water|pipe|leak|washroom|tap/i, name: 'Plumbing & sanitation leaks' },
    { regex: /pc|workstation|computer|lab/i, name: 'Computer workstation failures' },
    { regex: /exam|attendance|marks/i, name: 'Academic portal entry discrepancies' }
  ]

  let detectedPattern = `${complaint.category || 'Facility'} issue pattern`
  for (const p of patterns) {
    if (p.regex.test(text)) {
      detectedPattern = p.name
      break
    }
  }

  const matches = allComplaints.filter(c => {
    const otherId = String(c._id || c.id || '')
    if (otherId === complaintId) return false

    const cCreated = new Date(c.createdAt || 0).getTime()
    if (now - cCreated > THIRTY_DAYS_MS) return false

    const otherLoc = (c.location || '').trim().toLowerCase()
    const otherText = `${c.title || ''} ${c.description || ''}`.toLowerCase()

    const sameLocation = location && otherLoc && (location.includes(otherLoc) || otherLoc.includes(location))
    const sameCategory = category && c.category && category === c.category.toLowerCase()

    let patternMatch = false
    for (const p of patterns) {
      if (p.regex.test(text) && p.regex.test(otherText)) {
        patternMatch = true
        break
      }
    }

    return (sameLocation && (sameCategory || patternMatch)) || (sameLocation && patternMatch)
  })

  const recurrenceCount = matches.length + 1
  const isRecurring = recurrenceCount >= 2

  let severity = 'Low'
  if (recurrenceCount >= 4) severity = 'High'
  else if (recurrenceCount >= 2) severity = 'Medium'

  let recommendation = 'Standard individual complaint resolution.'
  if (isRecurring) {
    if (detectedPattern.includes('Projector') || detectedPattern.includes('Cooling')) {
      recommendation = 'Consider permanent maintenance or equipment replacement instead of repeated temporary repairs.'
    } else if (detectedPattern.includes('Network') || detectedPattern.includes('Wi-Fi')) {
      recommendation = 'Conduct frequency channel scan and upgrade access point capacity in this zone.'
    } else if (detectedPattern.includes('Plumbing')) {
      recommendation = 'Schedule full line pressure check and replace aged plumbing couplings.'
    } else {
      recommendation = 'Initiate preventative facility maintenance audit for this location.'
    }
  }

  return {
    isRecurring,
    recurrenceCount,
    timePeriod: '30 days',
    affectedLocation: complaint.location || 'Campus Facility',
    issuePattern: detectedPattern,
    severity,
    recommendation,
    relatedComplaintIds: matches.map(c => c.complaintId || c.ticketNumber || c.id || c._id).slice(0, 5)
  }
}

/**
 * 4B. AI RESOLUTION PREDICTION AGENT (AGENT H)
 * Predicts resolution timeframe, resolution path, responsible department,
 * probability of escalation, probability of SLA breach.
 * For resolved complaints, shows actual historical completion metrics.
 */
const predictResolutionTimeAndPath = (complaint, ragContext = {}) => {
  const now = Date.now()
  const createdAt = new Date(complaint.createdAt || now).getTime()
  const hoursElapsed = Math.max(0, (now - createdAt) / (1000 * 60 * 60))
  const category = complaint.category || 'General'
  const department = complaint.department || 'Maintenance'
  const priority = complaint.priority || 'medium'
  const status = complaint.status || 'Submitted'

  // If resolved, return historical analysis rather than active risk
  if (status === 'Resolved') {
    const resDate = complaint.resolutionDate
      ? new Date(complaint.resolutionDate).getTime()
      : complaint.updatedAt
      ? new Date(complaint.updatedAt).getTime()
      : now
    const actualHours = Number(Math.max(0.2, (resDate - createdAt) / (1000 * 60 * 60)).toFixed(1))
    const catSla = CATEGORY_SLA_HOURS[category] || 48
    const prioSla = PRIORITY_SLA_HOURS[priority] || 24
    const targetSla = Math.min(catSla, prioSla)
    const isWithinSla = actualHours <= targetSla

    return {
      isResolved: true,
      actualResolutionHours: actualHours,
      estimatedTimeframe: `Resolved in ${actualHours} hours`,
      estimatedHours: actualHours,
      confidence: 96,
      confidenceLevel: 'High Confidence',
      resolutionPath: ['Submitted', 'Assigned', 'In Progress', 'Resolved'],
      currentStage: 'Resolved',
      responsibleDepartment: department,
      probabilityOfEscalation: 0,
      probabilityOfSLABreach: isWithinSla ? 0 : 100,
      outcome: isWithinSla ? 'Resolved within SLA' : 'Resolved after SLA deadline',
      historicalBasis: `Historical case closed in ${actualHours}h (Target SLA: ${targetSla}h).`,
      disclaimer: 'Historical actual resolution record — closed ticket.'
    }
  }

  // Active complaint resolution prediction
  let baseHours = 24
  if (priority === 'Urgent') baseHours = 4
  else if (priority === 'high') baseHours = 12
  else if (category === 'Hostel') baseHours = 18
  else if (category === 'Infrastructure') baseHours = 36
  else if (category === 'Academics') baseHours = 24

  const pendingCount = ragContext.pendingDeptCount || 0
  if (pendingCount >= 8) baseHours = Math.round(baseHours * 1.4)
  else if (pendingCount >= 4) baseHours = Math.round(baseHours * 1.15)

  let timeframeStr = '1–2 working days'
  if (baseHours <= 6) timeframeStr = '4–6 hours'
  else if (baseHours <= 12) timeframeStr = '8–12 hours'
  else if (baseHours <= 24) timeframeStr = '24 hours (1 working day)'
  else if (baseHours <= 48) timeframeStr = '1–2 working days'
  else timeframeStr = '2–3 working days'

  // Dynamic resolution path based on category
  let path = ['Assigned', 'Technical Inspection', 'Repair & Service', 'Student Verification']
  if (category === 'Academics') {
    path = ['Coordinator Assigned', 'ERP Record Reconciliation', 'HOD Validation', 'Portal Update']
  } else if (category === 'Hostel') {
    path = ['Warden Inspection', 'Technician Dispatch', 'Fixture Repair', 'Student Sign-off']
  } else if (category === 'Transport') {
    path = ['Transport Officer Review', 'Fleet Maintenance', 'Route Optimization', 'Closure']
  }

  // Current stage in resolution path
  let currentStage = 'Intake'
  if (status === 'Assigned') currentStage = path[0] || 'Assigned'
  else if (status === 'In Progress') currentStage = path[1] || 'In Progress'
  else if (status === 'Escalated') currentStage = 'Urgent Escalation'

  // Probability of escalation
  let escalationProb = 12
  if (priority === 'Urgent') escalationProb += 30
  if (hoursElapsed > 18 && status === 'Submitted') escalationProb += 35
  if (status === 'Escalated') escalationProb = 95
  if (pendingCount > 6) escalationProb += 15
  escalationProb = Math.min(95, Math.max(5, escalationProb))

  const breachProb = ragContext.slaPrediction?.breachProbability || (escalationProb > 50 ? 65 : 20)
  const confidence = ragContext.confidenceScore || 74
  const confidenceLevel = ragContext.confidenceLevel || 'Medium Confidence'

  return {
    isResolved: false,
    estimatedTimeframe: timeframeStr,
    estimatedHours: baseHours,
    confidence,
    confidenceLevel,
    resolutionPath: path,
    currentStage,
    responsibleDepartment: department,
    probabilityOfEscalation: escalationProb,
    probabilityOfSLABreach: breachProb,
    historicalBasis: ragContext.similar?.length
      ? `Prediction based on ${ragContext.similar.length} verified similar cases in ${department}.`
      : `Prediction based on institutional SLA benchmarks for ${category}.`,
    disclaimer: 'AI prediction based on similar historical cases — not a confirmed fact.'
  }
}

/**
 * 4C. SMART ESCALATION AGENT
 * Automatically evaluates whether a complaint qualifies for escalation recommendation.
 * Does not automatically escalate without authorized approval or administrator action.
 */
const evaluateSmartEscalation = (complaint, slaPrediction, recurringIssue) => {
  if (!complaint || complaint.status === 'Resolved' || complaint.status === 'Escalated') {
    return { shouldEscalate: false, reason: null, contributingFactors: [] }
  }

  const now = Date.now()
  const createdAt = new Date(complaint.createdAt || now).getTime()
  const timeline = Array.isArray(complaint.resolutionTimeline) ? complaint.resolutionTimeline : []
  const lastUpdate = timeline.length > 0
    ? new Date(timeline[timeline.length - 1].timestamp).getTime()
    : createdAt
  const hoursSinceLastUpdate = Math.max(0, (now - lastUpdate) / (1000 * 60 * 60))
  const hoursElapsed = Math.max(0, (now - createdAt) / (1000 * 60 * 60))

  const isHighSlaRisk = slaPrediction && (slaPrediction.riskLevel === 'HIGH' || slaPrediction.riskLevel === 'CRITICAL')
  const isInactive = hoursSinceLastUpdate >= 18
  const isHighPriority = complaint.priority === 'Urgent' || complaint.priority === 'high'
  const isRecurring = recurringIssue?.isRecurring && recurringIssue.recurrenceCount >= 2

  const factors = []
  let qualifies = false

  if (isHighSlaRisk && isInactive) {
    qualifies = true
    factors.push(`High SLA risk (${slaPrediction.breachProbability}%) and no update for ${Math.round(hoursSinceLastUpdate)} hours.`)
  } else if (isHighPriority && hoursElapsed >= 12 && !complaint.assignedTeacherId) {
    qualifies = true
    factors.push(`High priority complaint has remained unassigned for ${Math.round(hoursElapsed)} hours.`)
  } else if (isRecurring && isHighSlaRisk) {
    qualifies = true
    factors.push(`Recurring failure pattern (${recurringIssue.recurrenceCount} occurrences) with elevated SLA breach probability.`)
  } else if (hoursSinceLastUpdate >= 36) {
    qualifies = true
    factors.push(`Complaint resolution has stalled with no updates for ${Math.round(hoursSinceLastUpdate)} hours.`)
  }

  return {
    shouldEscalate: qualifies,
    priority: isHighPriority || slaPrediction?.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    confidence: isHighSlaRisk ? 88 : 76,
    reason: factors[0] || 'Prolonged lack of status updates warrants administrative escalation.',
    contributingFactors: factors,
    recommendedAction: 'Escalate to Department Head (HOD) and assign dedicated emergency technician.'
  }
}

// In-memory set of dismissed recommendation IDs
const dismissedRecommendationIds = new Set()

const dismissRecommendation = (id) => {
  if (id) dismissedRecommendationIds.add(String(id))
}

/**
 * 5. CAMPUS ISSUE HOTSPOT DETECTION
 */
const detectIssueHotspots = (complaints = [], dateRangeDays = 30) => {
  const now = Date.now()
  const cutoffMs = dateRangeDays * 24 * 60 * 60 * 1000
  const midpointMs = (dateRangeDays / 2) * 24 * 60 * 60 * 1000

  const recent = complaints.filter(c => {
    const t = new Date(c.createdAt || 0).getTime()
    return now - t <= cutoffMs
  })

  const groups = {}
  recent.forEach(c => {
    const loc = (c.location || '').trim() || (c.department ? `${c.department} Wing` : 'Main Campus Grounds')
    const t = new Date(c.createdAt || 0).getTime()
    const isRecentHalf = now - t <= midpointMs

    if (!groups[loc]) {
      groups[loc] = { location: loc, total: 0, recentHalf: 0, olderHalf: 0, categories: {}, severities: [] }
    }

    groups[loc].total += 1
    if (isRecentHalf) groups[loc].recentHalf += 1
    else groups[loc].olderHalf += 1

    const cat = c.category || 'General'
    groups[loc].categories[cat] = (groups[loc].categories[cat] || 0) + 1

    const pWeight = c.priority === 'Urgent' ? 4 : c.priority === 'high' ? 3 : c.priority === 'medium' ? 2 : 1
    groups[loc].severities.push(pWeight)
  })

  const hotspots = Object.values(groups).map(g => {
    let trend = 'Stable'
    if (g.recentHalf > g.olderHalf * 1.25) trend = 'Increasing'
    else if (g.olderHalf > g.recentHalf * 1.25) trend = 'Decreasing'

    const topIssues = Object.entries(g.categories)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
      .slice(0, 3)

    let severity = 'Low'
    if (g.total >= 8 || g.severities.some(s => s === 4)) severity = 'High'
    else if (g.total >= 3) severity = 'Medium'

    const avgSev = g.severities.reduce((a, b) => a + b, 0) / (g.severities.length || 1)
    const impactScore = Math.min(99, Math.round((g.total * 6) + (avgSev * 10)))

    return {
      location: g.location,
      complaintCount: g.total,
      trend,
      topIssues,
      severity,
      impactScore
    }
  })

  return hotspots.sort((a, b) => b.complaintCount - a.complaintCount)
}

/**
 * 6. CENTRALIZED COMPLAINT INTELLIGENCE ORCHESTRATOR
 * Gathers RAG context, executes all analyses, records historical snapshots,
 * caches results, and dispatches real-time telemetry.
 */
const analyzeComplaintIntelligence = async (complaint, options = { force: false }) => {
  if (!complaint) return null
  const complaintId = complaint._id ? String(complaint._id) : String(complaint.id || '')
  const ticketId = complaint.complaintId || complaint.ticketNumber || `CR-${complaintId.slice(-3)}`

  // Retrieve existing record to preserve analysisHistory
  let existing = null
  if (mongoose.connection.readyState === 1) {
    existing = await ComplaintAIAnalysis.findOne({ complaintId }).lean().catch(() => null)
  } else {
    existing = inMemoryStore.findAIAnalysisByComplaintId(complaintId)
  }

  // Cache check (unless force is requested)
  if (!options.force && existing && existing.generatedAt) {
    const ageMs = Date.now() - new Date(existing.generatedAt).getTime()
    // Cache valid for 10 minutes if status unchanged
    if (ageMs < 10 * 60 * 1000) {
      return existing
    }
  }

  // 1. RAG Context Retrieval
  const ragContext = await retrieveComplaintRAGContext(complaint)

  // 2. Recurring Issue Detection
  const recurringIssue = detectRecurringIssue(complaint, ragContext.allComplaints)

  // 3. Dynamic SLA Breach Prediction / Final Resolution Analysis
  const slaPrediction = predictSLABreach(complaint, ragContext)

  // 4. Dynamic 7-Factor Weighted Health Score
  const healthScore = calculateComplaintHealthScore(complaint, slaPrediction, recurringIssue)

  // 5. Category-Aware Root Cause Analysis (LLM + RAG)
  const rootCauseAnalysis = await analyzeRootCause(complaint, ragContext)

  // 6. AI Resolution Prediction Agent (Agent H)
  const resolutionPrediction = predictResolutionTimeAndPath(complaint, { ...ragContext, slaPrediction })

  // 7. Smart Escalation Evaluation (Agent 9)
  const smartEscalation = evaluateSmartEscalation(complaint, slaPrediction, recurringIssue)

  // 8. Manage Analysis History Snapshot
  const analysisHistory = Array.isArray(existing?.analysisHistory) ? [...existing.analysisHistory] : []
  if (existing?.healthScore?.score !== undefined) {
    analysisHistory.unshift({
      timestamp: existing.generatedAt || new Date().toISOString(),
      healthScore: existing.healthScore.score,
      slaRiskLevel: existing.slaPrediction?.riskLevel || 'LOW',
      reason: existing.healthScore.reason || 'Previous evaluation'
    })
    if (analysisHistory.length > 5) analysisHistory.length = 5
  }

  const analysisPayload = {
    complaintId,
    complaintTicketId: ticketId,
    rootCauseAnalysis,
    slaPrediction,
    recurringIssue,
    healthScore,
    resolutionPrediction,
    smartEscalation,
    analysisHistory,
    analysisVersion: 4,
    analysisStatus: 'ready',
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // Persist to MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      await ComplaintAIAnalysis.findOneAndUpdate(
        { complaintId },
        { $set: analysisPayload },
        { upsert: true, new: true }
      )
    } catch (err) {
      console.error('[AI Intelligence] Mongo save error:', err.message)
    }
  }

  // Sync to inMemoryStore
  inMemoryStore.saveAIAnalysis(analysisPayload)

  // Check and dispatch notifications
  checkAndSendIntelligenceNotifications(complaint, analysisPayload).catch(err =>
    console.error('[AI Intelligence Notifications] Error:', err.message)
  )

  // Emit real-time Socket.io update safely
  try {
    const io = getIO()
    if (io) {
      io.emit('ai_intelligence_updated', {
        complaintId,
        complaintTicketId: ticketId,
        analysis: analysisPayload
      })
    }
  } catch (_socketErr) {
    // Socket.io not initialized in this context (e.g. CLI or pre-startup), safe to ignore
  }

  return analysisPayload
}

/**
 * 7. NOTIFICATION INTEGRATION WITH COOLDOWN
 */
const checkAndSendIntelligenceNotifications = async (complaint, analysis) => {
  const complaintId = String(complaint._id || complaint.id || '')
  const ticketId = analysis.complaintTicketId || complaint.complaintId || 'Complaint'
  const studentId = complaint.studentId || complaint.studentEmail

  // SLA High/Critical Risk
  if (analysis.slaPrediction && !analysis.slaPrediction.isResolved &&
     (analysis.slaPrediction.riskLevel === 'HIGH' || analysis.slaPrediction.riskLevel === 'CRITICAL')) {
    const keyAdmin = `${complaintId}_sla_admin`
    if (isNotificationAllowed(keyAdmin)) {
      markNotificationSent(keyAdmin)
      await createNotification({
        userId: 'admin',
        userRole: 'admin',
        type: 'sla_risk_alert',
        title: '⚠️ SLA Breach Risk Alert',
        message: `${ticketId} has a ${analysis.slaPrediction.riskLevel} risk of SLA breach (${analysis.slaPrediction.breachProbability}% probability).`,
        metadata: { complaintId, ticketId, riskLevel: analysis.slaPrediction.riskLevel }
      })
      emitToRole('admin', 'sla_risk_alert', { complaintId, ticketId, riskLevel: analysis.slaPrediction.riskLevel })
    }

    const keyStudent = `${complaintId}_sla_student`
    if (studentId && isNotificationAllowed(keyStudent)) {
      markNotificationSent(keyStudent)
      await createNotification({
        userId: studentId,
        userRole: 'student',
        type: 'sla_delayed_notice',
        title: 'Status Update on Your Complaint',
        message: 'Your complaint is taking longer than expected. The responsible department has been notified.',
        metadata: { complaintId, ticketId }
      })
      emitToUser(studentId, 'sla_delayed_notice', { complaintId, ticketId })
    }
  }

  // Recurring Issue Detected
  if (analysis.recurringIssue && analysis.recurringIssue.isRecurring && analysis.recurringIssue.recurrenceCount >= 2) {
    const keyRecurring = `${complaintId}_recurring`
    if (isNotificationAllowed(keyRecurring)) {
      markNotificationSent(keyRecurring)
      const loc = analysis.recurringIssue.affectedLocation || 'Campus'
      await createNotification({
        userId: 'admin',
        userRole: 'admin',
        type: 'recurring_issue_alert',
        title: '🔁 Recurring Issue Detected',
        message: `A recurring issue has been detected in ${loc} (${analysis.recurringIssue.recurrenceCount} occurrences in 30 days).`,
        metadata: { complaintId, location: loc, pattern: analysis.recurringIssue.issuePattern }
      })
      emitToRole('admin', 'recurring_issue_alert', { complaintId, location: loc })
    }
  }

  // Health Score Critical Alert (< 25)
  if (analysis.healthScore && analysis.healthScore.score < 25 && complaint.status !== 'Resolved') {
    const keyHealth = `${complaintId}_health_critical`
    if (isNotificationAllowed(keyHealth)) {
      markNotificationSent(keyHealth)
      await createNotification({
        userId: 'admin',
        userRole: 'admin',
        type: 'health_score_alert',
        title: '🚨 Critical Complaint Health',
        message: `${ticketId} health score dropped to ${analysis.healthScore.score}/100. Immediate attention recommended.`,
        metadata: { complaintId, ticketId, score: analysis.healthScore.score }
      })
      emitToRole('admin', 'health_score_alert', { complaintId, ticketId, score: analysis.healthScore.score })
    }
  }
}

/**
 * 8. ADMIN CAMPUS INTELLIGENCE SUMMARY (ALL 9 SECTIONS)
 */
const getCampusIntelligenceSummary = async (options = {}) => {
  let allComplaints = []
  if (mongoose.connection.readyState === 1) {
    allComplaints = await Complaint.find({}).sort({ createdAt: -1 }).lean().catch(() => [])
  } else {
    allComplaints = inMemoryStore.complaints || []
  }

  const hotspots = detectIssueHotspots(allComplaints, 30)

  let allAnalyses = []
  if (mongoose.connection.readyState === 1) {
    allAnalyses = await ComplaintAIAnalysis.find({}).lean().catch(() => [])
  } else {
    allAnalyses = inMemoryStore.getAllAIAnalyses() || []
  }

  const analysisMap = new Map()
  allAnalyses.forEach(a => analysisMap.set(String(a.complaintId), a))

  let totalHealth = 0
  let analyzedCount = 0
  let highSlaRiskCount = 0
  let criticalHealthCount = 0
  let recurringCount = 0
  const highRiskComplaints = []
  const resolvedHistoricalSla = []
  const recurringIssueItems = []
  const recurringPatterns = {}
  const rootCauseTallies = {}
  const deptMap = {}

  allComplaints.forEach(c => {
    const cId = String(c._id || c.id)
    const dept = c.department || 'General'
    if (!deptMap[dept]) {
      deptMap[dept] = {
        department: dept,
        totalComplaints: 0,
        resolvedCount: 0,
        pendingCount: 0,
        totalResolutionHours: 0,
        withinSlaCount: 0,
        totalHealth: 0,
        healthCount: 0
      }
    }
    deptMap[dept].totalComplaints++
    if (c.status === 'Resolved') {
      deptMap[dept].resolvedCount++
    } else {
      deptMap[dept].pendingCount++
    }

    let analysis = options.force ? null : analysisMap.get(cId)

    // Recompute if forced, missing, or if complaint is resolved but analysis has stale active SLA state
    if (!analysis || (c.status === 'Resolved' && analysis.slaPrediction && !analysis.slaPrediction.isResolved)) {
      const sla = predictSLABreach(c, { pendingDeptCount: 0, avgDeptResolutionHours: 24, confidenceScore: 70 })
      const recurring = detectRecurringIssue(c, allComplaints)
      const health = calculateComplaintHealthScore(c, sla, recurring)
      const resolution = predictResolutionTimeAndPath(c, { slaPrediction: sla, confidenceScore: 70 })
      const smartEsc = evaluateSmartEscalation(c, sla, recurring)

      analysis = {
        complaintId: cId,
        complaintTicketId: c.complaintId || c.ticketNumber,
        slaPrediction: sla,
        recurringIssue: recurring,
        healthScore: health,
        resolutionPrediction: resolution,
        smartEscalation: smartEsc
      }
    }

    if (analysis) {
      if (analysis.healthScore?.score !== undefined) {
        totalHealth += analysis.healthScore.score
        analyzedCount++
        deptMap[dept].totalHealth += analysis.healthScore.score
        deptMap[dept].healthCount++

        if (analysis.healthScore.score < 30 && c.status !== 'Resolved') {
          criticalHealthCount++
        }
      }

      // Root cause pattern accumulation
      if (analysis.rootCauseAnalysis?.possibleRootCauses) {
        analysis.rootCauseAnalysis.possibleRootCauses.forEach(rc => {
          const name = rc.cause || 'Hardware failure'
          if (!rootCauseTallies[name]) {
            rootCauseTallies[name] = { cause: name, count: 0, sumConf: 0, category: c.category || 'General' }
          }
          rootCauseTallies[name].count++
          rootCauseTallies[name].sumConf += (rc.confidence || 70)
        })
      }

      // SLA Tracking: Separate active risk from resolved historical analysis
      if (c.status === 'Resolved') {
        const createdAt = new Date(c.createdAt || Date.now()).getTime()
        const resDate = c.resolutionDate ? new Date(c.resolutionDate).getTime() : new Date(c.updatedAt || Date.now()).getTime()
        const actualHours = Number(Math.max(0.2, (resDate - createdAt) / (1000 * 60 * 60)).toFixed(1))
        const catSla = CATEGORY_SLA_HOURS[c.category] || 48
        const prioSla = PRIORITY_SLA_HOURS[c.priority] || 24
        const targetSla = Math.min(catSla, prioSla)
        const withinSla = actualHours <= targetSla

        deptMap[dept].totalResolutionHours += actualHours
        if (withinSla) deptMap[dept].withinSlaCount++

        if (resolvedHistoricalSla.length < 8) {
          resolvedHistoricalSla.push({
            complaintId: cId,
            ticketId: c.complaintId || c.ticketNumber || `CR-${cId.slice(-4)}`,
            title: c.title,
            category: c.category,
            department: dept,
            actualResolutionHours: actualHours,
            targetSlaHours: targetSla,
            outcome: withinSla ? 'Resolved within SLA' : 'Resolved after SLA deadline',
            isWithinSla: withinSla
          })
        }
      } else {
        // ACTIVE COMPLAINTS ONLY for SLA risk
        if (analysis.slaPrediction && !analysis.slaPrediction.isResolved &&
           (analysis.slaPrediction.riskLevel === 'HIGH' || analysis.slaPrediction.riskLevel === 'CRITICAL')) {
          highSlaRiskCount++
          highRiskComplaints.push({
            complaintId: cId,
            ticketId: c.complaintId || c.ticketNumber || `CR-${cId.slice(-4)}`,
            title: c.title,
            category: c.category,
            department: c.department,
            status: c.status,
            priority: c.priority,
            location: c.location,
            breachProbability: analysis.slaPrediction.breachProbability,
            riskLevel: analysis.slaPrediction.riskLevel,
            timeRemaining: analysis.slaPrediction.timeRemaining,
            smartEscalation: analysis.smartEscalation || evaluateSmartEscalation(c, analysis.slaPrediction, analysis.recurringIssue)
          })
        }
      }

      if (analysis.recurringIssue?.isRecurring) {
        recurringCount++
        const pat = analysis.recurringIssue.issuePattern || 'Facility fault'
        recurringPatterns[pat] = (recurringPatterns[pat] || 0) + 1

        recurringIssueItems.push({
          complaintId: cId,
          ticketId: c.complaintId || c.ticketNumber,
          pattern: pat,
          location: analysis.recurringIssue.affectedLocation,
          count: analysis.recurringIssue.recurrenceCount,
          recommendation: analysis.recurringIssue.recommendation,
          severity: analysis.recurringIssue.severity
        })
      }
    }
  })

  // Department Performance Trends
  const departmentPerformanceTrends = Object.values(deptMap).map(d => {
    const avgRes = d.resolvedCount > 0 ? Number((d.totalResolutionHours / d.resolvedCount).toFixed(1)) : 24.0
    const complianceRate = d.resolvedCount > 0 ? Math.round((d.withinSlaCount / d.resolvedCount) * 100) : 85
    const avgH = d.healthCount > 0 ? Math.round(d.totalHealth / d.healthCount) : 80

    let trend = 'Stable'
    if (complianceRate >= 80 && d.pendingCount <= 3) trend = 'Improving'
    else if (complianceRate < 65 || d.pendingCount >= 6) trend = 'Needs Attention'

    return {
      department: d.department,
      totalComplaints: d.totalComplaints,
      resolvedCount: d.resolvedCount,
      pendingCount: d.pendingCount,
      avgResolutionHours: avgRes,
      slaComplianceRate: complianceRate,
      healthScore: avgH,
      trend
    }
  }).sort((a, b) => b.totalComplaints - a.totalComplaints)

  // Most frequent pattern
  let mostFrequentPattern = 'None detected'
  let maxPatternCount = 0
  for (const [pat, cnt] of Object.entries(recurringPatterns)) {
    if (cnt > maxPatternCount) {
      maxPatternCount = cnt
      mostFrequentPattern = pat
    }
  }

  const avgHealth = analyzedCount > 0 ? Math.round(totalHealth / analyzedCount) : 82
  const highRiskLocations = hotspots.filter(h => h.severity === 'High').length
  const totalComplaintsCount = allComplaints.length
  const resolvedCount = allComplaints.filter(c => c.status === 'Resolved').length
  const activeCount = totalComplaintsCount - resolvedCount

  // Aggregated Root Cause Insights
  const topRootCauses = Object.values(rootCauseTallies)
    .map(rc => ({
      cause: rc.cause,
      category: rc.category,
      frequency: rc.count,
      confidence: Math.round(rc.sumConf / (rc.count || 1))
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 6)

  // Resolution Prediction Benchmarks
  const resolutionPredictionBenchmarks = [
    { category: 'Hostel', typicalResolutionTime: '18–24 hours', slaTargetHours: 24, path: ['Warden Review', 'Technician Dispatch', 'Fixture Repair', 'Verification'], avgEscalationRate: 12 },
    { category: 'Infrastructure', typicalResolutionTime: '1–2 working days', slaTargetHours: 48, path: ['Assigned', 'Technical Inspection', 'Component Servicing', 'Closure'], avgEscalationRate: 18 },
    { category: 'Academics', typicalResolutionTime: '24–36 hours', slaTargetHours: 24, path: ['Coordinator Review', 'ERP Recheck', 'HOD Validation', 'Record Sync'], avgEscalationRate: 8 },
    { category: 'Transport', typicalResolutionTime: '12–24 hours', slaTargetHours: 24, path: ['Fleet Officer', 'Logistics Check', 'Maintenance', 'Closure'], avgEscalationRate: 10 },
    { category: 'General', typicalResolutionTime: '24–48 hours', slaTargetHours: 48, path: ['Intake Review', 'Department Allocation', 'Resolution', 'Feedback'], avgEscalationRate: 14 }
  ]

  // Campus Recommended Actions
  const recommendedActions = [
    {
      priority: highSlaRiskCount > 0 ? 'CRITICAL' : 'HIGH',
      confidence: 90,
      title: highSlaRiskCount > 0 ? 'Triage Overdue & High-Risk SLA Tickets' : 'Maintain Optimal Department Queue Flow',
      reason: highSlaRiskCount > 0 ? `${highSlaRiskCount} active grievance(s) are approaching or have exceeded their SLA window.` : 'All complaints are currently progressing within target SLA windows.',
      action: highSlaRiskCount > 0 ? 'Reassign high-risk tickets to available senior faculty or department technicians.' : 'Conduct daily supervisor review.'
    },
    {
      priority: 'HIGH',
      confidence: 85,
      title: 'Address Campus Hotspot Clusters',
      reason: hotspots[0] ? `${hotspots[0].location} has reported ${hotspots[0].complaintCount} issues recently.` : 'No critical hotspot clusters detected.',
      action: hotspots[0] ? `Schedule proactive facility inspection for ${hotspots[0].location}.` : 'Continue monitoring venue telemetry.'
    },
    {
      priority: 'MEDIUM',
      confidence: 82,
      title: 'Preventative Equipment Maintenance',
      reason: `Recurring failure pattern '${mostFrequentPattern}' reported across campus areas.`,
      action: 'Replace worn consumables and schedule preventative maintenance audit.'
    }
  ]

  // Structured Categorized AI Recommendations for Recommendation Center
  const urgentActions = []
  const patternAlerts = []
  const opportunities = []

  // Build urgent actions from high-risk complaints & smart escalations
  highRiskComplaints.forEach(hr => {
    const recId = `urgent_sla_${hr.complaintId}`
    if (!dismissedRecommendationIds.has(recId)) {
      urgentActions.push({
        id: recId,
        category: 'URGENT_ACTION',
        priority: hr.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        confidence: Math.min(95, 75 + Math.round(hr.breachProbability * 0.2)),
        title: `High SLA Breach Risk: ${hr.ticketId}`,
        reason: `${hr.title} (${hr.category}) in ${hr.department} has ${hr.breachProbability}% breach probability. ${hr.timeRemaining}.`,
        recommendedAction: hr.smartEscalation?.shouldEscalate ? hr.smartEscalation.recommendedAction : 'Escalate to supervisor and verify technician availability.',
        complaintId: hr.complaintId,
        ticketId: hr.ticketId,
        department: hr.department,
        location: hr.location,
        actions: ['View Complaint', 'Escalate', 'Assign', 'Dismiss']
      })
    }
  })

  // Build pattern alerts from recurring issues and hotspots
  hotspots.filter(h => h.severity === 'High' || h.complaintCount >= 4).forEach((h, idx) => {
    const recId = `pattern_hotspot_${idx}_${h.location.replace(/\s+/g, '_')}`
    if (!dismissedRecommendationIds.has(recId)) {
      patternAlerts.push({
        id: recId,
        category: 'PATTERN_ALERT',
        priority: h.severity === 'High' ? 'HIGH' : 'MEDIUM',
        confidence: 88,
        title: `Campus Hotspot Alert: ${h.location}`,
        reason: `${h.complaintCount} complaints recorded in 30 days. Trend is ${h.trend.toLowerCase()} with primary issues: ${h.topIssues.join(', ')}.`,
        recommendedAction: `Deploy maintenance team for on-site facility audit of ${h.location}.`,
        location: h.location,
        actions: ['Review Pattern', 'View Hotspot', 'Dismiss']
      })
    }
  })

  recurringIssueItems.slice(0, 4).forEach((ri, idx) => {
    const recId = `pattern_recurring_${ri.complaintId || idx}`
    if (!dismissedRecommendationIds.has(recId)) {
      patternAlerts.push({
        id: recId,
        category: 'PATTERN_ALERT',
        priority: ri.severity === 'High' ? 'HIGH' : 'MEDIUM',
        confidence: 84,
        title: `Recurring Failure: ${ri.pattern}`,
        reason: `Reported ${ri.count} times in ${ri.location}. Repeated repairs have not resolved root cause.`,
        recommendedAction: ri.recommendation || 'Initiate preventative replacement of affected hardware.',
        complaintId: ri.complaintId,
        ticketId: ri.ticketId,
        location: ri.location,
        actions: ['View Complaint', 'Review Pattern', 'Dismiss']
      })
    }
  })

  // Build opportunities from department bottlenecks & preventative optimizations
  departmentPerformanceTrends.filter(d => d.trend === 'Needs Attention' || d.pendingCount >= 4).forEach(d => {
    const recId = `opp_dept_${d.department}`
    if (!dismissedRecommendationIds.has(recId)) {
      opportunities.push({
        id: recId,
        category: 'OPPORTUNITY',
        priority: 'MEDIUM',
        confidence: 80,
        title: `Department Bottleneck: ${d.department}`,
        reason: `${d.department} has ${d.pendingCount} active complaints with ${d.slaComplianceRate}% SLA compliance rate.`,
        recommendedAction: `Rebalance workload by assigning secondary coordinators to ${d.department}.`,
        department: d.department,
        actions: ['Assign', 'View Department', 'Dismiss']
      })
    }
  })

  // If opportunities is empty, provide a general campus optimization
  if (opportunities.length === 0) {
    const recId = 'opp_campus_general_perf'
    if (!dismissedRecommendationIds.has(recId)) {
      opportunities.push({
        id: recId,
        category: 'OPPORTUNITY',
        priority: 'LOW',
        confidence: 78,
        title: 'Optimize Preventive Service Interval',
        reason: 'Department SLA compliance is holding strong across primary academic wings.',
        recommendedAction: 'Schedule bi-monthly facility maintenance before semester examinations.',
        actions: ['Review Pattern', 'Dismiss']
      })
    }
  }

  return {
    metrics: {
      highSlaRiskComplaints: highSlaRiskCount,
      recurringIssuesCount: recurringCount,
      highRiskLocationsCount: highRiskLocations,
      criticalHealthCount,
      averageComplaintHealth: avgHealth,
      mostFrequentIssue: mostFrequentPattern,
      mostProblematicLocation: hotspots[0]?.location || 'Campus Facility',
      totalComplaintsCount,
      resolvedComplaintsCount: resolvedCount,
      activeComplaintsCount: activeCount
    },
    overallCampusHealth: {
      score: avgHealth,
      status: avgHealth >= 80 ? 'Healthy' : avgHealth >= 60 ? 'Needs Attention' : 'At Risk',
      healthLabel: avgHealth >= 80 ? 'Healthy' : avgHealth >= 60 ? 'Needs Attention' : 'At Risk',
      reason: `Operational summary: ${totalComplaintsCount} grievances logged, ${resolvedCount} resolved, ${activeCount} active. SLA compliance benchmark: ${Math.round((resolvedCount / Math.max(1, totalComplaintsCount)) * 100)}%.`,
      breakdown: {
        slaComplianceRate: Math.round(((resolvedCount) / Math.max(1, totalComplaintsCount)) * 100),
        activeWorkload: activeCount,
        highRiskCount: highSlaRiskCount,
        recurringCount
      }
    },
    hotspots: hotspots.slice(0, 10),
    recurringIssues: recurringIssueItems.slice(0, 10),
    highRiskComplaints: highRiskComplaints.slice(0, 10),
    resolvedHistoricalSla: resolvedHistoricalSla.slice(0, 8),
    departmentPerformanceTrends,
    topRootCauses,
    resolutionPredictionBenchmarks,
    recommendedActions,
    aiRecommendations: {
      urgentActions,
      patternAlerts,
      opportunities
    }
  }
}

module.exports = {
  retrieveComplaintRAGContext,
  analyzeRootCause,
  predictSLABreach,
  predictResolutionTimeAndPath,
  evaluateSmartEscalation,
  detectRecurringIssue,
  detectIssueHotspots,
  calculateComplaintHealthScore,
  analyzeComplaintIntelligence,
  checkAndSendIntelligenceNotifications,
  getCampusIntelligenceSummary,
  dismissRecommendation
}
