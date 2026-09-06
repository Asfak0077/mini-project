import apiClient from './apiClient'

export type ConversationState =
  | 'IDLE'
  | 'COMPLAINT_COLLECTION'
  | 'WAITING_FOR_LOCATION'
  | 'WAITING_FOR_CATEGORY'
  | 'COMPLAINT_PREVIEW'
  | 'FEEDBACK_SELECTION'
  | 'FEEDBACK_COLLECTION'
  | 'FEEDBACK_PREVIEW'
  | 'STATUS_LOOKUP'
  | 'HISTORY_LOOKUP'
  | 'GENERAL_QUESTION'

export type ChatIntent =
  | 'CREATE_COMPLAINT'
  | 'PROVIDE_COMPLAINT_DETAILS'
  | 'CHECK_COMPLAINT_STATUS'
  | 'SHOW_PENDING_COMPLAINTS'
  | 'SHOW_RESOLVED_COMPLAINTS'
  | 'SHOW_COMPLAINT_HISTORY'
  | 'GIVE_FEEDBACK'
  | 'EDIT_FEEDBACK'
  | 'SUBMIT_FEEDBACK'
  | 'CANCEL_ACTION'
  | 'GENERAL_QUESTION'
  | 'GREETING'
  | 'LOGIN_HELP'

export interface StructuredComplaint {
  title: string
  description: string
  category: string
  department: string
  location?: string
  priority: 'low' | 'medium' | 'high' | 'Urgent'
  isComplete?: boolean
  missingFields?: string[]
  suggestedQuestion?: string
}

export interface StructuredFeedback {
  complaintId: string
  complaintTitle: string
  department?: string
  teacherId?: string
  teacherName?: string
  sentiment: 'Positive' | 'Neutral' | 'Mixed' | 'Negative'
  resolutionQuality: string
  responseTime: string
  communication: string
  suggestedRating: number
  topics: string[]
  summary: string
  suggestedFeedback: string
  originalComment?: string
  suggestedFollowUp?: string
}

export interface DuplicateMatch {
  id?: string
  complaintId: string
  title: string
  description?: string
  category: string
  department?: string
  location?: string
  status: string
  priority?: string
  createdAt?: string
  similarityScore: number
  duplicateType?: 'NO_DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'HIGH_CONFIDENCE_DUPLICATE'
  affectedCount?: number
  affectedUsers?: Array<{ studentId: string; studentName?: string; studentEmail?: string }>
  breakdown?: {
    semantic: number
    keyword: number
    location: number
    category: number
  }
}

export interface ComplaintQueryResult {
  id?: string
  complaintId: string
  title: string
  category: string
  department?: string
  status: string
  priority?: string
  assignedTeacherName?: string
  studentName?: string
  createdAt?: string
  resolutionNotes?: string
}

export interface EligibleResolvedComplaint {
  id?: string
  complaintId: string
  title: string
  category: string
  department: string
  assignedTeacherId: string
  assignedTeacherName: string
  resolutionNotes?: string
  hasFeedback: boolean
}

export interface RAGSource {
  title: string
  category: string
}

export type MessageType =
  | 'TEXT_MESSAGE'
  | 'COMPLAINT_QUESTION'
  | 'COMPLAINT_PREVIEW'
  | 'COMPLAINT_LIST'
  | 'STATUS_CARD'
  | 'FEEDBACK_SELECTION'
  | 'FEEDBACK_ANALYSIS'
  | 'ERROR_MESSAGE'
  | 'SUCCESS_MESSAGE'
  | 'RAG_ANSWER'
  | 'USER_TEXT'
  | 'AI_TEXT'
  | 'COMPLAINT_CARD'
  | 'FEEDBACK_SELECTOR'
  | 'SYSTEM'
  | 'SUCCESS'

export interface ChatHistoryItem {
  sender: 'user' | 'bot'
  text: string
}

export interface ChatMessage {
  id: string
  messageType?: MessageType
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  quickActions?: string[]
  structuredComplaint?: StructuredComplaint | null
  structuredFeedback?: StructuredFeedback | null
  duplicateMatches?: DuplicateMatch[] | null
  queryResults?: ComplaintQueryResult[] | null
  eligibleComplaints?: EligibleResolvedComplaint[] | null
  ragSources?: RAGSource[] | null
  widgetData?: any
  lang?: string
  isUrgent?: boolean
  isDraftCreating?: boolean
  spokenText?: string
}

export interface ChatResponse {
  sessionId: string
  state?: ConversationState
  intent?: ChatIntent
  text: string
  messageType?: MessageType
  quickActions?: string[]
  structuredComplaint?: StructuredComplaint | null
  structuredFeedback?: StructuredFeedback | null
  complaintDraft?: StructuredComplaint | null
  feedbackDraft?: StructuredFeedback | null
  duplicateMatches?: DuplicateMatch[] | null
  queryResults?: ComplaintQueryResult[] | null
  eligibleComplaints?: EligibleResolvedComplaint[] | null
  ragSources?: RAGSource[] | null
  widgetData?: any
  isUrgent?: boolean
  spokenText?: string
}

export interface SendMessageParams {
  message: string
  sessionId?: string
  conversationState?: ConversationState
  complaintDraft?: StructuredComplaint | null
  feedbackDraft?: StructuredFeedback | null
  history?: ChatHistoryItem[]
  actionType?: string | null
  requestId?: string
  previousAssistantMessage?: string
  isVoiceMode?: boolean
}

export const sendChatMessage = async (
  params: SendMessageParams | string,
  sessionId?: string,
  _userId?: string,
  _userRole?: string,
  _lang: string = 'en',
  _isUrgent: boolean = false,
  _history: ChatHistoryItem[] = []
): Promise<ChatResponse> => {
  let payload: any

  if (typeof params === 'string') {
    payload = {
      message: params,
      sessionId,
      history: _history
    }
  } else {
    payload = params
  }

  const { data } = await apiClient.post('/chatbot/message', payload)
  return data
}

export const createComplaintFromChat = async (complaintData: {
  title: string
  category: string
  department: string
  description: string
  priority: string
  location?: string
  duplicateDetection?: any
  duplicateDecision?: string
}): Promise<{ success: boolean; message: string; complaint: any }> => {
  const { data } = await apiClient.post('/chatbot/create-complaint', complaintData)
  return data
}

export const joinComplaintFromChat = async (complaintId: string): Promise<{
  success: boolean
  message?: string
  alreadyJoined?: boolean
  affectedCount?: number
  complaintId?: string
  title?: string
  status?: string
  priority?: string
}> => {
  const { data } = await apiClient.post('/chatbot/join-complaint', { complaintId })
  return data
}

export const submitFeedbackFromChat = async (feedbackData: {
  complaintId: string
  rating: number
  comment: string
  category?: string
  aiAnalysis?: any
}): Promise<{ success: boolean; message: string; feedback: any }> => {
  const { data } = await apiClient.post('/chatbot/submit-feedback', feedbackData)
  return data
}

export const fetchEligibleResolvedComplaints = async (): Promise<{ complaints: EligibleResolvedComplaint[] }> => {
  const { data } = await apiClient.get('/chatbot/eligible-resolved-complaints')
  return data
}

export const enhanceFeedbackText = async (
  text: string,
  mode: 'improve' | 'detailed' | 'short' | 'professional' = 'improve'
): Promise<string> => {
  const { data } = await apiClient.post('/chatbot/enhance-text', { text, mode })
  return data.enhanced
}

export const analyzeFeedbackText = async (text: string): Promise<any> => {
  const { data } = await apiClient.post('/chatbot/analyze-feedback', { text })
  return data.analysis
}

export const fetchUserContext = async (userId: string, userRole: string): Promise<any> => {
  const { data } = await apiClient.post('/chatbot/user-context', { userId, userRole })
  return data
}

export const generateBio = async (name: string, role: string, department: string): Promise<string> => {
  const { data } = await apiClient.post('/chatbot/generate-bio', { name, role, department })
  return data.bio
}
