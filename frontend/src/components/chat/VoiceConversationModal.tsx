import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, X, Sparkles, Volume2, VolumeX,
  Radio, Square, RotateCcw, Edit3, AlertTriangle
} from 'lucide-react'
import { VoiceState, VoiceMode, PlaybackState, VoiceAgentSettings } from '../../services/voice/voiceTypes'
import { VoiceSettings } from './VoiceSettings'

interface ConversationTurn {
  role: 'user' | 'ai'
  text: string
  timestamp: number
}

interface VoiceConversationModalProps {
  isOpen: boolean
  voiceState: VoiceState
  voiceMode: VoiceMode
  playbackState: PlaybackState
  isMuted: boolean
  latestUserTranscript: string
  latestAIText: string
  isAuthenticated: boolean
  audioLevel: number
  settings: VoiceAgentSettings
  onClose: () => void
  onToggleMode: (mode: VoiceMode) => void
  onToggleMute: () => void
  onStartListening: () => void
  onStopListening: () => void
  onStartPushToTalk: () => void
  onStopPushToTalk: () => void
  onReplaySpeaking: () => void
  onEditTranscript: (text: string) => void
  onRetryTranscript: () => void
  onUpdateSettings: (partial: Partial<VoiceAgentSettings>) => void
}

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  voiceState,
  voiceMode,
  playbackState,
  isMuted,
  latestUserTranscript,
  latestAIText,
  isAuthenticated,
  audioLevel,
  settings,
  onClose,
  onToggleMode,
  onToggleMute,
  onStartListening,
  onStopListening,
  onStartPushToTalk,
  onStopPushToTalk,
  onReplaySpeaking,
  onEditTranscript,
  onRetryTranscript,
  onUpdateSettings
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [showBargeInFlash, setShowBargeInFlash] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const historyRef = useRef<HTMLDivElement>(null)
  const prevTranscriptRef = useRef('')
  const prevAIRef = useRef('')

  // Keyboard shortcut: Escape to exit
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Track conversation history
  useEffect(() => {
    if (latestUserTranscript && latestUserTranscript !== prevTranscriptRef.current && voiceState === 'PROCESSING') {
      prevTranscriptRef.current = latestUserTranscript
      setConversationHistory(prev => [...prev.slice(-8), { role: 'user', text: latestUserTranscript, timestamp: Date.now() }])
    }
  }, [latestUserTranscript, voiceState])

  useEffect(() => {
    if (latestAIText && latestAIText !== prevAIRef.current && voiceState === 'AI_SPEAKING') {
      prevAIRef.current = latestAIText
      setConversationHistory(prev => [...prev.slice(-8), { role: 'ai', text: latestAIText, timestamp: Date.now() }])
    }
  }, [latestAIText, voiceState])

  // Auto-scroll history
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [conversationHistory])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setConversationHistory([])
      setSettingsOpen(false)
      setIsEditing(false)
      prevTranscriptRef.current = ''
      prevAIRef.current = ''
    }
  }, [isOpen])

  // Generate waveform bars from audio level
  const generateWaveBars = useCallback(() => {
    const barCount = 24
    const bars = []
    for (let i = 0; i < barCount; i++) {
      const baseHeight = 4
      const maxAdd = 36
      // Create varied heights based on audio level with some randomness
      const phase = Math.sin((i / barCount) * Math.PI) // Center bars taller
      const noise = 0.7 + Math.random() * 0.6
      const audioFactor = voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING'
        ? Math.max(audioLevel * 3, 0.1)
        : voiceState === 'AI_SPEAKING' ? 0.5 + Math.sin(Date.now() / 200 + i) * 0.3 : 0.05
      const height = baseHeight + maxAdd * phase * audioFactor * noise
      bars.push(Math.max(3, Math.min(40, height)))
    }
    return bars
  }, [audioLevel, voiceState])

  const waveBars = generateWaveBars()

  const handleEditSubmit = () => {
    if (editText.trim()) {
      onEditTranscript(editText.trim())
    }
    setIsEditing(false)
    setEditText('')
  }

  const getOrbGradient = () => {
    switch (voiceState) {
      case 'LISTENING':
        return 'from-blue-500 via-cyan-400 to-indigo-600'
      case 'USER_SPEAKING':
        return 'from-blue-600 via-indigo-500 to-cyan-400'
      case 'SILENCE_DETECTED':
      case 'TRANSCRIBING':
        return 'from-cyan-500 via-blue-500 to-indigo-500'
      case 'PROCESSING':
      case 'AI_THINKING':
      case 'EXECUTING_ACTION':
        return 'from-purple-600 via-indigo-500 to-pink-500'
      case 'AWAITING_CONFIRMATION':
        return 'from-amber-500 via-orange-500 to-yellow-500'
      case 'AI_SPEAKING':
        return 'from-emerald-500 via-teal-400 to-blue-500'
      case 'ERROR':
        return 'from-rose-500 via-amber-500 to-red-600'
      case 'PAUSED':
        return 'from-slate-500 via-slate-400 to-slate-600'
      case 'IDLE':
      default:
        return 'from-slate-600 via-blue-600 to-slate-800'
    }
  }

  const getStatusText = () => {
    switch (voiceState) {
      case 'LISTENING': return 'Listening...'
      case 'USER_SPEAKING': return 'Hearing you...'
      case 'SILENCE_DETECTED': return 'Processing...'
      case 'TRANSCRIBING': return 'Transcribing...'
      case 'PROCESSING': case 'AI_THINKING': return 'Understanding your request...'
      case 'EXECUTING_ACTION': return 'Performing action...'
      case 'AWAITING_CONFIRMATION': return 'Waiting for confirmation...'
      case 'AI_SPEAKING': return 'CampusResolve is speaking...'
      case 'ERROR': return 'Something went wrong'
      case 'PAUSED': return 'Paused'
      case 'MIC_PERMISSION_REQUEST': return 'Requesting microphone access...'
      default: return voiceMode === 'CONTINUOUS'
        ? 'Say something to begin...'
        : 'Press and hold to speak'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-md bg-white dark:bg-[#0B111F] border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
          style={{ maxHeight: 'min(680px, calc(100vh - 40px))' }}
        >
          {/* Barge-in flash overlay */}
          <AnimatePresence>
            {showBargeInFlash && (
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                onAnimationComplete={() => setShowBargeInFlash(false)}
                className="absolute inset-0 z-20 bg-amber-400/20 pointer-events-none rounded-3xl"
              />
            )}
          </AnimatePresence>

          {/* ── Header ── */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-[800] text-slate-900 dark:text-white leading-tight">
                  Voice AI Agent
                </h3>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {isAuthenticated ? 'Personalized · Hands-free' : 'Guest Mode · Public FAQs only'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onToggleMute}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="End Voice Mode (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Animated Waveform Orb ── */}
          <div className="relative flex flex-col items-center justify-center py-5 px-5 shrink-0">
            {/* Outer pulsating aura */}
            <motion.div
              animate={{
                scale: voiceState === 'USER_SPEAKING' || voiceState === 'AI_SPEAKING' ? [1, 1.3, 1] : voiceState === 'LISTENING' ? [1, 1.15, 1] : 1,
                opacity: voiceState === 'USER_SPEAKING' || voiceState === 'AI_SPEAKING' ? [0.2, 0.5, 0.2] : 0.15
              }}
              transition={{ repeat: Infinity, duration: voiceState === 'USER_SPEAKING' ? 0.8 : 2, ease: 'easeInOut' }}
              className={`absolute w-32 h-32 rounded-full bg-gradient-to-tr ${getOrbGradient()} blur-xl`}
            />

            {/* Core Orb */}
            <motion.div
              animate={{
                scale: voiceState === 'USER_SPEAKING'
                  ? [0.95, 0.95 + audioLevel * 0.3, 0.95]
                  : voiceState === 'AI_SPEAKING'
                  ? [0.97, 1.05, 0.97]
                  : voiceState === 'LISTENING'
                  ? [0.98, 1.02, 0.98]
                  : 1
              }}
              transition={{ repeat: Infinity, duration: voiceState === 'USER_SPEAKING' ? 0.3 : 1.5, ease: 'easeInOut' }}
              className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getOrbGradient()} shadow-lg flex items-center justify-center text-white relative z-10`}
            >
              {voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'SILENCE_DETECTED' || voiceState === 'TRANSCRIBING' ? (
                <Mic className={`w-8 h-8 ${voiceState === 'USER_SPEAKING' ? 'animate-pulse' : ''}`} />
              ) : voiceState === 'PROCESSING' || voiceState === 'AI_THINKING' || voiceState === 'EXECUTING_ACTION' ? (
                <Sparkles className="w-8 h-8 animate-spin text-cyan-200" />
              ) : voiceState === 'AWAITING_CONFIRMATION' ? (
                <AlertTriangle className="w-8 h-8 text-amber-200" />
              ) : voiceState === 'AI_SPEAKING' ? (
                <Volume2 className="w-8 h-8" />
              ) : (
                <Radio className="w-8 h-8" />
              )}
            </motion.div>

            {/* Real-time Waveform Bars */}
            {(voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'AI_SPEAKING') && (
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] h-10 px-6 opacity-60">
                {waveBars.map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: `${h}px` }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className={`w-[3px] rounded-full ${
                      voiceState === 'AI_SPEAKING'
                        ? 'bg-emerald-400'
                        : voiceState === 'USER_SPEAKING'
                        ? 'bg-blue-400'
                        : 'bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Status Text ── */}
          <div className="text-center px-5 shrink-0">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' ? 'text-blue-500' :
              voiceState === 'PROCESSING' || voiceState === 'AI_THINKING' ? 'text-purple-500' :
              voiceState === 'AI_SPEAKING' ? 'text-emerald-500' :
              voiceState === 'AWAITING_CONFIRMATION' ? 'text-amber-500' :
              voiceState === 'ERROR' ? 'text-rose-500' :
              'text-slate-500'
            }`}>
              {getStatusText()}
            </span>
          </div>

          {/* ── Live Transcript / AI Caption Area ── */}
          <div className="px-5 pt-3 min-h-[60px] flex flex-col justify-center shrink-0">
            {/* User Transcript (informational — not an input field) */}
            {(voiceState === 'USER_SPEAKING' || voiceState === 'SILENCE_DETECTED' || voiceState === 'TRANSCRIBING') && latestUserTranscript && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">You said</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 italic">
                  "{latestUserTranscript}"
                </p>
              </div>
            )}

            {/* Processing indicator */}
            {(voiceState === 'PROCESSING' || voiceState === 'AI_THINKING') && (
              <div className="space-y-1">
                {latestUserTranscript && (
                  <p className="text-[11px] text-slate-500 italic mb-1">"{latestUserTranscript}"</p>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.3s]" />
                  </div>
                  <span className="text-[11px] text-purple-500 font-medium">Analyzing with AI...</span>
                </div>
              </div>
            )}

            {/* Awaiting Confirmation */}
            {voiceState === 'AWAITING_CONFIRMATION' && (
              <div className="space-y-1 text-center">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Confirmation needed</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Say <strong>"Yes"</strong> or <strong>"Confirm"</strong> to proceed, or <strong>"Cancel"</strong> to abort.
                </p>
              </div>
            )}

            {/* AI Speaking Caption */}
            {voiceState === 'AI_SPEAKING' && latestAIText && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">AI Response</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-3">
                  {latestAIText}
                </p>
              </div>
            )}

            {/* Idle hint */}
            {voiceState === 'IDLE' && !latestAIText && (
              <p className="text-[11px] text-slate-500 text-center font-medium">
                {voiceMode === 'CONTINUOUS'
                  ? 'Speak naturally — I\'m ready to listen.'
                  : 'Press and hold the button to speak.'}
              </p>
            )}
          </div>

          {/* ── Optional Edit/Retry (only when auto-submit made a mistake) ── */}
          {settings.autoSubmitSpeech && latestUserTranscript && (voiceState === 'IDLE' || voiceState === 'LISTENING') && (
            <div className="px-5 pt-1 pb-0 flex items-center justify-center gap-2 shrink-0">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => { setIsEditing(true); setEditText(latestUserTranscript) }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-2.5 h-2.5" /> Edit
                  </button>
                  <button
                    onClick={onRetryTranscript}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Retry
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit() }}
                    className="flex-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button onClick={handleEditSubmit} className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold cursor-pointer">Send</button>
                  <button onClick={() => setIsEditing(false)} className="px-2 py-1 rounded-lg text-[10px] text-slate-500 cursor-pointer">Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* ── Conversation History Strip ── */}
          {conversationHistory.length > 0 && (
            <div
              ref={historyRef}
              className="mx-5 mt-2 max-h-[100px] overflow-y-auto scrollbar-thin rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 p-2 space-y-1.5"
            >
              {conversationHistory.map((turn, i) => (
                <div key={`${turn.timestamp}-${i}`} className={`text-[10px] ${turn.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span className={`inline-block px-2 py-0.5 rounded-lg max-w-[90%] ${
                    turn.role === 'user'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
                  }`}>
                    {turn.text.length > 120 ? turn.text.substring(0, 120) + '...' : turn.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div className="px-5 pt-3 pb-2 flex items-center justify-center gap-2 shrink-0">
            {voiceMode === 'PUSH_TO_TALK' ? (
              <button
                onMouseDown={onStartPushToTalk}
                onMouseUp={onStopPushToTalk}
                onTouchStart={onStartPushToTalk}
                onTouchEnd={onStopPushToTalk}
                className={`w-full py-3 rounded-2xl font-[800] text-sm text-white flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all select-none ${
                  voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING' ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING' ? 'Release to Send' : 'Hold to Speak'}</span>
              </button>
            ) : (
              <>
                {voiceState === 'USER_SPEAKING' || voiceState === 'LISTENING' ? (
                  <button
                    onClick={onStopListening}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Done Speaking</span>
                  </button>
                ) : voiceState === 'AI_SPEAKING' ? (
                  <button
                    onClick={() => { onStopListening(); onStartListening() }}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Interrupt AI</span>
                  </button>
                ) : voiceState === 'IDLE' || voiceState === 'ERROR' ? (
                  <button
                    onClick={onStartListening}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Start Speaking</span>
                  </button>
                ) : null}

                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-all"
                >
                  End Conversation
                </button>
              </>
            )}
          </div>

          {/* ── Voice Settings Panel ── */}
          <div className="px-5 pb-4 shrink-0">
            <VoiceSettings
              isOpen={settingsOpen}
              settings={settings}
              onToggleOpen={() => setSettingsOpen(!settingsOpen)}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  )
}

export default VoiceConversationModal
