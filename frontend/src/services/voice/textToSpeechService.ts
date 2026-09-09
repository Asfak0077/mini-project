/**
 * CampusResolve Voice-First AI Agent — Text to Speech Service (TTS)
 * 
 * Native Web SpeechSynthesis with:
 * - Barge-in support (immediate interrupt when user speaks)
 * - Configurable speech speed (slow/normal/fast)
 * - Markdown/symbol cleaning for natural voice output
 * - Message ID tracking and play/pause/resume/stop/replay controls
 */

import { PlaybackState, SpeechSpeed } from './voiceTypes'

export class TextToSpeechService {
  private synth: SpeechSynthesis | null = null
  private voices: SpeechSynthesisVoice[] = []
  private selectedVoice: SpeechSynthesisVoice | null = null
  private isMuted = false
  private playbackState: PlaybackState = 'STOPPED'
  private activeMessageId: string | null = null
  private lastSpokenText = ''
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private speechRate: number = 1.0

  // Callbacks
  public onStart?: (messageId: string | null) => void
  public onEnd?: (messageId: string | null) => void
  public onPause?: () => void
  public onResume?: () => void
  public onError?: (error: any) => void
  public onStateChange?: (state: PlaybackState) => void
  public onBargeIn?: () => void  // Fired when speech is interrupted by user

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis
      this.loadVoices()

      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices()
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return
    this.voices = this.synth.getVoices()
    if (this.voices.length > 0) {
      // Prioritize natural sounding English voices
      this.selectedVoice =
        this.voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Google') ||
              v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Karen'))
        ) ||
        this.voices.find((v) => v.lang.startsWith('en')) ||
        this.voices[0]
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.synth)
  }

  public isSpeaking(): boolean {
    return this.playbackState === 'PLAYING'
  }

  // ── Speech Speed Control ──────────────────────────────────────────────────
  public setSpeed(speed: SpeechSpeed): void {
    switch (speed) {
      case 'slow':
        this.speechRate = 0.85
        break
      case 'fast':
        this.speechRate = 1.2
        break
      case 'normal':
      default:
        this.speechRate = 1.0
        break
    }
  }

  public getSpeed(): SpeechSpeed {
    if (this.speechRate <= 0.9) return 'slow'
    if (this.speechRate >= 1.15) return 'fast'
    return 'normal'
  }

  /**
   * Clean markdown tags, emojis, code snippets, and symbols for natural voice output.
   * Also handles complaint IDs (CR-001 → C R 001) and special formatting.
   */
  public cleanTextForSpeech(text: string): string {
    if (!text) return ''

    const cleaned = text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove images and links
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      // Remove bold and italics
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove markdown blockquotes and info boxes
      .replace(/^>\s+/gm, '')
      .replace(/>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/gi, '')
      // Remove bullet symbols
      .replace(/^\s*[-*+]\s+/gm, '')
      // Remove numbered lists (e.g. 1. )
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Remove table formatting
      .replace(/\|/g, ', ')
      // Remove checkmarks and special symbols
      .replace(/[✓✗✔✘☐☑]/g, '')
      // Remove emoji-like symbols (keep text emojis for context)
      .replace(/🏛️|🔒|⭐|❌/g, '')
      // Handle complaint IDs: CR-001 → C R 001
      .replace(/\b(CR|CMP)-(\d+)\b/gi, (_, prefix, num) => {
        return prefix.split('').join(' ') + ' ' + num
      })
      // Clean up info/disclaimer boxes
      .replace(/ℹ️\s*/g, '')
      .replace(/\*\*Disclaimer\*\*/g, 'Disclaimer')
      // Clean up multiple spaces and empty lines
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim()

    return cleaned
  }

  public speak(text: string, messageId: string | null = null): void {
    if (!this.synth || this.isMuted) return

    // Immediately cancel prior speech to prevent audio overlap
    this.stop()

    const cleaned = this.cleanTextForSpeech(text)
    if (!cleaned) return

    this.lastSpokenText = text
    this.activeMessageId = messageId

    const utterance = new SpeechSynthesisUtterance(cleaned)
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice
    }
    utterance.rate = this.speechRate
    utterance.pitch = 1.0

    utterance.onstart = () => {
      this.playbackState = 'PLAYING'
      this.onStateChange?.('PLAYING')
      this.onStart?.(this.activeMessageId)
    }

    utterance.onend = () => {
      this.playbackState = 'STOPPED'
      const completedMsgId = this.activeMessageId
      this.activeMessageId = null
      this.currentUtterance = null
      this.onStateChange?.('STOPPED')
      this.onEnd?.(completedMsgId)
    }

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        // Expected when user clicks stop or barge-in occurs
        this.playbackState = 'STOPPED'
        this.activeMessageId = null
        this.currentUtterance = null
        this.onStateChange?.('STOPPED')
        return
      }
      this.playbackState = 'STOPPED'
      this.activeMessageId = null
      this.currentUtterance = null
      this.onStateChange?.('STOPPED')
      this.onError?.(e)
    }

    this.currentUtterance = utterance
    this.synth.speak(utterance)
  }

  /**
   * BARGE-IN: Immediately interrupt speech because user started speaking.
   * This is the key voice-first interaction: user can interrupt AI at any time.
   */
  public interruptForBargeIn(): void {
    if (!this.synth || this.playbackState !== 'PLAYING') return
    try {
      this.synth.cancel()
    } catch {
      // ignore
    }
    this.playbackState = 'STOPPED'
    const prevMsgId = this.activeMessageId
    this.activeMessageId = null
    this.currentUtterance = null
    this.onStateChange?.('STOPPED')
    this.onBargeIn?.()
    if (prevMsgId) {
      this.onEnd?.(prevMsgId)
    }
  }

  public pause(): void {
    if (!this.synth || this.playbackState !== 'PLAYING') return
    try {
      this.synth.pause()
      this.playbackState = 'PAUSED'
      this.onStateChange?.('PAUSED')
      this.onPause?.()
    } catch {
      // ignore
    }
  }

  public resume(): void {
    if (!this.synth || this.playbackState !== 'PAUSED') return
    try {
      this.synth.resume()
      this.playbackState = 'PLAYING'
      this.onStateChange?.('PLAYING')
      this.onResume?.()
    } catch {
      // ignore
    }
  }

  public stop(): void {
    if (!this.synth) return
    try {
      this.synth.cancel()
    } catch {
      // ignore
    } finally {
      this.playbackState = 'STOPPED'
      const prevMsgId = this.activeMessageId
      this.activeMessageId = null
      this.currentUtterance = null
      this.onStateChange?.('STOPPED')
      if (prevMsgId) {
        this.onEnd?.(prevMsgId)
      }
    }
  }

  public replay(): void {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, this.activeMessageId)
    }
  }

  public mute(): void {
    this.isMuted = true
    this.stop()
  }

  public unmute(): void {
    this.isMuted = false
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stop()
    }
    return this.isMuted
  }

  public getIsMuted(): boolean {
    return this.isMuted
  }

  public getPlaybackState(): PlaybackState {
    return this.playbackState
  }

  public getActiveMessageId(): string | null {
    return this.activeMessageId
  }
}

export const textToSpeechService = new TextToSpeechService()
