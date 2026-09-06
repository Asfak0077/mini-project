/**
 * CampusResolve Voice-First AI Agent — Speech Recognition Service (STT)
 * 
 * Hybrid approach:
 * - AudioContext + AnalyserNode for real-time Voice Activity Detection (VAD)
 *   and audio level monitoring (waveform visualization).
 * - Web Speech API SpeechRecognition for actual transcription.
 * 
 * Features:
 * - Real-time audio level callback for waveform UI
 * - Speech start/end detection via audio energy threshold
 * - Configurable silence threshold (default 2.0s)
 * - Transcript hash deduplication to prevent double-fires
 * - Auto-send on silence (voice-first: no manual send required)
 */

import { VoiceState, VoiceRecognitionResult, VoiceRecognitionError, AudioLevelCallback } from './voiceTypes'

export class SpeechRecognitionService {
  private recognition: any = null
  private isListening = false
  private silenceTimer: any = null
  private silenceThresholdMs = 2000 // 2.0s default — configurable
  private lastTranscript = ''
  private lastFinalTranscriptHash = ''
  private isSpeechActive = false

  // AudioContext VAD
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private audioSourceNode: MediaStreamAudioSourceNode | null = null
  private vadAnimationFrame: number | null = null
  private readonly SPEECH_THRESHOLD = 0.025 // Energy threshold for "user is speaking"
  private speechStartTime: number | null = null

  // Callbacks
  public onTranscript?: (result: VoiceRecognitionResult) => void
  public onFinalTranscript?: (transcript: string) => void  // Renamed from onSilenceStop
  public onStateChange?: (state: VoiceState) => void
  public onError?: (error: VoiceRecognitionError) => void
  public onSpeechStart?: () => void        // VAD: user voice detected
  public onSpeechEnd?: () => void           // VAD: user voice stopped
  public onAudioLevel?: AudioLevelCallback  // 0.0–1.0 for waveform viz

  // Legacy alias
  public get onSilenceStop() { return this.onFinalTranscript }
  public set onSilenceStop(cb: ((transcript: string) => void) | undefined) { this.onFinalTranscript = cb }

  constructor(lang = 'en-US') {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = lang
        this.setupListeners()
      } catch (err) {
        console.warn('[SpeechRecognitionService] Initialization error:', err)
      }
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.recognition)
  }

  public setSilenceThreshold(ms: number): void {
    this.silenceThresholdMs = Math.max(800, Math.min(5000, ms))
  }

  public getSilenceThreshold(): number {
    return this.silenceThresholdMs
  }

  // ── Audio Context Setup (VAD) ───────────────────────────────────────────
  private async setupAudioContext(): Promise<boolean> {
    try {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume()
        }
        return true
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8

      this.audioSourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.audioSourceNode.connect(this.analyser)

      return true
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        this.onError?.({
          error: 'not-allowed',
          message: 'Microphone permission denied. Please allow microphone access in browser settings.',
          isPermissionDenied: true
        })
      }
      return false
    }
  }

  private startAudioMonitoring(): void {
    if (!this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    let wasSpeaking = false

    const monitor = () => {
      if (!this.isListening || !this.analyser) {
        this.vadAnimationFrame = null
        return
      }

      this.analyser.getByteFrequencyData(dataArray)

      // Calculate RMS energy level (0.0 – 1.0)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = dataArray[i] / 255
        sum += normalized * normalized
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // Emit audio level for waveform visualization
      this.onAudioLevel?.(rms)

      // VAD: detect speech start/end
      const isSpeaking = rms > this.SPEECH_THRESHOLD

      if (isSpeaking && !wasSpeaking) {
        // Speech started
        wasSpeaking = true
        this.isSpeechActive = true
        this.speechStartTime = Date.now()
        this.onSpeechStart?.()
        this.onStateChange?.('USER_SPEAKING')
        this.clearSilenceTimer()
      } else if (!isSpeaking && wasSpeaking) {
        // Speech ended — start silence timer
        wasSpeaking = false
        this.isSpeechActive = false
        this.onSpeechEnd?.()
        this.resetSilenceTimer()
      }

      this.vadAnimationFrame = requestAnimationFrame(monitor)
    }

    this.vadAnimationFrame = requestAnimationFrame(monitor)
  }

  private stopAudioMonitoring(): void {
    if (this.vadAnimationFrame) {
      cancelAnimationFrame(this.vadAnimationFrame)
      this.vadAnimationFrame = null
    }
  }

  private releaseAudioContext(): void {
    this.stopAudioMonitoring()
    if (this.audioSourceNode) {
      try { this.audioSourceNode.disconnect() } catch { /* ignore */ }
      this.audioSourceNode = null
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop())
      this.mediaStream = null
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close() } catch { /* ignore */ }
    }
    this.audioContext = null
    this.analyser = null
  }

  // ── Web Speech API Listeners ────────────────────────────────────────────
  private setupListeners(): void {
    if (!this.recognition) return

    this.recognition.onstart = () => {
      this.isListening = true
      this.lastTranscript = ''
      this.lastFinalTranscriptHash = ''
      this.onStateChange?.('LISTENING')
    }

    this.recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i]
        const text = item[0]?.transcript || ''
        if (item.isFinal) {
          final += text
        } else {
          interim += text
        }
      }

      const activeText = (final || interim).trim()
      if (activeText) {
        this.lastTranscript = activeText
        this.onTranscript?.({
          transcript: activeText,
          isFinal: Boolean(final && !interim),
          confidence: event.results?.[event.resultIndex]?.[0]?.confidence
        })

        // If we have a final transcript, reset the silence timer
        // (the silence timer auto-fires onFinalTranscript)
        if (final && !interim) {
          this.resetSilenceTimer()
        }
      }
    }

    this.recognition.onerror = (event: any) => {
      this.clearSilenceTimer()
      const errType = event.error || 'unknown'
      let message = 'Unable to capture audio. Please check your microphone.'
      let isPermissionDenied = false

      if (errType === 'not-allowed' || errType === 'service-not-allowed') {
        isPermissionDenied = true
        message = 'Microphone permission denied. Please allow microphone access in browser settings.'
      } else if (errType === 'no-speech') {
        // Benign — stop gracefully
        this.stop()
        return
      } else if (errType === 'network') {
        message = 'Network issue with speech recognition service.'
      } else if (errType === 'aborted') {
        // Intentional abort, ignore
        return
      }

      this.isListening = false
      this.onStateChange?.('ERROR')
      this.onError?.({
        error: errType,
        message,
        isPermissionDenied
      })
    }

    this.recognition.onend = () => {
      this.clearSilenceTimer()
      const wasListening = this.isListening
      this.isListening = false

      if (wasListening && this.lastTranscript) {
        this.emitFinalTranscriptDeduped(this.lastTranscript)
      }

      this.onStateChange?.('IDLE')
    }
  }

  // ── Deduplication ─────────────────────────────────────────────────────────
  private hashTranscript(text: string): string {
    // Simple hash for dedup
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `${hash}-${text.length}`
  }

  private emitFinalTranscriptDeduped(transcript: string): void {
    const trimmed = transcript.trim()
    if (!trimmed) return

    const hash = this.hashTranscript(trimmed)
    if (hash === this.lastFinalTranscriptHash) {
      // Duplicate — skip
      return
    }
    this.lastFinalTranscriptHash = hash
    this.onFinalTranscript?.(trimmed)
  }

  // ── Silence Timer ─────────────────────────────────────────────────────────
  private resetSilenceTimer(): void {
    this.clearSilenceTimer()
    this.silenceTimer = setTimeout(() => {
      if (this.isListening && this.lastTranscript.trim()) {
        const text = this.lastTranscript.trim()
        this.stop()
        this.emitFinalTranscriptDeduped(text)
      }
    }, this.silenceThresholdMs)
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  public async start(): Promise<boolean> {
    if (!this.recognition) {
      this.onError?.({
        error: 'unsupported',
        message: 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'
      })
      return false
    }

    if (this.isListening) {
      return true
    }

    // Setup AudioContext for VAD
    const audioOk = await this.setupAudioContext()
    if (!audioOk) return false

    try {
      this.lastTranscript = ''
      this.lastFinalTranscriptHash = ''
      this.recognition.start()
      this.startAudioMonitoring()
      return true
    } catch (err: any) {
      if (err?.name === 'InvalidStateError') {
        this.isListening = true
        this.startAudioMonitoring()
        return true
      }
      this.onError?.({
        error: err?.name || 'start_error',
        message: 'Failed to start microphone recording.'
      })
      return false
    }
  }

  public startListening(): Promise<boolean> {
    return this.start()
  }

  public stop(): void {
    this.clearSilenceTimer()
    this.stopAudioMonitoring()
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch {
        // ignore already stopped
      }
    }
    this.isListening = false
    this.isSpeechActive = false
    this.onStateChange?.('IDLE')
  }

  public stopListening(): void {
    this.stop()
  }

  public cancel(): void {
    this.clearSilenceTimer()
    this.stopAudioMonitoring()
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort()
      } catch {
        // ignore
      }
    }
    this.isListening = false
    this.isSpeechActive = false
    this.lastTranscript = ''
    this.lastFinalTranscriptHash = ''
    this.onStateChange?.('IDLE')
  }

  public cancelListening(): void {
    this.cancel()
  }

  public isListeningActive(): boolean {
    return this.isListening
  }

  public getIsListening(): boolean {
    return this.isListening
  }

  public isSpeaking(): boolean {
    return this.isSpeechActive
  }

  /**
   * Full cleanup — release mic and AudioContext resources
   */
  public destroy(): void {
    this.cancel()
    this.releaseAudioContext()
  }
}

export const speechRecognitionService = new SpeechRecognitionService()
