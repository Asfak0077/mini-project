import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Mic, MicOff, Bot, User as UserIcon,
  Maximize2, Minimize2, Sparkles, Star,
  FileText, Search, Bell, Key, Clock, MessageSquare, Settings,
  Smile, Paperclip, RefreshCw, HelpCircle, ArrowUpRight,
  ShieldCheck, Check, CornerDownLeft, Sparkle
} from 'lucide-react'
import { sendChatMessage, ChatMessage, enhanceFeedbackText, fetchUserContext } from '../../services/chatbotService'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { useLocation } from 'react-router-dom'
import { UserAvatar } from '../ui/Avatar'

import { ChatMessageContent } from './ChatMessageContent'

/* ─── Smart Prompt Chips ────────────────────────────────────────────────── */
const SMART_PROMPT_CARDS = [
  { label: 'Submit Complaint', desc: 'Guide to file a complaint', icon: FileText, msg: 'How do I submit a new campus complaint?' },
  { label: 'Track Resolution', desc: 'Check SLA & stages', icon: Clock, msg: 'How do I track my submitted complaint status?' },
  { label: 'Submit Feedback', desc: 'Rate completed work', icon: Star, msg: 'How do I submit feedback for a resolved issue?' },
  { label: 'Campus Policies', desc: 'SLA & escalation rules', icon: ShieldCheck, msg: 'What are the grievance resolution timeframes?' },
]

/* ─── Page Context ──────────────────────────────────────────────────────── */
const PAGE_CONTEXT: Record<string, { greeting: string; quickActions: string[] }> = {
  '/student/feedback': {
    greeting: '📝 You are on the **Feedback Portal**. Need help writing a constructive evaluation?',
    quickActions: ['Help Write Comment', 'Rate Faculty Response', 'Enhance Text'],
  },
  '/student/history': {
    greeting: '📋 You are viewing **Complaint History**. I can help check resolution timelines.',
    quickActions: ['Track Complaint', 'Explain Complaint Status', 'Give Feedback'],
  },
  '/admin/analytics': {
    greeting: '📊 You are on the **Analytics Dashboard**. Ask for department benchmark reports.',
    quickActions: ['Feedback Report', 'Department Workload', 'SLA Adherence'],
  },
  '/admin/teachers': {
    greeting: '👩‍🏫 You are managing **Faculty**. I can analyze department capacity.',
    quickActions: ['Workload Metrics', 'Assign Department', 'Performance Report'],
  },
  '/teacher': {
    greeting: '🎓 Welcome, Faculty! I can help draft resolution remarks or update ticket stages.',
    quickActions: ['View Assigned', 'Draft Resolution Note', 'Update Status'],
  },
  '/admin': {
    greeting: '🛡️ Welcome, Admin! Real-time campus infrastructure data is connected.',
    quickActions: ['Show Summary', 'Feedback Report', 'Department Stats'],
  },
  '/': {
    greeting: '🌟 Welcome to **CampusResolve**! How can I assist you today?',
    quickActions: ['Submit Complaint', 'Track Status', 'Security Overview'],
  },
}

/* ─── Session Memory ────────────────────────────────────────────────────── */
const MEMORY_KEY = 'cr_chat_memory'
const loadMemory = (): string[] => {
  try { return JSON.parse(sessionStorage.getItem(MEMORY_KEY) || '[]') } catch { return [] }
}
const saveMemory = (msgs: string[]) => {
  sessionStorage.setItem(MEMORY_KEY, JSON.stringify(msgs.slice(-5)))
}

const FRUSTRATED_RE = /urgent|ignored|no response|not resolved|worst|still pending|nobody|please fix|so frustrated|very frustrated|help me now/i

export const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [isListening, setIsListening] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [userContext, setUserContext] = useState<any>(null)
  const [memory, setMemory] = useState<string[]>(loadMemory)
  const [isUrgentMode, setIsUrgentMode] = useState(false)

  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const { isDarkMode } = useThemeStore()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.onresult = (e: any) => {
        setInputValue(e.results[0][0].transcript)
        setIsListening(false)
      }
      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }
  }, [SpeechRecognition])

  useEffect(() => {
    if (!user || !role) return
    const userId = user.studentId || user.teacherId || user.email || ''
    if (!userId) return
    fetchUserContext(userId, role).then(ctx => {
      setUserContext(ctx)
    }).catch(() => {})
  }, [user, role])

  useEffect(() => {
    const pageCtx = PAGE_CONTEXT[location.pathname] || PAGE_CONTEXT['/']
    const firstName = user?.name?.split(' ')[0] || 'there'
    let welcomeText = `👋 Hi **${firstName}**! Welcome to **CampusResolve AI**.\nHow can I help you resolve or track your campus complaints today?\n\n${pageCtx.greeting}`

    if (userContext && role === 'student') {
      const { total, pending, inProgress, resolved } = userContext
      welcomeText = `👋 Hi **${firstName}**!\n\n📌 **Complaints:** ${total}  |  ⏳ **Pending:** ${pending}  |  🔄 **In Progress:** ${inProgress}  |  ✅ **Resolved:** ${resolved}\n\n${pageCtx.greeting}`
    } else if (userContext && role === 'admin') {
      welcomeText = `👋 Hi **Admin**!\nCampus live metrics:\n\n📌 **Total:** ${userContext.total}  |  ✅ **Resolved:** ${userContext.resolved}  |  ⏳ **Pending:** ${userContext.pending}\n\n${pageCtx.greeting}`
    } else if (userContext && role === 'teacher') {
      welcomeText = `👋 Hi **Faculty**!\nYour assignments:\n\n📋 **Active:** ${userContext.assigned}  |  ✅ **Resolved:** ${userContext.resolved}\n\n${pageCtx.greeting}`
    }

    setMessages([{ id: 'welcome', text: welcomeText, sender: 'bot', timestamp: new Date(), quickActions: pageCtx.quickActions }])
  }, [location.pathname, userContext, role])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, isOpen])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    const isUrgent = FRUSTRATED_RE.test(text)
    if (isUrgent) setIsUrgentMode(true)

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    // Save prompt into memory
    const updatedMemory = [...memory, text.trim()]
    setMemory(updatedMemory)
    saveMemory(updatedMemory)

    try {
      const userId = user?.studentId || user?.teacherId || user?.email || user?.id || ''
      const res = await sendChatMessage(text.trim(), sessionId, userId, role ?? 'student', 'en', isUrgent)

      if (res?.sessionId) setSessionId(res.sessionId)

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        text: res?.text || "I'm here to assist you. Let me know what you'd like to check.",
        sender: 'bot',
        timestamp: new Date(),
        quickActions: res?.quickActions
      }

      setMessages(prev => [...prev, botMsg])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: "I'm having a brief connection pause with the AI cluster. Please retry your question or navigate to the relevant portal tab.",
          sender: 'bot',
          timestamp: new Date()
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleEnhance = async () => {
    if (!inputValue.trim()) return
    setIsEnhancing(true)
    try {
      const enhanced = await enhanceFeedbackText(inputValue)
      setInputValue(enhanced)
    } catch {
      // Keep original text
    } finally {
      setIsEnhancing(false)
    }
  }

  const toggleListen = () => {
    if (!SpeechRecognition || !recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const resetSession = () => {
    setMessages([])
    setSessionId(undefined)
    const pageCtx = PAGE_CONTEXT[location.pathname] || PAGE_CONTEXT['/']
    setMessages([{
      id: 'welcome-fresh',
      text: `👋 New AI session started! How can I assist you with your campus complaints?`,
      sender: 'bot',
      timestamp: new Date(),
      quickActions: pageCtx.quickActions
    }])
  }

  return (
    <>
      {/* ── Floating Chat Drawer / Window ─────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed z-50 overflow-hidden flex flex-col bg-[var(--card)] border border-[var(--border)] shadow-2xl shadow-black/25 backdrop-blur-xl ${
              isFullscreen
                ? 'inset-3 sm:inset-6 md:inset-8 rounded-[24px]'
                : 'bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[410px] h-[580px] max-h-[82vh] rounded-[24px]'
            }`}
          >
            {/* ══ HEADER ══ */}
            <div className="p-3.5 px-4.5 sm:p-4 sm:px-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-secondary)]/60 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-[11px] bg-[#111827] dark:bg-white text-white dark:text-[#111827] flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-[var(--card)]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
                    CampusResolve AI
                  </h3>
                  <p className="text-[11px] font-normal text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Smart Assistant • Active
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={resetSession}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  title="New Session"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  title={isFullscreen ? 'Collapse' : 'Expand'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setIsOpen(false); setIsFullscreen(false); setIsUrgentMode(false) }}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ══ MESSAGES STREAM ══ */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 sm:space-y-3.5 bg-[var(--background)]/40 scrollbar-thin">
              
              {/* Smart Suggestion Chips (Shown on initial greeting state) */}
              {messages.length <= 1 && (
                <div className="space-y-2 pt-0.5 pb-2">
                  <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider block px-1">
                    Suggested Questions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SMART_PROMPT_CARDS.map((card) => {
                      const Icon = card.icon
                      return (
                        <button
                          key={card.label}
                          onClick={() => handleSend(card.msg)}
                          className="p-2.5 sm:p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-2xs hover:border-[var(--accent)] hover:shadow-xs transition-all text-left flex items-start gap-2.5 cursor-pointer group"
                        >
                          <div className="w-6 h-6 rounded-lg bg-[var(--surface-secondary)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--border)] group-hover:scale-105 transition-transform">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[12px] sm:text-[13px] font-medium text-[var(--text-primary)] leading-tight">{card.label}</h4>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-tight">{card.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar Icon */}
                    {msg.sender === 'user' ? (
                      <UserAvatar
                        src={user?.profilePicture || user?.profileImage}
                        name={user?.name}
                        size="sm"
                        className="h-6 w-6 sm:h-7 sm:w-7 border border-[var(--border)] shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:h-7 sm:w-7 rounded-lg bg-[#111827] dark:bg-white text-white dark:text-[#111827] flex items-center justify-center shrink-0 shadow-2xs">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`p-3 sm:p-3.5 px-3.5 sm:px-4 break-words overflow-hidden ${
                        msg.sender === 'user'
                          ? 'rounded-2xl rounded-br-xs bg-[#111827] dark:bg-blue-600 text-white shadow-xs'
                          : 'rounded-2xl rounded-bl-xs bg-[var(--card)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xs'
                      }`}
                    >
                      <ChatMessageContent content={msg.text} isUser={msg.sender === 'user'} />
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className={`text-[10.5px] font-normal mt-1 mx-8 sm:mx-9 text-[var(--text-muted)] ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Quick Action Pills */}
                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5 ml-8 sm:ml-9 max-w-[85%] sm:max-w-[75%]">
                      {msg.quickActions.map((act) => (
                        <button
                          key={act}
                          onClick={() => handleSend(act)}
                          className="px-2.5 sm:px-3 py-1 rounded-full text-[12px] sm:text-[12.5px] font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-2xs"
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-6 h-6 sm:h-7 sm:w-7 rounded-lg bg-[#111827] dark:bg-white text-white dark:text-[#111827] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-2.5 px-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ══ AI ENHANCE BANNER ══ */}
            <AnimatePresence>
              {inputValue.trim().length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3.5 py-1.5 flex items-center justify-between border-t border-[var(--border)] bg-[var(--primary-subtle)] overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Writing Assistant</span>
                  </div>
                  <button
                    onClick={handleEnhance}
                    disabled={isEnhancing}
                    className="px-2.5 py-1 rounded-full text-[11.5px] sm:text-[12px] font-medium bg-[#111827] dark:bg-blue-600 text-white hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isEnhancing ? 'Enhancing...' : '✨ Polish Draft'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══ INPUT COMPOSER ══ */}
            <div className="p-3 sm:p-3.5 border-t border-[var(--border)] bg-[var(--card)] shrink-0 space-y-1.5">
              <div className="flex items-center gap-2 rounded-xl p-1.5 px-2 bg-[var(--surface-secondary)] border border-[var(--border)] focus-within:border-[var(--accent)] focus-within:bg-[var(--card)] focus-within:ring-2 focus-within:ring-blue-500/10 transition-all shadow-inner">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(inputValue)
                    }
                  }}
                  placeholder="Ask CampusResolve AI anything..."
                  className="flex-1 bg-transparent px-2 text-[13px] sm:text-[14px] font-normal text-[var(--text-primary)] placeholder:text-[13px] sm:placeholder:text-[14px] placeholder-[var(--text-muted)] focus:outline-none"
                />

                <div className="flex items-center gap-1 shrink-0">
                  {SpeechRecognition && (
                    <button
                      type="button"
                      onClick={toggleListen}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isListening
                          ? 'text-rose-500 bg-rose-500/15'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                      }`}
                      title="Voice Input"
                    >
                      {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSend(inputValue)}
                    disabled={!inputValue.trim() || isTyping}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#111827] dark:bg-blue-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-normal text-[var(--text-muted)] px-1">
                <span>AI-Powered • Role-Aware</span>
                <span>Press ↵ to send</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating AI Trigger Button ─────────────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06, rotate: 1 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => { setIsOpen(!isOpen); setIsUrgentMode(false) }}
        className="fixed bottom-6 right-6 z-50 h-[58px] w-[58px] rounded-[22px] bg-[#111827] dark:bg-white text-white dark:text-[#111827] flex items-center justify-center shadow-xl border border-white/10 dark:border-black/10 hover:shadow-2xl transition-all cursor-pointer"
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#111827] dark:border-white" />
          </div>
        )}
      </motion.button>
    </>
  )
}

export default ChatAssistant
