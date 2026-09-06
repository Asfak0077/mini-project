const mongoose = require('mongoose')

const complaintAIAnalysisSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true
    },
    complaintTicketId: {
      type: String,
      index: true,
      default: ''
    },
    // 1. Root Cause Analysis
    rootCauseAnalysis: {
      summary: { type: String, default: '' },
      confidence: { type: Number, default: 75, min: 0, max: 100 },
      confidenceLevel: {
        type: String,
        enum: ['High Confidence', 'Medium Confidence', 'Low Confidence'],
        default: 'Medium Confidence'
      },
      dataSourceNote: {
        type: String,
        default: 'Analysis based on current complaint indicators.'
      },
      possibleRootCauses: [
        {
          cause: { type: String, required: true },
          confidence: { type: Number, required: true, min: 0, max: 100 }
        }
      ],
      impactLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
      },
      recommendedDepartment: { type: String, default: 'General' },
      recommendedActions: [{ type: String }],
      disclaimer: {
        type: String,
        default: 'AI Recommendation & Confidence Estimate — Not a confirmed fact'
      }
    },
    // 2. SLA Breach Prediction / Final SLA Analysis
    slaPrediction: {
      isResolved: { type: Boolean, default: false },
      finalOutcome: { type: String, default: '' },
      actualResolutionHours: { type: Number, default: null },
      targetSlaHours: { type: Number, default: 48 },
      hoursRemaining: { type: Number, default: 0 },
      hoursElapsed: { type: Number, default: 0 },
      riskLevel: {
        type: String,
        enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'COMPLETED'],
        default: 'LOW'
      },
      breachProbability: { type: Number, min: 0, max: 100, default: 0 },
      confidence: { type: Number, default: 80, min: 0, max: 100 },
      confidenceLevel: {
        type: String,
        enum: ['High Confidence', 'Medium Confidence', 'Low Confidence'],
        default: 'Medium Confidence'
      },
      timeRemaining: { type: String, default: 'Within SLA' },
      predictedResolutionTime: { type: String, default: 'Estimated 24 hours' },
      factors: [{ type: String }],
      reason: [{ type: String }],
      recommendedAction: { type: String, default: 'Monitor resolution progress' }
    },
    // 3. Recurring Issue Detection
    recurringIssue: {
      isRecurring: { type: Boolean, default: false },
      recurrenceCount: { type: Number, default: 1 },
      timePeriod: { type: String, default: '30 days' },
      affectedLocation: { type: String, default: '' },
      issuePattern: { type: String, default: '' },
      severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low'
      },
      recommendation: { type: String, default: 'Regular maintenance procedure.' },
      relatedComplaintIds: [{ type: String }]
    },
    // 4. Complaint Health Score
    healthScore: {
      score: { type: Number, min: 0, max: 100, default: 85 },
      status: {
        type: String,
        enum: ['Excellent', 'Healthy', 'Needs Attention', 'At Risk', 'Critical'],
        default: 'Healthy'
      },
      healthLabel: { type: String, default: 'Healthy' },
      reason: { type: String, default: 'Complaint is progressing under standard SLA.' },
      factors: {
        slaRisk: { type: String, default: 'Low' },
        recentUpdates: { type: String, default: 'Good' },
        impact: { type: String, default: 'Normal' },
        recurringRisk: { type: String, default: 'Low' }
      },
      breakdown: {
        slaCompliance: { type: Number, default: 30 },
        statusProgress: { type: Number, default: 20 },
        updateFrequency: { type: Number, default: 15 },
        assignmentStatus: { type: Number, default: 10 },
        prioritySeverity: { type: Number, default: 10 },
        recurrence: { type: Number, default: 10 },
        feedback: { type: Number, default: 5 }
      },
      recommendedAction: { type: String, default: 'Monitor department progress' }
    },
    // 5. Analysis History Snapshots
    analysisHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        healthScore: { type: Number },
        slaRiskLevel: { type: String },
        reason: { type: String }
      }
    ],
    // 6. AI Resolution Prediction (Agent H)
    resolutionPrediction: {
      isResolved: { type: Boolean, default: false },
      estimatedTimeframe: { type: String, default: '1–2 working days' },
      estimatedHours: { type: Number, default: 24 },
      confidence: { type: Number, default: 74 },
      confidenceLevel: { type: String, default: 'Medium Confidence' },
      resolutionPath: [{ type: String }],
      currentStage: { type: String, default: 'Intake' },
      responsibleDepartment: { type: String, default: 'Maintenance' },
      probabilityOfEscalation: { type: Number, default: 20 },
      probabilityOfSLABreach: { type: Number, default: 20 },
      outcome: { type: String, default: '' },
      actualResolutionHours: { type: Number, default: null },
      historicalBasis: { type: String, default: 'Prediction based on similar historical cases.' },
      disclaimer: { type: String, default: 'AI prediction based on similar historical cases — not a confirmed fact.' }
    },
    // 7. Smart Escalation Evaluation (Agent 9)
    smartEscalation: {
      shouldEscalate: { type: Boolean, default: false },
      priority: { type: String, default: 'HIGH' },
      confidence: { type: Number, default: 85 },
      reason: { type: String, default: '' },
      contributingFactors: [{ type: String }],
      recommendedAction: { type: String, default: '' }
    },
    analysisVersion: { type: Number, default: 3 },
    analysisStatus: {
      type: String,
      enum: ['pending', 'ready', 'failed'],
      default: 'ready'
    },
    generatedAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

complaintAIAnalysisSchema.index({ complaintId: 1, generatedAt: -1 })
complaintAIAnalysisSchema.index({ 'slaPrediction.riskLevel': 1 })
complaintAIAnalysisSchema.index({ 'healthScore.score': 1 })
complaintAIAnalysisSchema.index({ 'recurringIssue.isRecurring': 1 })

module.exports = mongoose.model('ComplaintAIAnalysis', complaintAIAnalysisSchema)
