/**
 * CampusResolve Voice AI Agent — Conversation State Manager
 * Central state machine enforcing the 13 required lifecycle states.
 */

export type DetailedConversationState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'PROCESSING'
  | 'AWAITING_LOCATION'
  | 'AWAITING_COMPLAINT_DETAILS'
  | 'COMPLAINT_PREVIEW'
  | 'AWAITING_COMPLAINT_CONFIRMATION'
  | 'FEEDBACK_SELECTION'
  | 'FEEDBACK_EDITING'
  | 'AWAITING_FEEDBACK_CONFIRMATION'
  | 'SPEAKING'
  | 'ERROR'

export class ConversationManager {
  private currentState: DetailedConversationState = 'IDLE'
  private listeners: Array<(state: DetailedConversationState) => void> = []

  public getState(): DetailedConversationState {
    return this.currentState
  }

  public subscribe(listener: (state: DetailedConversationState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  public transition(newState: DetailedConversationState): boolean {
    if (this.currentState === newState) return true

    // Validate transitions
    // CANCEL_ACTION can always reset to IDLE
    if (newState === 'IDLE') {
      this.currentState = 'IDLE'
      this.notify()
      return true
    }

    this.currentState = newState
    this.notify()
    return true
  }

  public reset(): void {
    this.currentState = 'IDLE'
    this.notify()
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.currentState))
  }
}

export const conversationManager = new ConversationManager()
