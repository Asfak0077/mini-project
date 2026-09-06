/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Workflow & Orchestrator Types
 * Defines persistent Active Workflows, Expected Inputs, Slot-Filling Data, and Agent Responses.
 */

export type WorkflowType =
  | 'CREATE_COMPLAINT'
  | 'SUBMIT_FEEDBACK'
  | 'CHECK_STATUS'
  | 'SEARCH_COMPLAINTS'
  | 'NAVIGATION'
  | 'GENERAL'

export type WorkflowStatus =
  | 'IDLE'
  | 'COLLECTING_INFORMATION'
  | 'AWAITING_CONFIRMATION'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAUSED'

export type ExpectedInputType =
  | 'DESCRIPTION'
  | 'LOCATION'
  | 'BUILDING'
  | 'ROOM'
  | 'CATEGORY'
  | 'PRIORITY'
  | 'IMPACT'
  | 'RATING'
  | 'FEEDBACK_TEXT'
  | 'CONFIRMATION'
  | 'COMPLAINT_SELECTION'
  | 'GENERAL'

export interface ComplaintDraftData {
  title: string | null
  description: string | null
  category: string | null
  location: string | null
  priority: string | null
  room?: string | null
  building?: string | null
  impact?: string | null
  department?: string | null
  isComplete?: boolean
}

export interface FeedbackDraftData {
  complaintId: string | null
  complaintTitle?: string | null
  rating: number | null
  feedbackText: string | null
  resolutionQuality?: string | null
  responseTime?: string | null
  communication?: string | null
}

export interface ActiveWorkflow {
  id: string
  type: WorkflowType
  status: WorkflowStatus
  currentStep: string
  expectedInput: ExpectedInputType
  collectedData: Record<string, any>
  missingFields: string[]
  lastQuestion: string
  conversationContext: Array<{ role: 'user' | 'agent'; text: string; timestamp: number }>
  startedAt: number
  updatedAt: number
}

export interface AgentResponse {
  workflow: WorkflowType | null
  workflowStatus: WorkflowStatus
  currentStep: string | null
  expectedInput: ExpectedInputType | null
  extractedData: Record<string, any>
  missingFields: string[]
  screenResponse: string
  voiceResponse: string
  shouldListenAgain: boolean
  requiresConfirmation: boolean
  action?: {
    type: 'CREATE_COMPLAINT' | 'SUBMIT_FEEDBACK' | 'JOIN_COMPLAINT' | 'NAVIGATE' | 'VIEW_COMPLAINT' | 'NONE'
    payload?: any
  }
  complaintDraft?: ComplaintDraftData | null
  feedbackDraft?: FeedbackDraftData | null
  navigationTarget?: string
  quickActions?: string[]
}

export interface AgentSessionMemory {
  voiceSessionId: string
  activeWorkflow: ActiveWorkflow | null
  pausedWorkflow: ActiveWorkflow | null
  currentComplaintDraft: ComplaintDraftData | null
  currentFeedbackDraft: FeedbackDraftData | null
  currentSelectedComplaint: any | null
  lastAgentQuestion: string
  lastExpectedInput: ExpectedInputType | null
  recentConversation: Array<{ role: 'user' | 'agent'; text: string; timestamp: number }>
  lastIntent: string | null
  pendingAction: any | null
}
