/**
 * CampusResolve Voice-First AI Agent — Type Definitions
 * Full 15-state machine, settings, session memory, and structured response types.
 */

// ── 15-State Voice Agent State Machine ──────────────────────────────────────
export type VoiceState =
  | 'IDLE'
  | 'MIC_PERMISSION_REQUEST'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'SILENCE_DETECTED'
  | 'TRANSCRIBING'
  | 'PROCESSING'
  | 'AI_THINKING'
  | 'EXECUTING_ACTION'
  | 'AWAITING_CONFIRMATION'
  | 'AI_SPEAKING'
  | 'PAUSED'
  | 'ERROR'
  | 'ENDED'

// ── Voice Conversation Modes ────────────────────────────────────────────────
export type VoiceMode =
  | 'PUSH_TO_TALK'
  | 'CONTINUOUS'

// ── TTS Playback State ──────────────────────────────────────────────────────
export type PlaybackState =
  | 'STOPPED'
  | 'PLAYING'
  | 'PAUSED'

// ── Speech Speed ────────────────────────────────────────────────────────────
export type SpeechSpeed = 'slow' | 'normal' | 'fast'

// ── State Machine Events ────────────────────────────────────────────────────
export type VoiceEvent =
  | 'MIC_GRANTED'
  | 'MIC_DENIED'
  | 'SPEECH_START'
  | 'SPEECH_END'
  | 'SILENCE_TIMEOUT'
  | 'TRANSCRIPT_READY'
  | 'PROCESSING_START'
  | 'AI_RESPONSE_READY'
  | 'AI_SPEECH_START'
  | 'AI_SPEECH_END'
  | 'USER_INTERRUPT'       // Barge-in
  | 'CONFIRM'
  | 'CANCEL'
  | 'ERROR'
  | 'RECOVER'
  | 'END'
  | 'PAUSE'
  | 'RESUME'
  | 'START_LISTENING'

// ── Voice Recognition Result ────────────────────────────────────────────────
export interface VoiceRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence?: number
}

// ── Voice Recognition Error ─────────────────────────────────────────────────
export interface VoiceRecognitionError {
  error: string
  message: string
  isPermissionDenied?: boolean
}

// ── Voice Agent Settings (persisted to localStorage) ────────────────────────
export interface VoiceAgentSettings {
  autoSubmitSpeech: boolean        // Default: true — no manual send required
  conversationMode: VoiceMode      // Default: 'CONTINUOUS'
  speechSpeed: SpeechSpeed         // Default: 'normal'
  voiceResponseEnabled: boolean    // Default: true — AI speaks responses
  silenceThresholdMs: number       // Default: 2000 (2 seconds)
}

export const DEFAULT_VOICE_SETTINGS: VoiceAgentSettings = {
  autoSubmitSpeech: true,
  conversationMode: 'CONTINUOUS',
  speechSpeed: 'normal',
  voiceResponseEnabled: true,
  silenceThresholdMs: 2000
}

// ── Voice Session Context (in-session conversation memory) ──────────────────
export interface VoiceSessionContext {
  currentComplaintId: string | null
  recentResults: Array<{ id: string; title: string; status?: string }>
  lastIntent: string | null
  turnCount: number
  lastUserTranscript: string
  lastAIResponse: string
}

// ── Structured Voice Response (from backend) ────────────────────────────────
export interface StructuredVoiceResponse {
  intent: string
  action: string
  requiresConfirmation: boolean
  screenResponse: string       // Rich markdown for chat bubble
  voiceResponse: string        // Concise natural-language for TTS
  data: Record<string, any>
  navigation: string | null    // e.g. '/student', '/student/history'
  confidence: number
}

// ── Playback Controls Interface ─────────────────────────────────────────────
export interface VoicePlaybackControls {
  play: (text: string, messageId?: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  replay: () => void
  toggleMute: () => boolean
  isMuted: boolean
  playbackState: PlaybackState
  activeMessageId: string | null
}

// ── Audio Level Callback ────────────────────────────────────────────────────
export type AudioLevelCallback = (level: number) => void   // 0.0 – 1.0
