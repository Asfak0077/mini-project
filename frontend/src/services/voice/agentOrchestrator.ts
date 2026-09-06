/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Central Agent Orchestrator
 * 
 * Orchestrates multi-turn voice conversations:
 * 1. Persistent Active Workflow management
 * 2. Strict Workflow Priority Routing (Workflow input > Intent detection)
 * 3. Session memory across turns
 * 4. Interruption, Cancellation, Pause & Resume
 * 5. Delegation to specialized agents (ComplaintAgent, FeedbackAgent, StatusAgent, SearchAgent, NavigationAgent)
 */

import {
  ActiveWorkflow,
  AgentResponse,
  AgentSessionMemory,
  ComplaintDraftData,
  FeedbackDraftData,
  ExpectedInputType
} from './workflowTypes'
import { complaintAgent } from './agents/ComplaintAgent'
import { feedbackAgent } from './agents/FeedbackAgent'
import { statusAgent } from './agents/StatusAgent'
import { searchAgent } from './agents/SearchAgent'
import { navigationAgent } from './agents/NavigationAgent'

export class AgentOrchestrator {
  private memory: AgentSessionMemory = {
    voiceSessionId: `vses-${Date.now()}`,
    activeWorkflow: null,
    pausedWorkflow: null,
    currentComplaintDraft: null,
    currentFeedbackDraft: null,
    currentSelectedComplaint: null,
    lastAgentQuestion: '',
    lastExpectedInput: null,
    recentConversation: [],
    lastIntent: null,
    pendingAction: null
  }

  // List of recent complaints shown in UI for ordinal resolution ("first one")
  private recentResults: Array<{ id: string; title: string }> = []

  // ── Session Management ────────────────────────────────────────────────────
  public getMemory(): AgentSessionMemory {
    return { ...this.memory }
  }

  public getActiveWorkflow(): ActiveWorkflow | null {
    return this.memory.activeWorkflow
  }

  public setActiveWorkflow(workflow: ActiveWorkflow | null): void {
    this.memory.activeWorkflow = workflow
    if (workflow) {
      this.memory.lastExpectedInput = workflow.expectedInput
      this.memory.lastAgentQuestion = workflow.lastQuestion
    }
  }

  public setRecentResults(results: Array<{ id: string; title: string }>): void {
    this.recentResults = results
  }

  public resetSession(): void {
    this.memory = {
      voiceSessionId: `vses-${Date.now()}`,
      activeWorkflow: null,
      pausedWorkflow: null,
      currentComplaintDraft: null,
      currentFeedbackDraft: null,
      currentSelectedComplaint: null,
      lastAgentQuestion: '',
      lastExpectedInput: null,
      recentConversation: [],
      lastIntent: null,
      pendingAction: null
    }
  }

  /**
   * Main Entrypoint: Process incoming voice or text message
   * 
   * Strict Priority Order:
   * 1. Voice Navigation
   * 2. Global Cancellation / Interruption
   * 3. Workflow Resume
   * 4. Active Workflow Input (DO NOT run general intent detection!)
   * 5. Workflow Switch Detection
   * 6. Intent Routing to specialized agents
   */
  public async processMessage(
    message: string,
    onExecuteAction?: (action: { type: string; payload: any }) => Promise<any>
  ): Promise<AgentResponse> {
    const raw = message.trim()
    const lower = raw.toLowerCase()

    // Record turn in history
    this.memory.recentConversation.push({ role: 'user', text: raw, timestamp: Date.now() })

    // ── 1. Spoken Voice Navigation ──────────────────────────────────────────
    const navRoute = navigationAgent.resolveNavigation(raw)
    if (navRoute && !this.memory.activeWorkflow) {
      const navRes = navigationAgent.handleNavigation(navRoute)
      this.recordAgentResponse(navRes)
      return navRes
    }

    // ── 2. Global Cancellation ──────────────────────────────────────────────
    if (/^(cancel|stop|nevermind|never mind|abort|exit|close|forget it)$/i.test(lower)) {
      if (this.memory.activeWorkflow) {
        let cancelRes: AgentResponse
        if (this.memory.activeWorkflow.type === 'CREATE_COMPLAINT') {
          cancelRes = complaintAgent.cancelWorkflow(this.memory.activeWorkflow)
        } else {
          cancelRes = feedbackAgent.cancelWorkflow()
        }
        this.memory.activeWorkflow = null
        this.memory.currentComplaintDraft = null
        this.memory.currentFeedbackDraft = null
        this.recordAgentResponse(cancelRes)
        return cancelRes
      }
      const genericCancel: AgentResponse = {
        workflow: null,
        workflowStatus: 'IDLE',
        currentStep: null,
        expectedInput: null,
        extractedData: {},
        missingFields: [],
        screenResponse: 'Cancelled. How can I help you?',
        voiceResponse: 'Cancelled. How else can I help you?',
        shouldListenAgain: true,
        requiresConfirmation: false
      }
      this.recordAgentResponse(genericCancel)
      return genericCancel
    }

    // ── 3. Workflow Pause & Resume ──────────────────────────────────────────
    if (/^(pause|hold on|wait a second|wait a minute)$/i.test(lower) && this.memory.activeWorkflow) {
      this.memory.pausedWorkflow = { ...this.memory.activeWorkflow, status: 'PAUSED' }
      this.memory.activeWorkflow = null
      const pauseRes: AgentResponse = {
        workflow: null,
        workflowStatus: 'PAUSED',
        currentStep: null,
        expectedInput: null,
        extractedData: {},
        missingFields: [],
        screenResponse: 'Workflow paused. Say **"continue"** or **"resume"** whenever you are ready.',
        voiceResponse: 'Workflow paused. Say continue whenever you are ready.',
        shouldListenAgain: true,
        requiresConfirmation: false
      }
      this.recordAgentResponse(pauseRes)
      return pauseRes
    }

    if (/^(continue|resume|continue my complaint|resume complaint|go back to complaint)$/i.test(lower)) {
      if (this.memory.pausedWorkflow) {
        const paused = this.memory.pausedWorkflow
        this.memory.pausedWorkflow = null
        let resumeRes: AgentResponse
        if (paused.type === 'CREATE_COMPLAINT') {
          resumeRes = complaintAgent.resumeWorkflow(paused)
        } else {
          resumeRes = feedbackAgent.startFeedbackWorkflow(
            paused.collectedData.complaintId,
            paused.collectedData.complaintTitle
          )
        }
        this.memory.activeWorkflow = paused
        this.recordAgentResponse(resumeRes)
        return resumeRes
      }
    }

    // ── 4. Active Workflow Priority Handling ────────────────────────────────
    // When an active workflow exists, the incoming message MUST be routed to it first!
    if (this.memory.activeWorkflow && this.memory.activeWorkflow.status !== 'COMPLETED' && this.memory.activeWorkflow.status !== 'CANCELLED') {
      // Check for explicit workflow switch (e.g. user asks "Actually show my pending complaints")
      if (/^(actually show|show my pending|check pending|what is my pending)/i.test(lower)) {
        // Pause active workflow temporarily
        this.memory.pausedWorkflow = { ...this.memory.activeWorkflow, status: 'PAUSED' }
        this.memory.activeWorkflow = null
        const switchRes: AgentResponse = {
          workflow: 'CHECK_STATUS',
          workflowStatus: 'COMPLETED',
          currentStep: 'SHOWING_PENDING',
          expectedInput: null,
          extractedData: {},
          missingFields: [],
          screenResponse: 'Pausing your complaint draft to show pending complaints. Say **"continue"** anytime to resume.',
          voiceResponse: 'Sure, I paused your complaint creation. Let me show your pending complaints. Say continue whenever you are ready to resume.',
          shouldListenAgain: true,
          requiresConfirmation: false,
          action: {
            type: 'VIEW_COMPLAINT',
            payload: { viewPending: true }
          }
        }
        this.recordAgentResponse(switchRes)
        return switchRes
      }

      // Route directly to active workflow agent!
      if (this.memory.activeWorkflow.type === 'CREATE_COMPLAINT') {
        const compRes = await complaintAgent.handleWorkflowInput(raw, this.memory.activeWorkflow)
        this.applyWorkflowResult(compRes)

        // If action is CREATE_COMPLAINT and execute callback provided
        if (compRes.action?.type === 'CREATE_COMPLAINT' && onExecuteAction) {
          try {
            const execRes = await onExecuteAction({
              type: 'CREATE_COMPLAINT',
              payload: compRes.complaintDraft
            })
            if (execRes?.complaintId) {
              compRes.voiceResponse = `Your complaint has been created successfully. Your complaint ID is ${execRes.complaintId}. Is there anything else I can help with?`
              compRes.screenResponse = `✅ **Complaint Created Successfully!**\n\nYour complaint ID is **${execRes.complaintId}**. The maintenance team has been notified.`
            }
          } catch (err: any) {
            console.error('[AgentOrchestrator] Complaint execution error:', err)
          }
        }

        this.recordAgentResponse(compRes)
        return compRes
      } else if (this.memory.activeWorkflow.type === 'SUBMIT_FEEDBACK') {
        const feedRes = await feedbackAgent.handleWorkflowInput(raw, this.memory.activeWorkflow)
        this.applyWorkflowResult(feedRes)

        if (feedRes.action?.type === 'SUBMIT_FEEDBACK' && onExecuteAction) {
          try {
            await onExecuteAction({
              type: 'SUBMIT_FEEDBACK',
              payload: feedRes.feedbackDraft
            })
          } catch (err: any) {
            console.error('[AgentOrchestrator] Feedback execution error:', err)
          }
        }

        this.recordAgentResponse(feedRes)
        return feedRes
      }
    }

    // ── 5. Ordinal Selection ("open the first one", "the second one") ────────
    const ordinal = searchAgent.resolveOrdinalSelection(raw, this.recentResults)
    if (ordinal.targetId) {
      const ordinalRes: AgentResponse = {
        workflow: 'CHECK_STATUS',
        workflowStatus: 'COMPLETED',
        currentStep: 'SHOWING_STATUS',
        expectedInput: null,
        extractedData: { complaintId: ordinal.targetId },
        missingFields: [],
        screenResponse: `Opening complaint **${ordinal.targetId}**${ordinal.targetTitle ? ` (*${ordinal.targetTitle}*)` : ''}...`,
        voiceResponse: `Opening complaint ${ordinal.targetId}.`,
        shouldListenAgain: true,
        requiresConfirmation: false,
        action: {
          type: 'VIEW_COMPLAINT',
          payload: { complaintId: ordinal.targetId }
        }
      }
      this.recordAgentResponse(ordinalRes)
      return ordinalRes
    }

    // ── 6. Intent Routing (No Active Workflow) ──────────────────────────────

    // 6A. CREATE COMPLAINT Intent
    if (
      /^(create a complaint|create complaint|new complaint|report an issue|file a complaint|register complaint|lodge a complaint)/i.test(lower) ||
      (/\b(is not working|broken|leaking|damaged|flickering|not cooling|dirty|jammed)\b/i.test(lower) && !/status|history|search/i.test(lower))
    ) {
      const compRes = complaintAgent.startComplaintWorkflow(raw)
      this.applyWorkflowResult(compRes)
      this.recordAgentResponse(compRes)
      return compRes
    }

    // 6B. SUBMIT FEEDBACK Intent
    if (/^(give feedback|leave feedback|rate complaint|feedback|submit feedback)/i.test(lower)) {
      const complaintIdMatch = raw.match(/\b(CR-\d+|CMP-\d+)\b/i)
      const feedRes = feedbackAgent.startFeedbackWorkflow(
        complaintIdMatch ? complaintIdMatch[0].toUpperCase() : null,
        null,
        raw
      )
      this.applyWorkflowResult(feedRes)
      this.recordAgentResponse(feedRes)
      return feedRes
    }

    // 6C. STATUS Intent
    if (/\b(status of|check status|track complaint|what is the status|my complaint status)\b/i.test(lower)) {
      const statRes = statusAgent.handleStatusInquiry(null, raw)
      this.recordAgentResponse(statRes)
      return statRes
    }

    // 6D. SEARCH Intent
    if (/^(search|find|show me complaints about|search complaints)/i.test(lower)) {
      const searchRes = searchAgent.handleSearch(raw)
      this.recordAgentResponse(searchRes)
      return searchRes
    }

    // ── 7. General Fallback (Let Backend AI / RAG handle) ────────────────────
    const generalRes: AgentResponse = {
      workflow: null,
      workflowStatus: 'IDLE',
      currentStep: null,
      expectedInput: null,
      extractedData: { query: raw },
      missingFields: [],
      screenResponse: '',
      voiceResponse: '',
      shouldListenAgain: true,
      requiresConfirmation: false
    }
    return generalRes
  }

  private applyWorkflowResult(res: AgentResponse): void {
    if (res.action?.payload?.activeWorkflow) {
      this.memory.activeWorkflow = res.action.payload.activeWorkflow
      this.memory.lastExpectedInput = res.expectedInput
      this.memory.lastAgentQuestion = res.screenResponse
    } else if (res.workflowStatus === 'COMPLETED' || res.workflowStatus === 'CANCELLED') {
      this.memory.activeWorkflow = null
      this.memory.lastExpectedInput = null
    }

    if (res.complaintDraft) {
      this.memory.currentComplaintDraft = res.complaintDraft
    }
    if (res.feedbackDraft) {
      this.memory.currentFeedbackDraft = res.feedbackDraft
    }
  }

  private recordAgentResponse(res: AgentResponse): void {
    if (res.screenResponse) {
      this.memory.recentConversation.push({
        role: 'agent',
        text: res.screenResponse,
        timestamp: Date.now()
      })
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator()
