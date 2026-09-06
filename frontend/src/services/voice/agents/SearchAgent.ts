/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Search Agent
 * 
 * Manages complaint searching and contextual list interactions:
 * - Search by keyword, location, or status
 * - Contextual follow-up ("open the first one", "show details of the second one")
 */

import { AgentResponse } from '../workflowTypes'

export class SearchAgent {
  public handleSearch(query: string): AgentResponse {
    const cleanQuery = query
      .replace(/^(search|find|look for|show me complaints about|search for)\s+/i, '')
      .trim()

    return {
      workflow: 'SEARCH_COMPLAINTS',
      workflowStatus: 'COMPLETED',
      currentStep: 'SHOWING_SEARCH_RESULTS',
      expectedInput: 'COMPLAINT_SELECTION',
      extractedData: { searchQuery: cleanQuery },
      missingFields: [],
      screenResponse: `Searching complaints for **"${cleanQuery}"**...`,
      voiceResponse: `Searching your complaints for ${cleanQuery}. You can say open the first one to view details.`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      quickActions: ['Open the first one', 'Show my pending complaints', 'Done']
    }
  }

  public resolveOrdinalSelection(
    text: string,
    recentResults: Array<{ id: string; title: string }>
  ): { targetId: string | null; targetTitle: string | null } {
    const lower = text.toLowerCase()

    if (/\b(first|number one|1st)\b/i.test(lower) && recentResults.length >= 1) {
      return { targetId: recentResults[0].id, targetTitle: recentResults[0].title }
    }
    if (/\b(second|number two|2nd)\b/i.test(lower) && recentResults.length >= 2) {
      return { targetId: recentResults[1].id, targetTitle: recentResults[1].title }
    }
    if (/\b(third|number three|3rd)\b/i.test(lower) && recentResults.length >= 3) {
      return { targetId: recentResults[2].id, targetTitle: recentResults[2].title }
    }

    // Direct match with ID in results
    const idMatch = text.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (idMatch) {
      const id = idMatch[0].toUpperCase()
      const found = recentResults.find(r => r.id.toUpperCase() === id)
      return { targetId: id, targetTitle: found?.title || null }
    }

    return { targetId: null, targetTitle: null }
  }
}

export const searchAgent = new SearchAgent()
