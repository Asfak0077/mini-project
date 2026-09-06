import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Mic, MicOff, Bot,
  Maximize2, Minimize2, Sparkles,
  RefreshCw, RotateCcw, Copy, Check,
  AlertCircle, ChevronRight, Edit3, ArrowDown, Star, Lock, LogIn, MoreVertical,
  Headphones, Volume2, VolumeX, Radio, Square
} from 'lucide-react'

import {
  sendChatMessage,
  createComplaintFromChat,
  joinComplaintFromChat,
  submitFeedbackFromChat,
  fetchEligibleResolvedComplaints,
  ChatMessage,
  ConversationState,
  StructuredComplaint,
  StructuredFeedback,
  DuplicateMatch,
  EligibleResolvedComplaint,
  enhanceFeedbackText,
  ChatHistoryItem
} from '../../services/chatbotService'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { UserAvatar } from '../ui/Avatar'
import { ChatMessageContent } from './ChatMessageContent'
import { speechRecognitionService } from '../../services/voice/speechRecognitionService'
import { textToSpeechService } from '../../services/voice/textToSpeechService'
import { voiceConversationController } from '../../services/voice/voiceConversationController'
import { VoiceState, VoiceMode, PlaybackState, VoiceAgentSettings } from '../../services/voice/voiceTypes'
import { VoiceVisualizer } from './VoiceVisualizer'
import { VoiceConversationModal } from './VoiceConversationModal'
import { intentClassifier } from '../../services/ai/intentClassifier'
import { agentOrchestrator } from '../../services/voice/agentOrchestrator'

/* ─── Suggested Prompts for Empty Chat ─────────────────────────────────── */
const GUEST_SUGGESTED_PROMPTS = [
  {
    title: 'How to Submit a Complaint',
    desc: 'Learn how grievances are filed & routed',
    action: { type: 'SEND_TEXT' as const, text: 'How to Submit a Complaint' }
  },
  {
    title: 'How Complaint Tracking Works',
    desc: 'Understand ticket lifecycle and resolution',
    action: { type: 'SEND_TEXT' as const, text: 'How Complaint Tracking Works' }
  },
  {
    title: 'Feedback Information',
    desc: 'How service ratings & faculty reviews work',
    action: { type: 'SEND_TEXT' as const, text: 'Feedback Information' }
  },
  {
    title: 'Login Help',
    desc: 'How to sign in with student or faculty ID',
    action: { type: 'SEND_TEXT' as const, text: 'Login Help' }
  }
]

const AUTH_STUDENT_SUGGESTED_PROMPTS = [
  {
    title: 'Help Me Create a Complaint',
    desc: 'Describe an issue and AI will draft it',
    action: { type: 'OPEN_COMPLAINT_FLOW' as const }
  },
  {
    title: 'Show My Pending Complaints',
    desc: 'View all active unresolved tickets',
    action: { type: 'SHOW_PENDING_COMPLAINTS' as const }
  },
  {
    title: 'Check Complaint Status',
    desc: 'Look up progress on your submitted tickets',
    action: { type: 'SHOW_COMPLAINT_STATUS' as const }
  },
  {
    title: '⭐ Give Feedback',
    desc: 'Rate and evaluate resolved complaints',
    action: { type: 'OPEN_FEEDBACK_FLOW' as const }
  }
]

const FRUSTRATED_RE = /urgent|ignored|no response|not resolved|worst|still pending|nobody|please fix|so frustrated|very frustrated|help me now/i

/**
 * Generate a unique ID with random entropy
 */
const generateUniqueId = (prefix: string = 'msg') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export type ChatAction =
  | { type: 'OPEN_FEEDBACK_FLOW' }
  | { type: 'SELECT_FEEDBACK_COMPLAINT'; complaint: EligibleResolvedComplaint }
  | { type: 'EDIT_FEEDBACK'; feedback: StructuredFeedback }
  | { type: 'USE_AI_FEEDBACK'; feedback: StructuredFeedback }
  | { type: 'SUBMIT_FEEDBACK'; feedback: StructuredFeedback }
  | { type: 'CANCEL_FEEDBACK' }
  | { type: 'OPEN_COMPLAINT_FLOW' }
  | { type: 'CREATE_COMPLAINT'; draft: StructuredComplaint }
  | { type: 'CREATE_ANYWAY'; draft: StructuredComplaint }
  | { type: 'JOIN_EXISTING_COMPLAINT'; complaintId: string }
  | { type: 'VIEW_EXISTING_COMPLAINT'; complaintId: string }
  | { type: 'EDIT_COMPLAINT'; draft: StructuredComplaint }
  | { type: 'CANCEL_COMPLAINT' }
  | { type: 'SHOW_PENDING_COMPLAINTS' }
  | { type: 'SHOW_COMPLAINT_STATUS' }
  | { type: 'SHOW_CAMPUS_STATS' }
  | { type: 'SHOW_FEEDBACK_REPORT' }
  | { type: 'VIEW_COMPLAINT_HISTORY'; complaintId: string }
  | { type: 'SEND_TEXT'; text: string }

export const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [conversationState, setConversationState] = useState<ConversationState>('IDLE')
  const [complaintDraft, setComplaintDraft] = useState<StructuredComplaint | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState<StructuredFeedback | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [lastErrorPrompt, setLastErrorPrompt] = useState<string | null>(null)
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [isJoiningComplaint, setIsJoiningComplaint] = useState(false)
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null)

  // ─── Voice-First AI Agent State ────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE')
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('CONTINUOUS')
  const [playbackState, setPlaybackState] = useState<PlaybackState>('STOPPED')
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [latestUserTranscript, setLatestUserTranscript] = useState<string>('')
  const [latestAIText, setLatestAIText] = useState<string>('')
  const [voicePermissionError, setVoicePermissionError] = useState<string | null>(null)
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState<boolean>(false)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [voiceSettings, setVoiceSettings] = useState<VoiceAgentSettings>(voiceConversationController.getSettings())

  // Edit Complaint Modal State
  const [editingDraft, setEditingDraft] = useState<StructuredComplaint | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string
    category: string
    department: string
    location: string
    priority: 'low' | 'medium' | 'high' | 'Urgent'
    description: string
  }>({
    title: '',
    category: 'Infrastructure',
    department: 'CSE',
    location: '',
    priority: 'medium',
    description: ''
  })

  // Edit Feedback Modal State
  const [editingFeedback, setEditingFeedback] = useState<StructuredFeedback | null>(null)
  const [feedbackEditForm, setFeedbackEditForm] = useState<{
    complaintId: string
    complaintTitle: string
    rating: number
    comment: string
    category: string
  }>({
    complaintId: '',
    complaintTitle: '',
    rating: 5,
    comment: '',
    category: 'Resolution Satisfaction'
  })

  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.role)
  const isAuthenticated = Boolean(user && token)
  const navigate = useNavigate()

  // ─── REFS FOR PREVENTING DUPLICATION & RACE CONDITIONS ──────────────────────
  const processedMessageIdsRef = useRef<Set<string>>(new Set())
  const processedRequestIdsRef = useRef<Set<string>>(new Set())
  const processedAnalysisIdsRef = useRef<Set<string>>(new Set())
  const isRequestPendingRef = useRef<boolean>(false)
  const prevAuthUserIdRef = useRef<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isUserNearBottomRef = useRef<boolean>(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Helper to add a message once and deduplicate by ID
  const appendMessageSafely = useCallback((msg: ChatMessage) => {
    if (processedMessageIdsRef.current.has(msg.id)) {
      return
    }
    processedMessageIdsRef.current.add(msg.id)
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

  // Ref to always access latest handleSend function without stale closure
  const handleSendRef = useRef<(text: string, actionType?: string | null, isFromVoice?: boolean) => Promise<void>>()
  useEffect(() => {
    handleSendRef.current = handleSend
  })

  // ─── Synchronize Voice-First AI Services (STT, TTS, VAD, Barge-in) ────────
  useEffect(() => {
    // Register voice conversation controller callbacks
    voiceConversationController.registerCallbacks({
      onStateChange: (state) => {
        setVoiceState(state)
      },
      onTranscriptUpdate: (transcript, isFinal) => {
        setLatestUserTranscript(transcript)
        // Only set inputValue for non-auto-submit mode (legacy fallback)
        if (!voiceSettings.autoSubmitSpeech) {
          setInputValue(transcript)
        }
      },
      onUserMessageReady: async (transcript) => {
        // Voice-first: auto-send recognized speech to AI pipeline via latest handleSend ref
        const textToProcess = transcript.trim()
        if (textToProcess) {
          if (handleSendRef.current) {
            await handleSendRef.current(textToProcess, null, true)
          }
        }
      },
      onError: (err) => {
        setVoiceState('ERROR')
        if (err.isPermissionDenied) {
          setVoicePermissionError(err.message)
        }
      },
      onBargeIn: () => {
        // Barge-in occurred: AI was interrupted by user
        setPlaybackState('STOPPED')
        setSpeakingMsgId(null)
      },
      onAudioLevel: (level) => {
        setAudioLevel(level)
      },
      onSpeechStart: () => {
        // If AI is speaking and user starts talking → barge-in already handled by controller
      },
      onSpeechEnd: () => {
        // Silence detected after user speech — controller handles auto-send
      }
    })

    // TTS callbacks still needed for UI state sync
    textToSpeechService.onStart = (msgId) => {
      setPlaybackState('PLAYING')
      setSpeakingMsgId(msgId)
      setVoiceState('AI_SPEAKING')
    }

    textToSpeechService.onEnd = () => {
      setPlaybackState('STOPPED')
      setSpeakingMsgId(null)
      // State transition handled by voiceConversationController
    }

    textToSpeechService.onPause = () => {
      setPlaybackState('PAUSED')
    }

    textToSpeechService.onResume = () => {
      setPlaybackState('PLAYING')
      setVoiceState('AI_SPEAKING')
    }

    textToSpeechService.onError = () => {
      setPlaybackState('STOPPED')
      setSpeakingMsgId(null)
    }

    return () => {
      speechRecognitionService.stopListening()
      textToSpeechService.stop()
    }
  }, [isVoiceModalOpen, voiceMode, voiceSettings.autoSubmitSpeech, conversationState])

  // Authentication-Aware Chat State Lifecycle
  useEffect(() => {
    const currentUserId = isAuthenticated ? (user?.studentId || user?.teacherId || user?.email || (user as any)?._id || 'AUTH_USER') : 'GUEST'

    if (prevAuthUserIdRef.current !== currentUserId) {
      prevAuthUserIdRef.current = currentUserId
      processedMessageIdsRef.current.clear()
      processedRequestIdsRef.current.clear()
      processedAnalysisIdsRef.current.clear()
      setSessionId(undefined)

      if (isAuthenticated && user) {
        // Authenticated Welcome
        const firstName = user?.name?.split(' ')[0] || 'there'
        let welcomeText = `Hi ${firstName}! I'm your **CampusResolve AI Assistant**.\nI can help you create complaints, submit feedback on resolved issues, check statuses, and search history.`
        let qa = ['Help Me Create a Complaint', 'Show My Pending Complaints', 'Check Complaint Status', 'Show My Complaint History', '⭐ Give Feedback']

        if (role === 'admin') {
          welcomeText = `Hi **Admin**! 🛡️ Real-time campus infrastructure data is connected. Ask for statistics, departmental workloads, or feedback analytics.`
          qa = ['Campus Statistics', 'Feedback Report', 'Escalations']
        } else if (role === 'teacher') {
          welcomeText = `Hi **Faculty**! 🎓 I can help manage your assigned complaints, generate resolution templates, or review student feedback.`
          qa = ['View Assigned Complaints', 'Resolution Templates', 'Student Feedback Analytics']
        }

        setMessages([
          {
            id: `welcome-${Date.now()}`,
            messageType: 'AI_TEXT',
            text: welcomeText,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: qa
          }
        ])
      } else {
        // Guest Welcome
        setMessages([
          {
            id: `guest-welcome-${Date.now()}`,
            messageType: 'AI_TEXT',
            text: `Welcome to CampusResolve! 🏛️ I'm your **Public Campus Assistant**.\n\nI can answer general questions about filing grievances, resolution workflows, feedback policies, and login support.\n\n🔒 *Please sign in to access your personal complaints, status tracking, and feedback history.*`,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: ['How to Submit a Complaint', 'How Complaint Tracking Works', 'Feedback Information', 'Login Help']
          }
        ])
      }
    }
  }, [isAuthenticated, user, role])

  // Scroll Container Listener
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const distanceToBottom = scrollHeight - scrollTop - clientHeight
    const isNear = distanceToBottom < 100
    isUserNearBottomRef.current = isNear
  }


  // Scroll to bottom smoothly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      })
    }
  }

  // Auto-scroll when messages update if user is near bottom
  useEffect(() => {
    if (isUserNearBottomRef.current) {
      scrollToBottom('smooth')
    }
  }, [messages, isTyping])

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  // ─── SEND MESSAGE HANDLER (DEDUPLICATED & THREAD-SAFE) ──────────────────────
  const handleSend = async (textToSend: string, actionType?: string | null, isFromVoice?: boolean) => {
    const prompt = textToSend.trim()
    if (!prompt && !actionType) return

    // ── Voice Control Direct Commands ──
    if (isFromVoice || isVoiceModalOpen) {
      if (/^(stop speaking|be quiet|shut up)$/i.test(prompt)) {
        textToSpeechService.stop()
        return
      }
      if (/^(mute)$/i.test(prompt)) {
        setIsVoiceMuted(true)
        textToSpeechService.mute()
        return
      }
      if (/^(unmute)$/i.test(prompt)) {
        setIsVoiceMuted(false)
        textToSpeechService.unmute()
        return
      }
      if (/speak slower/i.test(prompt)) {
        handleUpdateVoiceSettings({ speechSpeed: 'slow' })
        textToSpeechService.speak('I will speak slower now.', null)
        return
      }
      if (/speak faster/i.test(prompt)) {
        handleUpdateVoiceSettings({ speechSpeed: 'fast' })
        textToSpeechService.speak('I will speak faster now.', null)
        return
      }
    }

    // ── Central Agent Orchestrator: Active Workflow & Multi-Turn Agents ──
    const activeWf = agentOrchestrator.getActiveWorkflow()
    const isComplaintStart = /^(create a complaint|create complaint|new complaint|report an issue|file a complaint|register complaint|lodge a complaint|i want to report a problem|help me create a complaint)$/i.test(prompt)
    const isDirectIssue = /\b(is not working|broken|leaking|damaged|flickering|not cooling|dirty|jammed)\b/i.test(prompt) && !/status|history|search|pending/i.test(prompt)
    const isFeedbackStart = /^(give feedback|leave feedback|rate complaint|feedback|submit feedback|rate resolution)$/i.test(prompt)
    const isResumeOrCancel = /^(cancel|stop|nevermind|pause|continue|resume|continue my complaint)$/i.test(prompt)

    if (activeWf || isComplaintStart || isDirectIssue || isFeedbackStart || isResumeOrCancel) {
      if (prompt && !actionType) {
        const userMsgId = generateUniqueId('u')
        appendMessageSafely({
          id: userMsgId,
          messageType: 'USER_TEXT',
          text: prompt,
          sender: 'user',
          timestamp: new Date()
        })
      }
      setInputValue('')
      setIsTyping(true)

      try {
        const agentRes = await agentOrchestrator.processMessage(prompt, async (act) => {
          if (act.type === 'CREATE_COMPLAINT') {
            const draft = act.payload
            const res = await createComplaintFromChat({
              title: draft.title || `${draft.category || 'Infrastructure'} Issue`,
              category: draft.category || 'Infrastructure',
              department: draft.department || user?.department || 'CSE',
              location: draft.location || '',
              priority: draft.priority || 'medium',
              description: draft.description || ''
            })
            setComplaintDraft(null)
            setConversationState('IDLE')
            return { complaintId: res.complaint?.complaintId || 'Registered' }
          }
          if (act.type === 'SUBMIT_FEEDBACK') {
            const fb = act.payload
            await submitFeedbackFromChat({
              complaintId: fb.complaintId,
              rating: fb.rating || 5,
              comment: fb.feedbackText || '',
              category: 'Resolution Satisfaction'
            })
            setFeedbackDraft(null)
            setConversationState('IDLE')
            return { success: true }
          }
          if (act.type === 'NAVIGATE') {
            navigate(act.payload.path)
            return { success: true }
          }
          if (act.type === 'VIEW_COMPLAINT') {
            if (act.payload.viewPending) {
              handleQuickActionClick('Show my pending complaints')
            } else if (act.payload.complaintId) {
              handleQuickActionClick(`Status of ${act.payload.complaintId}`)
            }
            return { success: true }
          }
        })

        if (agentRes.screenResponse) {
          const botMsgId = generateUniqueId('b')
          appendMessageSafely({
            id: botMsgId,
            messageType: agentRes.requiresConfirmation ? 'COMPLAINT_PREVIEW' : 'AI_TEXT',
            text: agentRes.screenResponse,
            spokenText: agentRes.voiceResponse,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: agentRes.quickActions,
            structuredComplaint: agentRes.complaintDraft as any
          })

          if (agentRes.complaintDraft) {
            setComplaintDraft(agentRes.complaintDraft as any)
          }
          if (agentRes.navigationTarget) {
            navigate(agentRes.navigationTarget)
          }

          setLatestAIText(agentRes.voiceResponse)
          if (isFromVoice || isVoiceModalOpen || isAutoSpeakEnabled) {
            voiceConversationController.speakAIResponse(agentRes.voiceResponse, botMsgId)
          }
          return
        }
      } catch (err) {
        console.error('[AgentOrchestrator] Turn processing error:', err)
      } finally {
        setIsTyping(false)
      }
    }

    // Prevent duplicate simultaneous requests
    if (isRequestPendingRef.current) {
      return
    }

    isRequestPendingRef.current = true
    setIsTyping(true)
    setLastErrorPrompt(null)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Add user message with unique ID immediately (only for text messages, not structured actions)
    if (prompt && !actionType) {
      const userMsgId = generateUniqueId('u')
      const userMsg: ChatMessage = {
        id: userMsgId,
        messageType: 'USER_TEXT',
        text: prompt,
        sender: 'user',
        timestamp: new Date()
      }
      appendMessageSafely(userMsg)
    }
    setInputValue('')

    // Get previous assistant message for context
    const lastBotMsg = [...messages].reverse().find((m) => m.sender === 'bot')
    const previousAssistantMessage = lastBotMsg?.text || ''

    // Send API request with unique request ID
    const requestId = generateUniqueId('req')
    const historyPayload: ChatHistoryItem[] = messages.slice(-8).map((m) => ({
      sender: m.sender,
      text: m.text
    }))

    try {
      const res = await sendChatMessage({
        message: prompt || '',
        sessionId,
        conversationState,
        complaintDraft,
        feedbackDraft,
        history: historyPayload,
        actionType: actionType || null,
        requestId,
        previousAssistantMessage,
        isVoiceMode: Boolean(isFromVoice || isVoiceModalOpen || isAutoSpeakEnabled)
      })

      // Verify request was not already processed
      if (processedRequestIdsRef.current.has(requestId)) {
        return
      }
      processedRequestIdsRef.current.add(requestId)

      if (res?.sessionId) setSessionId(res.sessionId)
      if (res?.state) setConversationState(res.state)
      if (res?.complaintDraft !== undefined) setComplaintDraft(res.complaintDraft)
      if (res?.feedbackDraft !== undefined) setFeedbackDraft(res.feedbackDraft)
      if (res?.structuredComplaint) setComplaintDraft(res.structuredComplaint)

      const botMsgId = generateUniqueId('b')
      const spokenTextToSpeak = res?.spokenText || textToSpeechService.cleanTextForSpeech(res?.text || '')
      setLatestAIText(spokenTextToSpeak)

      const botMsg: ChatMessage = {
        id: botMsgId,
        messageType: res?.messageType || (res?.structuredFeedback ? 'FEEDBACK_ANALYSIS' : (res?.structuredComplaint ? 'COMPLAINT_PREVIEW' : 'AI_TEXT')),
        text: res?.text || "I'm here to assist you.",
        spokenText: spokenTextToSpeak,
        sender: 'bot',
        timestamp: new Date(),
        quickActions: res?.quickActions,
        structuredComplaint: res?.structuredComplaint,
        structuredFeedback: res?.structuredFeedback,
        duplicateMatches: res?.duplicateMatches,
        queryResults: res?.queryResults,
        eligibleComplaints: res?.eligibleComplaints,
        ragSources: res?.ragSources,
        widgetData: res?.widgetData
      }

      if (res?.queryResults && Array.isArray(res.queryResults)) {
        agentOrchestrator.setRecentResults(
          res.queryResults.map((c: any) => ({
            id: c.complaintId || c._id,
            title: c.title || c.category || 'Complaint'
          }))
        )
      }

      appendMessageSafely(botMsg)

      // Spoken voice response if voice mode or mic input was used
      if (isFromVoice || isVoiceModalOpen || isAutoSpeakEnabled) {
        textToSpeechService.speak(spokenTextToSpeak, botMsgId)
      }
    } catch {
      setLastErrorPrompt(prompt)
      const errorMsgId = generateUniqueId('err')
      const errorMsg: ChatMessage = {
        id: errorMsgId,
        messageType: 'ERROR_MESSAGE',
        text: "Sorry, I couldn't process that request. Please try again.",
        spokenText: "Sorry, I couldn't process that request. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      }
      appendMessageSafely(errorMsg)
      if (isFromVoice || isVoiceModalOpen || isAutoSpeakEnabled) {
        textToSpeechService.speak("Sorry, I couldn't process that request. Please try again.", errorMsgId)
      }
    } finally {
      setIsTyping(false)
      isRequestPendingRef.current = false
    }
  }

  // ─── DEDICATED ACTION HANDLER (SEPARATED FROM NORMAL CHAT) ──────────────────
  const handleAction = async (action: ChatAction) => {
    // ── GUEST MODE PROTECTION CHECK ──
    const protectedActions = ['OPEN_FEEDBACK_FLOW', 'SELECT_FEEDBACK_COMPLAINT', 'OPEN_COMPLAINT_FLOW', 'CREATE_COMPLAINT', 'SHOW_PENDING_COMPLAINTS', 'SHOW_COMPLAINT_STATUS', 'VIEW_COMPLAINT_HISTORY']
    if (!isAuthenticated && protectedActions.includes(action.type)) {
      const botMsg: ChatMessage = {
        id: generateUniqueId('b-auth-req'),
        messageType: 'AI_TEXT',
        text: "Please sign in to securely access your personal complaints, complaint status, and feedback history.",
        sender: 'bot',
        timestamp: new Date(),
        quickActions: ['Sign In to Continue', 'How to Submit a Complaint', 'How Complaint Tracking Works', 'Feedback Information', 'Login Help'],
        widgetData: {
          type: 'AUTH_REQUIRED',
          ctaText: 'Sign In to Continue',
          target: '/login'
        }
      }
      appendMessageSafely(botMsg)
      return
    }

    switch (action.type) {
      case 'OPEN_FEEDBACK_FLOW': {
        setIsTyping(true)
        try {
          const res = await fetchEligibleResolvedComplaints()
          const botMsgId = generateUniqueId('b-elig')
          if (res.complaints && res.complaints.length > 0) {
            const unreviewed = res.complaints.filter(c => !c.hasFeedback)
            const listToShow = unreviewed.length > 0 ? unreviewed : res.complaints

            const botMsg: ChatMessage = {
              id: botMsgId,
              messageType: 'FEEDBACK_SELECTOR',
              text: `Here are your resolved complaints eligible for feedback. Select an issue to evaluate:`,
              sender: 'bot',
              timestamp: new Date(),
              eligibleComplaints: listToShow,
              quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints']
            }
            appendMessageSafely(botMsg)
          } else {
            const botMsg: ChatMessage = {
              id: botMsgId,
              messageType: 'AI_TEXT',
              text: `You currently have no resolved complaints needing feedback. Feedback can only be submitted after an issue has been resolved by faculty.`,
              sender: 'bot',
              timestamp: new Date(),
              quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints']
            }
            appendMessageSafely(botMsg)
          }
        } catch {
          // fallback
        } finally {
          setIsTyping(false)
        }
        break
      }


      case 'SELECT_FEEDBACK_COMPLAINT': {
        const { complaint } = action
        const analysisKey = `analysis-${complaint.complaintId}`
        if (processedAnalysisIdsRef.current.has(analysisKey)) {
          return
        }
        processedAnalysisIdsRef.current.add(analysisKey)

        setIsTyping(true)
        try {
          const feedbackPrompt = `I want to give feedback for complaint ${complaint.complaintId}: "${complaint.title}" in ${complaint.department} department.`
          const userId = user?.studentId || user?.teacherId || user?.email || user?.id || ''

          const res = await sendChatMessage(
            feedbackPrompt,
            sessionId,
            userId,
            role ?? 'student',
            'en',
            false,
            []
          )

          if (res?.sessionId) setSessionId(res.sessionId)

          const analysisCardMsg: ChatMessage = {
            id: generateUniqueId('b-fb-card'),
            messageType: 'FEEDBACK_ANALYSIS',
            text: res?.text || `### Feedback Summary\nHere is your feedback analysis for **${complaint.complaintId}** (*${complaint.title}*):`,
            sender: 'bot',
            timestamp: new Date(),
            structuredFeedback: res?.structuredFeedback || {
              complaintId: complaint.complaintId,
              complaintTitle: complaint.title,
              department: complaint.department,
              teacherId: complaint.assignedTeacherId || 'TCH-CSE-001',
              teacherName: complaint.assignedTeacherName || 'Faculty',
              sentiment: 'Neutral',
              resolutionQuality: 'Satisfactory',
              responseTime: 'Moderate',
              communication: 'Moderate',
              suggestedRating: 3,
              topics: ['Resolution Quality', 'Response Time', 'Communication'],
              summary: `Feedback recorded for ${complaint.title}.`,
              suggestedFeedback: 'The complaint management process was handled adequately. Overall, the resolution was satisfactory, although communication and response time could be improved.',
              originalComment: '',
              suggestedFollowUp: ''
            }
          }
          appendMessageSafely(analysisCardMsg)
        } catch {
          // fallback
        } finally {
          setIsTyping(false)
        }
        break
      }

      case 'EDIT_FEEDBACK': {
        setEditingFeedback(action.feedback)
        setFeedbackEditForm({
          complaintId: action.feedback.complaintId,
          complaintTitle: action.feedback.complaintTitle,
          rating: action.feedback.suggestedRating || 5,
          comment: action.feedback.suggestedFeedback || action.feedback.originalComment || '',
          category: 'Resolution Satisfaction'
        })
        // DO NOT CALL GEMINI. DO NOT CREATE ANY CHAT MESSAGE.
        break
      }

      case 'CANCEL_FEEDBACK': {
        setEditingFeedback(null)
        setFeedbackDraft(null)
        setConversationState('IDLE')
        const cancelMsg: ChatMessage = {
          id: generateUniqueId('b-cancel-fb'),
          messageType: 'AI_TEXT',
          text: "Feedback process cancelled. No feedback was saved. How else can I help you today?",
          sender: 'bot',
          timestamp: new Date(),
          quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', '⭐ Give Feedback']
        }
        appendMessageSafely(cancelMsg)
        break
      }

      case 'USE_AI_FEEDBACK':
      case 'SUBMIT_FEEDBACK': {
        setIsSubmittingFeedback(true)
        try {
          await submitFeedbackFromChat({
            complaintId: action.feedback.complaintId,
            rating: action.feedback.suggestedRating || 5,
            comment: action.feedback.suggestedFeedback || action.feedback.originalComment || '',
            category: 'Resolution Satisfaction',
            aiAnalysis: {
              sentiment: action.feedback.sentiment,
              resolutionQuality: action.feedback.resolutionQuality,
              responseTime: action.feedback.responseTime,
              communication: action.feedback.communication,
              topics: action.feedback.topics,
              summary: action.feedback.summary,
              suggestedFollowUp: action.feedback.suggestedFollowUp
            }
          })

          setFeedbackDraft(null)
          setConversationState('IDLE')

          const successMsg: ChatMessage = {
            id: generateUniqueId('b-fb-success'),
            messageType: 'SUCCESS',
            text: `✓ **Feedback for ${action.feedback.complaintId} submitted successfully!**\n\nThank you for helping CampusResolve improve. Your rating (**${action.feedback.suggestedRating}/5 ⭐**) and review have been registered.`,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', 'Campus Statistics']
          }
          appendMessageSafely(successMsg)
        } catch (err: any) {
          const errMsg: ChatMessage = {
            id: generateUniqueId('b-fb-err'),
            messageType: 'SYSTEM',
            text: `❌ ${err.response?.data?.message || 'Feedback could not be submitted. It may have already been recorded.'}`,
            sender: 'bot',
            timestamp: new Date()
          }
          appendMessageSafely(errMsg)
        } finally {
          setIsSubmittingFeedback(false)
        }
        break
      }

      case 'OPEN_COMPLAINT_FLOW': {
        setConversationState('COMPLAINT_COLLECTION')
        const botMsg: ChatMessage = {
          id: generateUniqueId('b-comp-flow'),
          messageType: 'AI_TEXT',
          text: "Please describe the issue you are facing on campus (including the building, lab, or room number), and I will draft a formal grievance for you.",
          sender: 'bot',
          timestamp: new Date(),
          quickActions: ['Seminar Hall projector flickering', 'Computer Lab 3 AC not working', 'Hostel Mess water issue', 'Cancel']
        }
        appendMessageSafely(botMsg)
        break
      }

      case 'CREATE_COMPLAINT': {
        setIsSubmittingDraft(true)
        try {
          const res = await createComplaintFromChat({
            title: action.draft.title,
            category: action.draft.category,
            department: action.draft.department || user?.department || 'CSE',
            location: action.draft.location || '',
            priority: action.draft.priority || 'medium',
            description: action.draft.description
          })

          setComplaintDraft(null)
          setConversationState('IDLE')

          const createdId = res.complaint?.complaintId || 'Registered'
          const successMsg: ChatMessage = {
            id: generateUniqueId('b-created'),
            messageType: 'SUCCESS',
            text: `✓ **Complaint ${createdId} Registered Successfully!**\n\nYour grievance has been forwarded to the **${res.complaint?.department || 'department'}** team.\nYou can track its progress anytime using the Complaint ID or from your Complaint History.`,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: [`Status of ${createdId}`, 'Show My Pending Complaints', 'Help Me Create a Complaint'],
            queryResults: res.complaint ? [res.complaint] : null
          }
          appendMessageSafely(successMsg)
        } catch (err: any) {
          const errMsg: ChatMessage = {
            id: generateUniqueId('b-err-create'),
            messageType: 'SYSTEM',
            text: `❌ Could not create complaint: ${err.response?.data?.message || 'Please check your connection and try again.'}`,
            sender: 'bot',
            timestamp: new Date()
          }
          appendMessageSafely(errMsg)
        } finally {
          setIsSubmittingDraft(false)
        }
        break
      }

      case 'CREATE_ANYWAY': {
        setIsSubmittingDraft(true)
        try {
          const res = await createComplaintFromChat({
            title: action.draft.title,
            category: action.draft.category,
            department: action.draft.department || user?.department || 'CSE',
            location: action.draft.location || '',
            priority: action.draft.priority || 'medium',
            description: action.draft.description,
            duplicateDecision: 'CREATED_ANYWAY'
          })

          setComplaintDraft(null)
          setConversationState('IDLE')

          const createdId = res.complaint?.complaintId || 'Registered'
          const successMsg: ChatMessage = {
            id: generateUniqueId('b-created'),
            messageType: 'SUCCESS',
            text: `✓ **Complaint ${createdId} Registered Successfully (Created Anyway)!**\n\nYour grievance has been forwarded to the **${res.complaint?.department || 'department'}** team.\nYou can track its progress anytime using the Complaint ID or from your Complaint History.`,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: [`Status of ${createdId}`, 'Show My Pending Complaints', 'Help Me Create a Complaint'],
            queryResults: res.complaint ? [res.complaint] : null
          }
          appendMessageSafely(successMsg)
        } catch (err: any) {
          const errMsg: ChatMessage = {
            id: generateUniqueId('b-err-create'),
            messageType: 'SYSTEM',
            text: `❌ Could not create complaint: ${err.response?.data?.message || 'Please check your connection and try again.'}`,
            sender: 'bot',
            timestamp: new Date()
          }
          appendMessageSafely(errMsg)
        } finally {
          setIsSubmittingDraft(false)
        }
        break
      }

      case 'JOIN_EXISTING_COMPLAINT': {
        setIsJoiningComplaint(true)
        setIsTyping(true)
        try {
          const res = await joinComplaintFromChat(action.complaintId)
          if (res.success) {
            const text = res.alreadyJoined
              ? `You are already recorded as an affected student for **${action.complaintId}** (*${res.title}*). Total affected students: **${res.affectedCount}**.`
              : `✓ **Added as an Affected Student to ${action.complaintId}!**\n\nYour report has been linked to **${action.complaintId}** (*${res.title}*). The ticket priority has been updated with **${res.affectedCount} affected students**.`

            const successMsg: ChatMessage = {
              id: generateUniqueId('b-join-success'),
              messageType: 'SUCCESS',
              text,
              sender: 'bot',
              timestamp: new Date(),
              quickActions: [`Status of ${action.complaintId}`, 'Help Me Create a Complaint', 'Show My Pending Complaints']
            }
            appendMessageSafely(successMsg)
          } else {
            const errMsg: ChatMessage = {
              id: generateUniqueId('b-err-join'),
              messageType: 'SYSTEM',
              text: `❌ Could not join complaint: ${res.message || 'Please try again.'}`,
              sender: 'bot',
              timestamp: new Date()
            }
            appendMessageSafely(errMsg)
          }
        } catch (err: any) {
          const errMsg: ChatMessage = {
            id: generateUniqueId('b-err-join'),
            messageType: 'SYSTEM',
            text: `❌ Could not join complaint: ${err.response?.data?.message || 'Please try again.'}`,
            sender: 'bot',
            timestamp: new Date()
          }
          appendMessageSafely(errMsg)
        } finally {
          setIsJoiningComplaint(false)
          setIsTyping(false)
        }
        break
      }

      case 'VIEW_EXISTING_COMPLAINT': {
        handleSend(`Status of ${action.complaintId}`)
        break
      }

      case 'EDIT_COMPLAINT': {
        setEditingDraft(action.draft)
        setEditForm({
          title: action.draft.title || '',
          category: action.draft.category || 'Infrastructure',
          department: action.draft.department || user?.department || 'CSE',
          location: action.draft.location || '',
          priority: action.draft.priority || 'medium',
          description: action.draft.description || ''
        })
        break
      }

      case 'CANCEL_COMPLAINT': {
        setEditingDraft(null)
        setComplaintDraft(null)
        setConversationState('IDLE')
        const cancelMsg: ChatMessage = {
          id: generateUniqueId('b-cancel-comp'),
          messageType: 'AI_TEXT',
          text: "Complaint creation cancelled. How else can I help you today?",
          sender: 'bot',
          timestamp: new Date(),
          quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', '⭐ Give Feedback']
        }
        appendMessageSafely(cancelMsg)
        break
      }

      case 'SHOW_PENDING_COMPLAINTS': {
        handleSend('Show my pending complaints')
        break
      }

      case 'SHOW_COMPLAINT_STATUS': {
        handleSend('What is the status of my complaint?')
        break
      }

      case 'SHOW_CAMPUS_STATS': {
        handleSend('Show campus statistics')
        break
      }

      case 'SHOW_FEEDBACK_REPORT': {
        handleSend('Show feedback report')
        break
      }

      case 'VIEW_COMPLAINT_HISTORY': {
        handleSelectComplaintId(action.complaintId)
        break
      }

      case 'SEND_TEXT': {
        handleSend(action.text)
        break
      }
    }
  }

  // ─── QUICK ACTION CHIP CLICK HANDLER (DISPATCHES STRUCTURED ACTIONS) ────────
  const handleQuickActionClick = (act: string) => {
    // Prevent clicks while processing
    if (isRequestPendingRef.current) return

    if (/^sign in( to continue)?$/i.test(act)) {
      navigate('/login')
    } else if (/^(⭐?\s*give feedback|rate complaint)$/i.test(act)) {
      handleAction({ type: 'OPEN_FEEDBACK_FLOW' })
    } else if (/^help me create a complaint$/i.test(act)) {
      handleAction({ type: 'OPEN_COMPLAINT_FLOW' })
    } else if (/^show my pending complaints$/i.test(act)) {
      handleAction({ type: 'SHOW_PENDING_COMPLAINTS' })
    } else if (/^check (my )?complaint status$/i.test(act)) {
      handleAction({ type: 'SHOW_COMPLAINT_STATUS' })
    } else if (/^show my complaint history$/i.test(act)) {
      handleSend('Show my complaint history')
    } else if (/^(campus stats|campus statistics|live campus statistics)$/i.test(act)) {
      handleAction({ type: 'SHOW_CAMPUS_STATS' })
    } else if (/^(feedback report|show feedback report)$/i.test(act)) {
      handleAction({ type: 'SHOW_FEEDBACK_REPORT' })
    } else if (/^cancel$/i.test(act)) {
      // Dispatch as structured cancel action — never send "Cancel" as text to LLM
      if (conversationState.includes('FEEDBACK') || conversationState === 'FEEDBACK_SELECTION') {
        handleAction({ type: 'CANCEL_FEEDBACK' })
      } else if (conversationState.includes('COMPLAINT') || conversationState === 'WAITING_FOR_LOCATION' || conversationState === 'WAITING_FOR_CATEGORY') {
        handleAction({ type: 'CANCEL_COMPLAINT' })
      } else {
        handleAction({ type: 'CANCEL_COMPLAINT' })
      }
    } else if (/^create complaint$/i.test(act)) {
      // Structured action — do not send as text
      if (complaintDraft) {
        handleAction({ type: 'CREATE_COMPLAINT', draft: complaintDraft })
      }
    } else if (/^(submit feedback|use this feedback)$/i.test(act)) {
      // Structured action — do not send as text
      if (feedbackDraft) {
        handleAction({ type: 'SUBMIT_FEEDBACK', feedback: feedbackDraft })
      }
    } else if (/^edit details$/i.test(act)) {
      if (complaintDraft) {
        handleAction({ type: 'EDIT_COMPLAINT', draft: complaintDraft })
      }
    } else if (/^edit feedback$/i.test(act)) {
      if (feedbackDraft) {
        handleAction({ type: 'EDIT_FEEDBACK', feedback: feedbackDraft })
      }
    } else if (/^status of (CR-\d+|CMP-\d+)$/i.test(act)) {
      // Send as text query — the backend will parse the complaint ID
      handleSend(act)
    } else if (/^give feedback for (CR-\d+|CMP-\d+)$/i.test(act)) {
      handleAction({ type: 'OPEN_FEEDBACK_FLOW' })
    } else if (/^(i('?m| am) also facing this issue|join complaint|support this ticket)$/i.test(act)) {
      const lastDup = [...messages].reverse().find(m => m.duplicateMatches && m.duplicateMatches.length > 0)?.duplicateMatches?.[0]
      if (lastDup) {
        handleAction({ type: 'JOIN_EXISTING_COMPLAINT', complaintId: lastDup.complaintId })
      } else {
        handleSend(act)
      }
    } else if (/^(create (new )?complaint anyway|create anyway|submit anyway)$/i.test(act)) {
      if (complaintDraft) {
        handleAction({ type: 'CREATE_ANYWAY', draft: complaintDraft })
      } else {
        handleSend(act)
      }
    } else if (/^(view (existing )?complaint|see existing complaint)$/i.test(act)) {
      const lastDup = [...messages].reverse().find(m => m.duplicateMatches && m.duplicateMatches.length > 0)?.duplicateMatches?.[0]
      if (lastDup) {
        handleAction({ type: 'VIEW_COMPLAINT_HISTORY', complaintId: lastDup.complaintId })
      } else {
        handleSend(act)
      }
    } else {
      handleAction({ type: 'SEND_TEXT', text: act })
    }
  }

  // Handle Retry
  const handleRetry = () => {
    if (lastErrorPrompt && !isRequestPendingRef.current) {
      handleSend(lastErrorPrompt)
    }
  }

  // Submit Edited Feedback
  const handleSaveEditedFeedback = () => {
    if (!feedbackEditForm.complaintId || !feedbackEditForm.comment) return
    const updatedFeedback: StructuredFeedback = {
      complaintId: feedbackEditForm.complaintId,
      complaintTitle: feedbackEditForm.complaintTitle,
      sentiment: editingFeedback?.sentiment || 'Neutral',
      resolutionQuality: editingFeedback?.resolutionQuality || 'Satisfactory',
      responseTime: editingFeedback?.responseTime || 'Moderate',
      communication: editingFeedback?.communication || 'Moderate',
      suggestedRating: feedbackEditForm.rating,
      topics: editingFeedback?.topics || ['Overall Experience'],
      summary: editingFeedback?.summary || 'Student feedback',
      suggestedFeedback: feedbackEditForm.comment,
      originalComment: feedbackEditForm.comment,
      suggestedFollowUp: editingFeedback?.suggestedFollowUp
    }
    setEditingFeedback(null)
    handleAction({ type: 'SUBMIT_FEEDBACK', feedback: updatedFeedback })
  }

  // Submit Edited Complaint
  const handleSaveEditedDraft = () => {
    if (!editForm.title || !editForm.description) return
    const updatedDraft: StructuredComplaint = {
      ...editForm,
      isComplete: true
    }
    setEditingDraft(null)
    handleAction({ type: 'CREATE_COMPLAINT', draft: updatedDraft })
  }

  // Navigate to Complaint in History
  const handleSelectComplaintId = (complaintId: string) => {
    if (role === 'student') {
      navigate('/student/history')
    } else if (role === 'teacher') {
      navigate('/teacher')
    } else if (role === 'admin') {
      navigate('/admin/complaints')
    }
    setIsOpen(false)
  }

  // Copy Message Text
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMsgId(msgId)
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  // Regenerate Response
  const handleRegenerate = () => {
    const userMsgs = messages.filter((m) => m.sender === 'user')
    if (userMsgs.length > 0) {
      const lastUserMsg = userMsgs[userMsgs.length - 1]
      handleSend(lastUserMsg.text)
    }
  }

  // Polish Text Draft in Input
  const handleEnhance = async () => {
    if (!inputValue.trim()) return
    setIsEnhancing(true)
    try {
      const enhanced = await enhanceFeedbackText(inputValue)
      setInputValue(enhanced)
    } catch {
      // keep original
    } finally {
      setIsEnhancing(false)
    }
  }

  // ─── Voice-First AI Handlers ─────────────────────────────────────────────
  const handleToggleListen = () => {
    if (voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING' || voiceState === 'SILENCE_DETECTED') {
      speechRecognitionService.stopListening()
    } else {
      if (playbackState === 'PLAYING') {
        textToSpeechService.stop()
      }
      setVoicePermissionError(null)
      setIsAutoSpeakEnabled(true)
      speechRecognitionService.startListening()
    }
  }

  const handleUpdateVoiceSettings = (partial: Partial<VoiceAgentSettings>) => {
    voiceConversationController.updateSettings(partial)
    setVoiceSettings(voiceConversationController.getSettings())
  }

  const handleEditTranscript = (text: string) => {
    // User manually edited the transcript — send the corrected version
    handleSend(text, null, true)
  }

  const handleRetryTranscript = () => {
    // Re-listen for the same request
    speechRecognitionService.startListening()
  }

  const handleStartListen = () => {
    if (playbackState === 'PLAYING') {
      textToSpeechService.stop()
    }
    setVoicePermissionError(null)
    speechRecognitionService.startListening()
  }

  const handleStopListen = () => {
    speechRecognitionService.stopListening()
  }

  const handleToggleMute = () => {
    const nextMuted = !isVoiceMuted
    setIsVoiceMuted(nextMuted)
    if (nextMuted) {
      textToSpeechService.mute()
    } else {
      textToSpeechService.unmute()
    }
  }

  const handleCloseVoiceModal = () => {
    setIsVoiceModalOpen(false)
    speechRecognitionService.stopListening()
    textToSpeechService.stop()
    voiceConversationController.endVoiceSession()
  }

  const handleSpeakMessage = (msgId: string, text: string) => {
    if (speakingMsgId === msgId && playbackState === 'PLAYING') {
      textToSpeechService.stop()
    } else {
      textToSpeechService.speak(text, msgId)
    }
  }

  // Keyboard shortcut: Escape cancels recording, stops speech, or closes voice modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isVoiceModalOpen) {
          handleCloseVoiceModal()
        } else if (voiceState === 'LISTENING' || voiceState === 'TRANSCRIBING') {
          handleStopListen()
        } else if (playbackState === 'PLAYING') {
          textToSpeechService.stop()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isVoiceModalOpen, voiceState, playbackState])

  // Reset / Clear Session
  const resetSession = () => {
    processedMessageIdsRef.current.clear()
    processedRequestIdsRef.current.clear()
    processedAnalysisIdsRef.current.clear()
    setMessages([])
    setSessionId(undefined)

    if (isAuthenticated && user) {
      const firstName = user?.name?.split(' ')[0] || 'there'
      const newWelcome: ChatMessage = {
        id: generateUniqueId('welcome-fresh'),
        messageType: 'AI_TEXT',
        text: `Hi ${firstName}! New conversation started. How can I help you today?`,
        sender: 'bot',
        timestamp: new Date(),
        quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', 'Check Complaint Status', '⭐ Give Feedback']
      }
      appendMessageSafely(newWelcome)
    } else {
      const guestWelcome: ChatMessage = {
        id: generateUniqueId('welcome-fresh'),
        messageType: 'AI_TEXT',
        text: `Welcome to CampusResolve! 🏛️ I'm your **Public Campus Assistant**.\n\nI can answer general questions about filing grievances, resolution workflows, feedback policies, and login support.\n\n🔒 *Please sign in to access your personal complaints, status tracking, and feedback history.*`,
        sender: 'bot',
        timestamp: new Date(),
        quickActions: ['How to Submit a Complaint', 'How Complaint Tracking Works', 'Feedback Information', 'Login Help']
      }
      appendMessageSafely(guestWelcome)
    }
  }

  const activeSuggestedPrompts = !isAuthenticated ? GUEST_SUGGESTED_PROMPTS : AUTH_STUDENT_SUGGESTED_PROMPTS

  return (
    <>
      {/* ── Chat Window Modal / Floating Drawer ─────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed z-50 overflow-hidden flex flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-950/20 backdrop-blur-xl ${
              isFullscreen
                ? 'top-4 bottom-4 right-4 left-4 md:left-24 md:top-6 md:bottom-6 md:right-6 rounded-[24px]'
                : 'bottom-6 right-6 w-[430px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-64px)] rounded-[24px]'
            }`}
          >
            {/* ══ HEADER ══ */}
            <div className="p-3.5 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0 select-none">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${isAuthenticated ? 'bg-slate-900 dark:bg-blue-600' : 'bg-slate-700 dark:bg-slate-800'} text-white flex items-center justify-center shadow-xs transition-colors`}>
                    {isAuthenticated ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-300" />}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'} border-2 border-white dark:border-slate-900`} />
                </div>
                <div>
                  <h3 className="text-[14px] sm:text-[14.5px] font-semibold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-1.5">
                    CampusResolve AI Assistant
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                    {isAuthenticated ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Personalized assistance enabled.</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Guest Mode</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsVoiceModalOpen(true)
                    voiceConversationController.startVoiceSession('CONTINUOUS')
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/80 transition-all cursor-pointer shadow-2xs mr-1"
                  title="Open Voice Conversation Mode"
                >
                  <Headphones className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
                  <span className="hidden sm:inline">Voice Agent</span>
                </button>

                <button
                  onClick={resetSession}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Refresh Conversation"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isFullscreen ? 'Restore' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setIsOpen(false); setIsFullscreen(false) }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Close AI Assistant"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ══ GUEST MODE BANNER ══ */}
            {!isAuthenticated && (
              <div className="px-4 py-2 bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate font-medium">Log in to view your complaints, status updates, feedback history, and personalized AI insights.</span>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10.5px] shrink-0 cursor-pointer shadow-2xs"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* ══ MESSAGE LIST CONTAINER ══ */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-slate-50/40 dark:bg-slate-950/30 scrollbar-thin relative"
            >
              <div className="w-full max-w-3xl mx-auto space-y-3">
                {/* Suggested Prompts on Initial State */}
                {messages.length <= 1 && (
                  <div className="space-y-2 pt-1 pb-1">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">
                      Suggested Prompts
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeSuggestedPrompts.map((card) => (
                        <button
                          key={card.title}
                          onClick={() => handleAction(card.action)}
                          disabled={isTyping}
                          className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all text-left flex items-start gap-2.5 cursor-pointer group disabled:opacity-50"
                        >
                          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 group-hover:scale-105 transition-transform">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[12.5px] font-semibold text-slate-900 dark:text-white leading-snug">
                              {card.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
                              {card.desc}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Items Stream */}

                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse max-w-[85%] sm:max-w-[70%]' : 'flex-row max-w-[92%] sm:max-w-[85%]'}`}>
                      {/* Avatars */}
                      {msg.sender === 'user' ? (
                        <UserAvatar
                          src={user?.profilePicture || user?.profileImage}
                          name={user?.name}
                          size="sm"
                          className="h-6 w-6 sm:h-7 sm:w-7 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-6 h-6 sm:h-7 sm:w-7 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`p-3 sm:p-3.5 break-words overflow-hidden ${
                          msg.sender === 'user'
                            ? 'rounded-2xl rounded-tr-xs bg-[#0f172a] dark:bg-blue-600 text-white shadow-xs'
                            : msg.messageType === 'SUCCESS'
                            ? 'rounded-2xl rounded-tl-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-slate-800 dark:text-slate-100 shadow-2xs'
                            : 'rounded-2xl rounded-tl-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-2xs'
                        }`}
                      >
                        <ChatMessageContent
                          content={msg.text}
                          isUser={msg.sender === 'user'}
                          structuredComplaint={msg.structuredComplaint}
                          structuredFeedback={msg.structuredFeedback}
                          duplicateMatches={msg.duplicateMatches}
                          queryResults={msg.queryResults}
                          eligibleComplaints={msg.eligibleComplaints}
                          ragSources={msg.ragSources}
                          widgetData={msg.widgetData}
                          onCreateComplaint={(draft) => handleAction({ type: 'CREATE_COMPLAINT', draft })}
                          onEditComplaint={(draft) => handleAction({ type: 'EDIT_COMPLAINT', draft })}
                          onCancelComplaint={() => handleAction({ type: 'CANCEL_COMPLAINT' })}
                          onSubmitFeedback={(fb) => handleAction({ type: 'SUBMIT_FEEDBACK', feedback: fb })}
                          onEditFeedback={(fb) => handleAction({ type: 'EDIT_FEEDBACK', feedback: fb })}
                          onCancelFeedback={() => handleAction({ type: 'CANCEL_FEEDBACK' })}
                          onSelectResolvedComplaint={(c) => handleAction({ type: 'SELECT_FEEDBACK_COMPLAINT', complaint: c })}
                          onSelectComplaintId={(id) => handleAction({ type: 'VIEW_COMPLAINT_HISTORY', complaintId: id })}
                          onJoinComplaint={(complaintId) => handleAction({ type: 'JOIN_EXISTING_COMPLAINT', complaintId })}
                          onCreateAnyway={(draft) => handleAction({ type: 'CREATE_ANYWAY', draft })}
                          isSubmittingDraft={isSubmittingDraft}
                          isSubmittingFeedback={isSubmittingFeedback}
                          isJoiningComplaint={isJoiningComplaint}
                          isSpeaking={speakingMsgId === msg.id && playbackState === 'PLAYING'}
                          onSpeak={(text) => handleSpeakMessage(msg.id, text)}
                          onStopSpeak={() => textToSpeechService.stop()}
                        />

                      </div>
                    </div>

                    {/* Message Timestamp & Actions */}
                    <div className={`flex items-center gap-2 mt-1 mx-8 sm:mx-9 text-[10.5px] text-slate-400 dark:text-slate-500 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                      <div className="relative flex items-center gap-1">
                        {msg.sender === 'bot' && (
                          <>
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
                              title="Copy response"
                            >
                              {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={handleRegenerate}
                              disabled={isTyping}
                              className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer disabled:opacity-40"
                              title="Regenerate response"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {/* Action Menu Button */}
                        <button
                          onClick={() => setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id)}
                          className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
                          title="Message options"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>

                        {/* Action Menu Dropdown */}
                        {activeMenuMsgId === msg.id && (
                          <div className="absolute top-5 z-30 min-w-[130px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                            <button
                              onClick={() => {
                                handleCopyMessage(msg.id, msg.text)
                                setActiveMenuMsgId(null)
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Text</span>
                            </button>
                            {msg.sender === 'bot' && (
                              <button
                                onClick={() => {
                                  handleRegenerate()
                                  setActiveMenuMsgId(null)
                                }}
                                disabled={isTyping}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retry / Redo</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Chips */}
                    {msg.quickActions && msg.quickActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-8 sm:ml-9 max-w-[92%] sm:max-w-[85%]">
                        {msg.quickActions.map((act) => (
                          <button
                            key={`act-${act}`}
                            onClick={() => handleQuickActionClick(act)}
                            disabled={isTyping}
                            className="px-2.5 py-1 rounded-full text-[12px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-400 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Error Banner with Retry */}
                {lastErrorPrompt && !isTyping && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-2 text-[12px] text-rose-700 dark:text-rose-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>Sorry, I couldn't process that request. Please try again.</span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* ══ AI TYPING INDICATOR ══ */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-6 h-6 sm:h-7 sm:w-7 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-2.5 px-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-2xs">
                      <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">CampusResolve AI</span>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.3s]" />
                      </div>
                      <span className="text-[11.5px] text-slate-400 dark:text-slate-500">Analyzing your request...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>



            {/* ══ AI POLISH DRAFT BAR ══ */}
            <AnimatePresence>
              {inputValue.trim().length > 15 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 overflow-hidden"
                >
                  <div className="w-full max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-blue-600 dark:text-blue-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Improve Text Description</span>
                    </div>
                    <button
                      onClick={handleEnhance}
                      disabled={isEnhancing}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isEnhancing ? 'Polishing...' : '✨ Polish Text'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══ STICKY CHAT COMPOSER ══ */}
            <div className="p-3 sm:p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="w-full max-w-3xl mx-auto space-y-1.5">
                {/* ══ VOICE VISUALIZER BANNER ══ */}
                <AnimatePresence>
                  {(voiceState !== 'IDLE' || playbackState !== 'STOPPED') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-1.5"
                    >
                      <VoiceVisualizer
                        voiceState={voiceState}
                        playbackState={playbackState}
                        isMuted={isVoiceMuted}
                        transcript={inputValue || latestUserTranscript}
                        onStopListening={handleStopListen}
                        onPauseSpeaking={() => textToSpeechService.pause()}
                        onResumeSpeaking={() => textToSpeechService.resume()}
                        onStopSpeaking={() => textToSpeechService.stop()}
                        onReplaySpeaking={() => textToSpeechService.replay()}
                        onToggleMute={handleToggleMute}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ══ VOICE PERMISSION ERROR BANNER ══ */}
                <AnimatePresence>
                  {voicePermissionError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-[11.5px] text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2 mb-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{voicePermissionError}</span>
                      </div>
                      <button
                        onClick={() => setVoicePermissionError(null)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 rounded-2xl p-1.5 px-3 bg-slate-100/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputValue}
                    onChange={handleTextareaInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAction({ type: 'SEND_TEXT', text: inputValue })
                      }
                    }}
                    placeholder="Ask about a complaint, check a status, create a grievance, or share feedback..."
                    className="flex-1 bg-transparent py-1.5 text-[13.5px] sm:text-[14px] text-slate-900 dark:text-white placeholder:text-[13px] sm:placeholder:text-[13.5px] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none min-h-[24px] max-h-[120px]"
                  />

                  <div className="flex items-center gap-1 shrink-0 pb-0.5">
                    {speechRecognitionService.isAvailable() && (
                      <button
                        type="button"
                        onClick={handleToggleListen}
                        aria-label={
                          voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING'
                            ? 'Stop voice recording'
                            : 'Start voice recording'
                        }
                        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
                          voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING'
                            ? 'text-white bg-blue-600 shadow-md shadow-blue-500/30'
                            : voiceState === 'PROCESSING' || voiceState === 'AI_THINKING'
                            ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/40'
                            : voiceState === 'AI_SPEAKING'
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                            : voiceState === 'ERROR'
                            ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                        }`}
                        title={
                          voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING'
                            ? 'Listening... Click to stop'
                            : voiceState === 'AI_SPEAKING'
                            ? 'AI Speaking... Click to interrupt'
                            : 'Voice Input (Click to speak)'
                        }
                      >
                        {voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING' ? (
                          <>
                            <span className="absolute inset-0 rounded-xl bg-blue-500 animate-ping opacity-30" />
                            <Square className="w-3.5 h-3.5 fill-current relative z-10" />
                          </>
                        ) : voiceState === 'PROCESSING' || voiceState === 'AI_THINKING' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        ) : voiceState === 'AI_SPEAKING' ? (
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAction({ type: 'SEND_TEXT', text: inputValue })}
                      disabled={!inputValue.trim() || isTyping}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>


            {/* ══ EDIT COMPLAINT DETAILS MODAL ══ */}
            {editingDraft && (
              <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3.5">
                <div className="w-full max-w-[390px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-blue-600" /> Edit Complaint Details
                    </h4>
                    <button
                      onClick={() => handleAction({ type: 'CANCEL_COMPLAINT' })}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-[12px]">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Category</label>
                        <select
                          value={editForm.category}
                          onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12px] focus:outline-none"
                        >
                          <option value="Infrastructure">Infrastructure</option>
                          <option value="Academics">Academics</option>
                          <option value="Transport">Transport</option>
                          <option value="Financial">Financial</option>
                          <option value="Hostel">Hostel</option>
                          <option value="General">General</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Priority</label>
                        <select
                          value={editForm.priority}
                          onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value as any }))}
                          className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12px] focus:outline-none"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Location / Room</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g. Seminar Hall, Lab 3"
                        className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={editForm.description}
                        onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleAction({ type: 'CANCEL_COMPLAINT' })}
                      className="px-3 py-1.5 rounded-xl text-[12px] text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditedDraft}
                      className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      Save & Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ EDIT FEEDBACK MODAL ══ */}
            {editingFeedback && (
              <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3.5">
                <div className="w-full max-w-[390px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Edit Feedback Details
                    </h4>
                    <button
                      onClick={() => handleAction({ type: 'CANCEL_FEEDBACK' })}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-[12px]">
                    <div>
                      <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 block font-bold">
                        {feedbackEditForm.complaintId}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                        {feedbackEditForm.complaintTitle}
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Satisfaction Rating
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={`star-edit-${star}`}
                            type="button"
                            onClick={() => setFeedbackEditForm(prev => ({ ...prev, rating: star }))}
                            className="p-1 cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= feedbackEditForm.rating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-[12px] font-bold text-slate-900 dark:text-white ml-1">
                          {feedbackEditForm.rating}/5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Feedback Comments
                      </label>
                      <textarea
                        rows={3}
                        value={feedbackEditForm.comment}
                        onChange={e => setFeedbackEditForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleAction({ type: 'CANCEL_FEEDBACK' })}
                      className="px-3 py-1.5 rounded-xl text-[12px] text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditedFeedback}
                      className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating AI Assistant Trigger Button (Hidden when drawer is open) ─ */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-[56px] w-[56px] rounded-[20px] bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shadow-xl border border-slate-800 hover:shadow-2xl transition-all cursor-pointer"
          aria-label="Open CampusResolve AI Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 dark:border-blue-600 animate-pulse" />
          </div>
        </motion.button>
      )}

      {/* ══ DEDICATED VOICE CONVERSATION MODAL ══ */}
      <VoiceConversationModal
        isOpen={isVoiceModalOpen}
        voiceState={voiceState}
        voiceMode={voiceMode}
        playbackState={playbackState}
        isMuted={isVoiceMuted}
        latestUserTranscript={latestUserTranscript}
        latestAIText={latestAIText}
        isAuthenticated={isAuthenticated}
        audioLevel={audioLevel}
        settings={voiceSettings}
        onClose={handleCloseVoiceModal}
        onToggleMode={(mode) => { setVoiceMode(mode); handleUpdateVoiceSettings({ conversationMode: mode }) }}
        onToggleMute={handleToggleMute}
        onStartListening={handleStartListen}
        onStopListening={handleStopListen}
        onStartPushToTalk={handleStartListen}
        onStopPushToTalk={handleStopListen}
        onReplaySpeaking={() => textToSpeechService.replay()}
        onEditTranscript={handleEditTranscript}
        onRetryTranscript={handleRetryTranscript}
        onUpdateSettings={handleUpdateVoiceSettings}
      />
    </>
  )
}

export default ChatAssistant

