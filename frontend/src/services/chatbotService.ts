import apiClient from './apiClient'

export interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  quickActions?: string[]
  widgetData?: any
  lang?: string
}

export interface ChatResponse {
  sessionId: string
  text: string
  quickActions?: string[]
  widgetData?: any
}

export const sendChatMessage = async (
  message: string,
  sessionId?: string,
  userId?: string,
  userRole?: string,
  lang: string = 'en',
  isUrgent: boolean = false
): Promise<ChatResponse> => {
  const { data } = await apiClient.post('/chatbot/message', {
    message,
    sessionId,
    userId,
    userRole,
    lang,
    isUrgent,
  })
  return data
}

export const enhanceFeedbackText = async (text: string): Promise<string> => {
  const { data } = await apiClient.post('/chatbot/enhance-text', { text })
  return data.enhanced
}

export const fetchUserContext = async (userId: string, userRole: string): Promise<any> => {
  const { data } = await apiClient.post('/chatbot/user-context', { userId, userRole })
  return data
}

export const generateBio = async (name: string, role: string, department: string): Promise<string> => {
  const { data } = await apiClient.post('/chatbot/generate-bio', { name, role, department })
  return data.bio
}
