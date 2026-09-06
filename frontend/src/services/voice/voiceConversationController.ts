/**
 * CampusResolve Voice-First AI Agent — Voice Conversation Controller
 * 
 * Central voice agent brain that orchestrates:
 * - State machine transitions
 * - Barge-in handling (user interrupts AI → cancel TTS → listen)
 * - Auto-send (silence detected → process automatically)
 * - Continuous vs Push-to-Talk modes
 * - Session context / conversation memory ("the first one", "my fan complaint")
 * - Request deduplication and AbortController for in-flight requests
 * - Voice settings persistence
 */

import { VoiceState, VoiceMode, VoiceEvent, VoiceAgentSettings, VoiceSessionContext, DEFAULT_VOICE_SETTINGS } from './voiceTypes'
import { voiceTransition, canBargeIn } from './voiceAgentStateMachine'
import { SpeechRecognitionService, speechRecognitionService } from './speechRecognitionService'
import { TextToSpeechService, textToSpeechService } from './textToSpeechService'

const SETTINGS_STORAGE_KEY = 'campusresolve_voice_settings'

export interface VoiceConversationCallbacks {
  onStateChange?: (state: VoiceState) => void
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void
  onUserMessageReady?: (transcript: string) => Promise<void> | void
  onError?: (error: { error: string; message: string; isPermissionDenied?: boolean }) => void
  onBargeIn?: () => void
  onAudioLevel?: (level: number) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onNavigate?: (path: string) => void
}

export class VoiceConversationController {
  private stt: SpeechRecognitionService
  private tts: TextToSpeechService
  private state: VoiceState = 'IDLE'
  private isConversationActive = false
  private isAISpeaking = false
  private callbacks: VoiceConversationCallbacks = {}
  private settings: VoiceAgentSettings
  private sessionContext: VoiceSessionContext = {
    currentComplaintId: null,
    recentResults: [],
    lastIntent: null,
    turnCount: 0,
    lastUserTranscript: '',
    lastAIResponse: ''
  }

  // Deduplication
  private currentRequestId: string | null = null
  private abortController: AbortController | null = null
  private lastProcessedTranscriptHash = ''

  constructor(
    stt: SpeechRecognitionService = speechRecognitionService,
    tts: TextToSpeechService = textToSpeechService
  ) {
    this.stt = stt
    this.tts = tts
    this.settings = this.loadSettings()
    this.applySettings()
    this.setupListeners()
  }

  // ── Settings Persistence ────────────────────────────────────────────────
  private loadSettings(): VoiceAgentSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) }
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_VOICE_SETTINGS }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings))
    } catch { /* ignore */ }
  }

  private applySettings(): void {
    this.stt.setSilenceThreshold(this.settings.silenceThresholdMs)
    this.tts.setSpeed(this.settings.speechSpeed)
  }

  public getSettings(): VoiceAgentSettings {
    return { ...this.settings }
  }

  public updateSettings(partial: Partial<VoiceAgentSettings>): void {
    this.settings = { ...this.settings, ...partial }
    this.applySettings()
    this.saveSettings()
  }

  // ── Session Context (Conversation Memory) ───────────────────────────────
  public getSessionContext(): VoiceSessionContext {
    return { ...this.sessionContext }
  }

  public updateSessionContext(partial: Partial<VoiceSessionContext>): void {
    this.sessionContext = { ...this.sessionContext, ...partial }
  }

  public resetSessionContext(): void {
    this.sessionContext = {
      currentComplaintId: null,
      recentResults: [],
      lastIntent: null,
      turnCount: 0,
      lastUserTranscript: '',
      lastAIResponse: ''
    }
  }

  /**
   * Resolve references like "the first one", "open it", "that complaint"
   * using session context.
   */
  public resolveContextualReference(transcript: string): string {
    const lower = transcript.toLowerCase().trim()

    // "the first one", "open the first one"
    if (/\b(the\s+)?first\s+one\b/i.test(lower) && this.sessionContext.recentResults.length >= 1) {
      const first = this.sessionContext.recentResults[0]
      return `Show details for complaint ${first.id}`
    }

    // "the second one"
    if (/\b(the\s+)?second\s+one\b/i.test(lower) && this.sessionContext.recentResults.length >= 2) {
      const second = this.sessionContext.recentResults[1]
      return `Show details for complaint ${second.id}`
    }

    // "open it", "read the details", "show the timeline"
    if (/\b(open\s+it|read\s+(the\s+)?details|show\s+(the\s+)?timeline)\b/i.test(lower) && this.sessionContext.currentComplaintId) {
      return `Show details for complaint ${this.sessionContext.currentComplaintId}`
    }

    // "when was it created", "who is assigned"
    if (/\b(when\s+was\s+it\s+created|who\s+is\s+assigned|what\s+department)\b/i.test(lower) && this.sessionContext.currentComplaintId) {
      return `Status of ${this.sessionContext.currentComplaintId}`
    }

    // "give feedback" / "rate it" after viewing a complaint
    if (/\b(give\s+feedback|rate\s+it)\b/i.test(lower) && this.sessionContext.currentComplaintId) {
      return `Give feedback for ${this.sessionContext.currentComplaintId}`
    }

    return transcript
  }

  // ── Callbacks ───────────────────────────────────────────────────────────
  public registerCallbacks(callbacks: VoiceConversationCallbacks): void {
    this.callbacks = callbacks
  }

  // ── State Management ────────────────────────────────────────────────────
  private setState(newState: VoiceState): void {
    this.state = newState
    this.callbacks.onStateChange?.(newState)
  }

  private dispatch(event: VoiceEvent): void {
    const nextState = voiceTransition(this.state, event)
    if (nextState !== this.state) {
      this.setState(nextState)
    }
  }

  public getState(): VoiceState {
    return this.state
  }

  public getVoiceMode(): VoiceMode {
    return this.settings.conversationMode
  }

  public setVoiceMode(mode: VoiceMode): void {
    this.settings.conversationMode = mode
    this.saveSettings()
  }

  public isVoiceActive(): boolean {
    return this.isConversationActive
  }

  // ── Hash for dedup ──────────────────────────────────────────────────────
  private hashText(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i)
      hash = hash & hash
    }
    return `${hash}-${text.length}`
  }

  // ── Listener Setup ──────────────────────────────────────────────────────
  private setupListeners(): void {
    // STT: Transcript update (interim and final)
    this.stt.onTranscript = (result) => {
      this.callbacks.onTranscriptUpdate?.(result.transcript, result.isFinal)
    }

    // STT: State changes
    this.stt.onStateChange = (sttState) => {
      // Map STT states to voice agent states
      if (sttState === 'LISTENING') {
        this.dispatch('MIC_GRANTED')
      } else if (sttState === 'USER_SPEAKING') {
        // If AI is speaking and user starts talking → BARGE-IN
        if (canBargeIn(this.state)) {
          this.handleBargeIn()
        } else {
          this.dispatch('SPEECH_START')
          this.callbacks.onSpeechStart?.()
        }
      } else if (sttState === 'IDLE' && (this.state === 'LISTENING' || this.state === 'USER_SPEAKING')) {
        // STT stopped naturally
      } else if (sttState === 'ERROR') {
        this.dispatch('ERROR')
      }
    }

    // STT: Speech start (VAD)
    this.stt.onSpeechStart = () => {
      if (canBargeIn(this.state)) {
        this.handleBargeIn()
      } else {
        this.dispatch('SPEECH_START')
        this.callbacks.onSpeechStart?.()
      }
    }

    // STT: Speech end (VAD)
    this.stt.onSpeechEnd = () => {
      this.callbacks.onSpeechEnd?.()
    }

    // STT: Audio level (for waveform visualization)
    this.stt.onAudioLevel = (level) => {
      this.callbacks.onAudioLevel?.(level)
    }

    // STT: Final transcript (silence stop → auto-process)
    this.stt.onFinalTranscript = async (transcript) => {
      if (!transcript.trim()) {
        if (this.isConversationActive && this.settings.conversationMode === 'CONTINUOUS') {
          this.listen()
        } else {
          this.setState('IDLE')
        }
        return
      }

      // Deduplication check
      const hash = this.hashText(transcript.trim())
      if (hash === this.lastProcessedTranscriptHash) {
        // Duplicate — re-listen if continuous
        if (this.isConversationActive && this.settings.conversationMode === 'CONTINUOUS') {
          setTimeout(() => this.listen(), 500)
        }
        return
      }
      this.lastProcessedTranscriptHash = hash

      // Update session context
      this.sessionContext.lastUserTranscript = transcript.trim()
      this.sessionContext.turnCount++

      // Resolve contextual references ("the first one", "open it")
      const resolvedTranscript = this.resolveContextualReference(transcript.trim())

      // Cancel any in-flight request
      if (this.abortController) {
        this.abortController.abort()
      }
      this.abortController = new AbortController()
      this.currentRequestId = `vreq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

      this.dispatch('TRANSCRIPT_READY')

      try {
        await this.callbacks.onUserMessageReady?.(resolvedTranscript)
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          this.dispatch('ERROR')
        }
      }
    }

    // STT: Error
    this.stt.onError = (err) => {
      this.dispatch('ERROR')
      this.callbacks.onError?.(err)
    }

    // TTS: Speech started
    this.tts.onStart = (_msgId) => {
      this.isAISpeaking = true
      this.stt.cancel() // Mute/stop microphone while AI speaks
      this.dispatch('AI_SPEECH_START')
    }

    // TTS: Speech ended — auto-listen with 700ms echo prevention delay
    this.tts.onEnd = () => {
      this.isAISpeaking = false
      this.dispatch('AI_SPEECH_END')

      if (this.isConversationActive && this.settings.conversationMode === 'CONTINUOUS') {
        // Continuous mode: wait 700ms before restarting microphone to prevent echo reverberation
        setTimeout(() => {
          if (this.isConversationActive && !this.isAISpeaking && !this.tts.isSpeaking()) {
            this.listen()
          }
        }, 700)
      }
    }

    // TTS: Barge-in occurred
    this.tts.onBargeIn = () => {
      this.isAISpeaking = false
      this.callbacks.onBargeIn?.()
    }

    // TTS: Error
    this.tts.onError = () => {
      this.isAISpeaking = false
      if (this.isConversationActive && this.settings.conversationMode === 'CONTINUOUS') {
        setTimeout(() => {
          if (this.isConversationActive) this.listen()
        }, 500)
      } else {
        this.setState('IDLE')
      }
    }
  }

  // ── Barge-In Handler ────────────────────────────────────────────────────
  private handleBargeIn(): void {
    this.isAISpeaking = false
    // 1. Immediately stop AI speech
    this.tts.interruptForBargeIn()

    // 2. Cancel any pending AI request
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // 3. Transition to LISTENING
    this.setState('LISTENING')
    this.callbacks.onBargeIn?.()
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Start listening for user speech
   */
  public listen(): boolean {
    this.tts.stop() // Stop any audio playback before listening
    this.stt.start()
    this.setState('LISTENING')
    return true
  }

  /**
   * Stop listening and process captured speech
   */
  public stopListening(): void {
    this.stt.stop()
  }

  /**
   * Start full Voice Conversation Mode
   */
  public startConversation(mode?: VoiceMode): boolean {
    this.isConversationActive = true
    if (mode) {
      this.settings.conversationMode = mode
      this.saveSettings()
    }
    this.lastProcessedTranscriptHash = ''
    return this.listen()
  }

  public startVoiceSession(mode?: VoiceMode): boolean {
    return this.startConversation(mode)
  }

  /**
   * End Voice Conversation Mode — release mic and stop TTS immediately
   */
  public endConversation(): void {
    this.isConversationActive = false
    this.stt.cancel()
    this.tts.stop()
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.setState('IDLE')
  }

  public endVoiceSession(): void {
    this.endConversation()
  }

  /**
   * Push-to-talk: start recording
   */
  public startPushToTalk(): boolean {
    this.settings.conversationMode = 'PUSH_TO_TALK'
    this.isConversationActive = true
    return this.listen()
  }

  /**
   * Push-to-talk: stop recording (triggers processing)
   */
  public stopPushToTalk(): void {
    this.stt.stop()
  }

  /**
   * Speak an AI response. Called by ChatAssistant after receiving API response.
   */
  public speakAIResponse(text: string, messageId?: string): void {
    if (!this.settings.voiceResponseEnabled) return
    this.isAISpeaking = true
    this.stt.cancel() // Stop listening while AI speaks to avoid echo
    this.tts.speak(text, messageId || null)
    this.sessionContext.lastAIResponse = text
  }

  /**
   * Stop speech synthesis
   */
  public stopSpeaking(): void {
    this.tts.stop()
    this.setState('IDLE')
  }

  /**
   * Get the current AbortController signal for cancelling in-flight requests
   */
  public getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal
  }

  /**
   * Get current request ID for deduplication
   */
  public getCurrentRequestId(): string | null {
    return this.currentRequestId
  }
}

export const voiceConversationController = new VoiceConversationController()
