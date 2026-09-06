/**
 * CampusResolve Voice-First AI Agent — State Machine
 * 
 * Central state machine governing voice agent lifecycle.
 * Defines all valid transitions and prevents stuck states.
 */

import { VoiceState, VoiceEvent } from './voiceTypes'

// ── Transition Table ────────────────────────────────────────────────────────
// Maps [currentState][event] → nextState
// Any transition not listed here is invalid and returns the current state.

type TransitionMap = Partial<Record<VoiceEvent, VoiceState>>
type StateTransitions = Record<VoiceState, TransitionMap>

const TRANSITIONS: StateTransitions = {
  IDLE: {
    START_LISTENING: 'MIC_PERMISSION_REQUEST',
    MIC_GRANTED: 'LISTENING',
    ERROR: 'ERROR',
    END: 'ENDED'
  },
  MIC_PERMISSION_REQUEST: {
    MIC_GRANTED: 'LISTENING',
    MIC_DENIED: 'ERROR',
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  LISTENING: {
    SPEECH_START: 'USER_SPEAKING',
    SILENCE_TIMEOUT: 'IDLE',         // No speech detected → back to idle
    TRANSCRIPT_READY: 'PROCESSING',  // Final transcript from short utterance
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE',
    PAUSE: 'PAUSED'
  },
  USER_SPEAKING: {
    SPEECH_END: 'SILENCE_DETECTED',
    TRANSCRIPT_READY: 'PROCESSING',
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  SILENCE_DETECTED: {
    SPEECH_START: 'USER_SPEAKING',     // User resumed speaking before timeout
    SILENCE_TIMEOUT: 'PROCESSING',     // Confirmed silence → auto-process
    TRANSCRIPT_READY: 'PROCESSING',
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  TRANSCRIBING: {
    TRANSCRIPT_READY: 'PROCESSING',
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  PROCESSING: {
    AI_RESPONSE_READY: 'AI_SPEAKING',
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  AI_THINKING: {
    AI_RESPONSE_READY: 'AI_SPEAKING',
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  EXECUTING_ACTION: {
    AI_RESPONSE_READY: 'AI_SPEAKING',
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  AWAITING_CONFIRMATION: {
    CONFIRM: 'EXECUTING_ACTION',
    CANCEL: 'IDLE',
    SPEECH_START: 'USER_SPEAKING',    // User can speak confirm/cancel
    TRANSCRIPT_READY: 'PROCESSING',   // Process spoken confirmation
    USER_INTERRUPT: 'LISTENING',
    ERROR: 'ERROR',
    END: 'ENDED'
  },
  AI_SPEAKING: {
    AI_SPEECH_END: 'LISTENING',       // In continuous mode, auto-listen next
    USER_INTERRUPT: 'LISTENING',      // BARGE-IN: user interrupts AI → listen
    SPEECH_START: 'LISTENING',        // BARGE-IN variant
    ERROR: 'ERROR',
    END: 'ENDED',
    CANCEL: 'IDLE',
    PAUSE: 'PAUSED'
  },
  PAUSED: {
    RESUME: 'LISTENING',
    START_LISTENING: 'LISTENING',
    END: 'ENDED',
    CANCEL: 'IDLE',
    ERROR: 'ERROR'
  },
  ERROR: {
    RECOVER: 'IDLE',
    START_LISTENING: 'LISTENING',
    END: 'ENDED',
    CANCEL: 'IDLE'
  },
  ENDED: {
    START_LISTENING: 'MIC_PERMISSION_REQUEST',
    MIC_GRANTED: 'LISTENING',
    RECOVER: 'IDLE'
  }
}

/**
 * Pure transition function.
 * Returns the next state given the current state and an event.
 * Returns current state if transition is invalid.
 */
export function voiceTransition(current: VoiceState, event: VoiceEvent): VoiceState {
  const stateMap = TRANSITIONS[current]
  if (!stateMap) return current
  const next = stateMap[event]
  return next ?? current
}

/**
 * Check if a transition is valid before executing it.
 */
export function isValidTransition(current: VoiceState, event: VoiceEvent): boolean {
  const stateMap = TRANSITIONS[current]
  if (!stateMap) return false
  return event in stateMap
}

/**
 * Get all valid events from a given state.
 */
export function getValidEvents(state: VoiceState): VoiceEvent[] {
  const stateMap = TRANSITIONS[state]
  if (!stateMap) return []
  return Object.keys(stateMap) as VoiceEvent[]
}

/**
 * Check if the state machine is in a "busy" state (processing, thinking, executing).
 */
export function isBusyState(state: VoiceState): boolean {
  return ['PROCESSING', 'AI_THINKING', 'EXECUTING_ACTION', 'TRANSCRIBING'].includes(state)
}

/**
 * Check if the state machine is in a state where user voice input is expected.
 */
export function isListeningState(state: VoiceState): boolean {
  return ['LISTENING', 'USER_SPEAKING', 'SILENCE_DETECTED', 'AWAITING_CONFIRMATION'].includes(state)
}

/**
 * Check if barge-in is possible from the current state.
 */
export function canBargeIn(state: VoiceState): boolean {
  return state === 'AI_SPEAKING'
}
