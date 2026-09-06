export type UserRole = 'student' | 'admin' | 'teacher'

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'Urgent'
export type ComplaintStatus = 'Submitted' | 'Assigned' | 'In Progress' | 'Resolved' | 'Escalated'

export interface Teacher {
  id: string
  name: string
  email: string
  department: string
  designation: string
  activeComplaints: number
  profilePicture?: string
  profileImage?: string
}

export interface Complaint {
  id: string
  complaintId?: string
  ticketNumber?: string
  title: string
  category: string
  department: string
  description: string
  phone?: string
  priority: ComplaintPriority
  status: ComplaintStatus
  createdAt: string
  updatedAt?: string
  studentName: string
  studentEmail: string
  studentId: string
  assignedTeacherId?: string
  assignedTeacherName?: string
  assignedTeacherDepartment?: string
  assignedDate?: string
  assignmentHistory?: Array<{
    teacherId: string
    teacherName: string
    department: string
    assignedDate: string
    removedDate: string
    assignedBy: string
  }>
  resolutionDate?: string
  adminRemarks?: string
  resolutionNotes?: string
  satisfactionRating?: number
  studentFeedback?: string
  location?: string
  attachments?: Array<{ filename: string; url?: string }>
}

export interface AnalyticsSummary {
  total: number
  pending: number
  inProgress: number
  resolved: number
  escalated: number
  averageResolutionHours: number
}

export interface AIResolutionPrediction {
  isResolved?: boolean
  expectedResolutionTime?: string
  estimatedTimeframe?: string
  estimatedHours?: number
  slaSuccessProbability?: number
  escalationRisk?: 'Low' | 'Medium' | 'High'
  suggestedPriority?: 'Low' | 'Medium' | 'High' | 'Critical'
  recommendedDepartment?: string
  responsibleDepartment?: string
  confidenceScore?: number
  confidence?: number
  confidenceLevel?: 'Low' | 'Medium' | 'High' | 'High Confidence' | 'Medium Confidence' | 'Low Confidence' | string
  aiExplanation?: string
  recommendedAction?: string
  dataSource?: 'historical' | 'general_patterns'
  historicalCount?: number
  avgHistoricalHours?: number | null
  resolutionPath?: string[]
  currentStage?: string
  probabilityOfEscalation?: number
  probabilityOfSLABreach?: number
  outcome?: string
  actualResolutionHours?: number | null
  historicalBasis?: string
  disclaimer?: string
}

// ── 1. AI Root Cause Analysis ──
export interface AIRootCauseItem {
  cause: string
  confidence: number
}

export interface AIRootCauseAnalysis {
  summary?: string
  analysisSummary?: string
  confidence?: number
  confidenceLevel?: 'High Confidence' | 'Medium Confidence' | 'Low Confidence'
  dataSourceNote?: string
  possibleRootCauses: AIRootCauseItem[]
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  recommendedDepartment: string
  recommendedActions: string[]
  disclaimer?: string
}

// ── 2. SLA Breach Prediction ──
export interface AISLAPrediction {
  isResolved?: boolean
  finalOutcome?: string
  actualResolutionHours?: number | null
  targetSlaHours?: number
  hoursRemaining?: number
  hoursElapsed?: number
  riskLevel: 'LOW' | 'MODERATE' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'COMPLETED'
  breachProbability: number
  confidence?: number
  confidenceLevel?: 'High Confidence' | 'Medium Confidence' | 'Low Confidence'
  timeRemaining: string
  predictedResolutionTime: string
  factors?: string[]
  reason: string[]
  recommendedAction: string
}

// ── 3. Recurring Issue Detection ──
export interface AIRecurringIssueAnalysis {
  isRecurring: boolean
  recurrenceCount: number
  timePeriod: string
  affectedLocation: string
  issuePattern: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  recommendation: string
  relatedComplaintIds?: string[]
}

// ── 4. Campus Issue Hotspot ──
export interface CampusHotspot {
  location: string
  complaintCount: number
  trend: 'Increasing' | 'Stable' | 'Decreasing'
  topIssues: string[]
  severity: 'Low' | 'Medium' | 'High'
  impactScore: number
}

// ── 5. Complaint Health Score ──
export interface AIComplaintHealthScore {
  score: number
  status: 'Excellent' | 'Healthy' | 'Needs Attention' | 'At Risk' | 'Critical'
  healthLabel?: 'Excellent' | 'Healthy' | 'Needs Attention' | 'At Risk' | 'Critical'
  reason?: string
  factors?: {
    slaRisk?: string
    recentUpdates?: string
    impact?: string
    recurringRisk?: string
  }
  breakdown?: {
    slaCompliance?: number
    statusProgress?: number
    updateFrequency?: number
    assignmentStatus?: number
    prioritySeverity?: number
    recurrence?: number
    feedback?: number
    baseScore?: number
    slaPenalty?: number
    delayPenalty?: number
    noUpdatePenalty?: number
    recurringPenalty?: number
    positiveBonuses?: number
  }
  recommendedAction?: string
}

// ── Analysis History Snapshot ──
export interface AIAnalysisHistorySnapshot {
  timestamp: string
  healthScore: number
  slaRiskLevel: string
  reason: string
}

// ── Agent 9: Smart Escalation ──
export interface AISmartEscalation {
  shouldEscalate: boolean
  priority?: string
  confidence?: number
  reason?: string
  contributingFactors?: string[]
  recommendedAction?: string
}

// ── Agent Recommendation Item ──
export interface AIRecommendationItem {
  id: string
  category: 'URGENT_ACTION' | 'PATTERN_ALERT' | 'OPPORTUNITY'
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
  title: string
  reason: string
  recommendedAction: string
  complaintId?: string
  ticketId?: string
  department?: string
  location?: string
  actions?: string[]
}

// ── Combined Complaint AI Intelligence ──
export interface ComplaintAIIntelligence {
  complaintId: string
  complaintTicketId?: string
  role?: 'student' | 'teacher' | 'admin'
  rootCauseAnalysis?: AIRootCauseAnalysis
  slaPrediction?: AISLAPrediction
  recurringIssue?: AIRecurringIssueAnalysis
  healthScore?: AIComplaintHealthScore
  resolutionPrediction?: AIResolutionPrediction
  smartEscalation?: AISmartEscalation
  analysisHistory?: AIAnalysisHistorySnapshot[]
  analysisVersion?: number
  analysisStatus?: 'ready' | 'pending' | 'failed'
  generatedAt?: string
  updatedAt?: string
}

// ── Admin Command Center Summary ──
export interface CampusIntelligenceSummary {
  metrics: {
    highSlaRiskComplaints: number
    recurringIssuesCount: number
    highRiskLocationsCount: number
    criticalHealthCount: number
    averageComplaintHealth: number
    mostFrequentIssue: string
    mostProblematicLocation: string
    totalComplaintsCount?: number
    resolvedComplaintsCount?: number
    activeComplaintsCount?: number
  }
  overallCampusHealth?: {
    score: number
    status: string
    healthLabel: string
    reason: string
    breakdown: {
      slaComplianceRate: number
      activeWorkload: number
      highRiskCount: number
      recurringCount: number
    }
  }
  hotspots: CampusHotspot[]
  recurringIssues: Array<{
    complaintId: string
    ticketId: string
    pattern: string
    location: string
    count: number
    recommendation: string
    severity: string
  }>
  highRiskComplaints: Array<{
    complaintId: string
    ticketId: string
    title: string
    category: string
    department: string
    status: string
    priority: string
    location?: string
    breachProbability: number
    riskLevel: string
    timeRemaining: string
    smartEscalation?: AISmartEscalation
  }>
  resolvedHistoricalSla?: Array<{
    complaintId: string
    ticketId: string
    title: string
    category: string
    department: string
    actualResolutionHours: number
    targetSlaHours: number
    outcome: string
    isWithinSla: boolean
  }>
  departmentPerformanceTrends?: Array<{
    department: string
    totalComplaints: number
    resolvedCount: number
    pendingCount: number
    avgResolutionHours: number
    slaComplianceRate: number
    healthScore: number
    trend: string
  }>
  topRootCauses?: Array<{
    cause: string
    category: string
    frequency: number
    confidence: number
  }>
  resolutionPredictionBenchmarks?: Array<{
    category: string
    typicalResolutionTime: string
    slaTargetHours: number
    path: string[]
    avgEscalationRate: number
  }>
  recommendedActions?: Array<{
    priority: string
    confidence: number
    title: string
    reason: string
    action: string
  }>
  aiRecommendations?: {
    urgentActions: AIRecommendationItem[]
    patternAlerts: AIRecommendationItem[]
    opportunities: AIRecommendationItem[]
  }
}

