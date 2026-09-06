/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Status Agent
 * 
 * Manages complaint status inquiries, retrieves details, and handles
 * follow-up contextual questions like "when was it created", "who is assigned".
 */

import { AgentResponse } from '../workflowTypes'

export class StatusAgent {
  public handleStatusInquiry(complaintId?: string | null, utterance?: string): AgentResponse {
    const raw = (utterance || '').trim()
    const idMatch = raw.match(/\b(CR-\d+|CMP-\d+)\b/i)
    const targetId = idMatch ? idMatch[0].toUpperCase() : (complaintId ? complaintId.toUpperCase() : null)

    if (targetId) {
      return {
        workflow: 'CHECK_STATUS',
        workflowStatus: 'COMPLETED',
        currentStep: 'SHOWING_STATUS',
        expectedInput: 'GENERAL',
        extractedData: { complaintId: targetId },
        missingFields: [],
        screenResponse: `Checking status for complaint **${targetId}**...`,
        voiceResponse: `Checking status for complaint ${targetId}.`,
        shouldListenAgain: true,
        requiresConfirmation: false,
        action: {
          type: 'VIEW_COMPLAINT',
          payload: { complaintId: targetId }
        },
        quickActions: [`Status of ${targetId}`, 'Show my pending complaints', 'Show history']
      }
    }

    return {
      workflow: 'CHECK_STATUS',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_COMPLAINT_ID',
      expectedInput: 'COMPLAINT_SELECTION',
      extractedData: {},
      missingFields: ['complaintId'],
      screenResponse: 'Which complaint status would you like to check? You can provide a complaint ID like CR-001.',
      voiceResponse: 'Which complaint would you like to check? Please provide the complaint ID.',
      shouldListenAgain: true,
      requiresConfirmation: false,
      quickActions: ['Show my pending complaints', 'Show complaint history', 'Cancel']
    }
  }

  public handleFollowUp(question: string, currentComplaintId: string | null): AgentResponse {
    if (!currentComplaintId) {
      return {
        workflow: 'CHECK_STATUS',
        workflowStatus: 'COLLECTING_INFORMATION',
        currentStep: 'AWAITING_COMPLAINT_ID',
        expectedInput: 'COMPLAINT_SELECTION',
        extractedData: {},
        missingFields: ['complaintId'],
        screenResponse: 'Which complaint are you referring to?',
        voiceResponse: 'Which complaint are you referring to?',
        shouldListenAgain: true,
        requiresConfirmation: false
      }
    }

    return {
      workflow: 'CHECK_STATUS',
      workflowStatus: 'COMPLETED',
      currentStep: 'SHOWING_STATUS',
      expectedInput: 'GENERAL',
      extractedData: { complaintId: currentComplaintId },
      missingFields: [],
      screenResponse: `Fetching details for **${currentComplaintId}**...`,
      voiceResponse: `Fetching details for ${currentComplaintId}.`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      action: {
        type: 'VIEW_COMPLAINT',
        payload: { complaintId: currentComplaintId }
      }
    }
  }
}

export const statusAgent = new StatusAgent()
