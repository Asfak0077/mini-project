import apiClient from './apiClient'
import {
  ComplaintAIIntelligence,
  CampusIntelligenceSummary
} from '../types/domain'

/**
 * Fetches AI intelligence for a single complaint.
 * Returned data is role-filtered by the backend.
 */
export const fetchComplaintAIIntelligence = async (
  complaintId: string
): Promise<ComplaintAIIntelligence | null> => {
  if (!complaintId) return null
  try {
    const { data } = await apiClient.get(`/ai-intelligence/complaints/${complaintId}`)
    return data?.data ?? data ?? null
  } catch (error: any) {
    console.warn(`[AI Intelligence] Failed to fetch for complaint ${complaintId}:`, error?.message)
    return null
  }
}

/**
 * Manually refresh AI intelligence for a complaint (Faculty, Admin, or Complaint Owner).
 */
export const refreshComplaintAIIntelligence = async (
  complaintId: string
): Promise<ComplaintAIIntelligence | null> => {
  if (!complaintId) return null
  try {
    const { data } = await apiClient.post(`/ai-intelligence/complaints/${complaintId}/refresh`)
    return data?.data ?? data ?? null
  } catch (error: any) {
    console.error(`[AI Intelligence] Failed to refresh for complaint ${complaintId}:`, error?.message)
    throw new Error(error?.response?.data?.message || 'Failed to refresh AI analysis.')
  }
}

/**
 * Fetches high-level Campus Intelligence summary for Admin Command Center.
 */
export const fetchCampusIntelligenceSummary = async (force: boolean = false): Promise<CampusIntelligenceSummary> => {
  try {
    const { data } = await apiClient.get(`/ai-intelligence/admin/campus-summary${force ? '?force=true' : ''}`)
    return data?.data ?? {
      metrics: {
        highSlaRiskComplaints: 0,
        recurringIssuesCount: 0,
        highRiskLocationsCount: 0,
        criticalHealthCount: 0,
        averageComplaintHealth: 85,
        mostFrequentIssue: 'None detected',
        mostProblematicLocation: 'Campus Wide'
      },
      hotspots: [],
      recurringIssues: [],
      highRiskComplaints: []
    }
  } catch (error: any) {
    console.error('[AI Intelligence] Failed to fetch campus summary:', error?.message)
    throw new Error(error?.response?.data?.message || 'Failed to load campus intelligence summary.')
  }
}

/**
 * Executes smart escalation on a complaint based on AI recommendation.
 */
export const smartEscalateComplaint = async (complaintId: string, reason?: string) => {
  if (!complaintId) throw new Error('Complaint ID is required')
  try {
    const { data } = await apiClient.post(`/ai-intelligence/complaints/${complaintId}/smart-escalate`, {
      reason: reason || 'AI recommended escalation due to SLA risk'
    })
    return data?.data ?? data
  } catch (error: any) {
    console.error(`[AI Intelligence] Failed to escalate complaint ${complaintId}:`, error?.message)
    throw new Error(error?.response?.data?.message || 'Failed to escalate complaint.')
  }
}

/**
 * Fetches structured AI Recommendations for the Recommendation Center.
 */
export const fetchAIRecommendations = async () => {
  try {
    const { data } = await apiClient.get('/ai-intelligence/admin/recommendations')
    return data?.data ?? { urgentActions: [], patternAlerts: [], opportunities: [] }
  } catch (error: any) {
    console.error('[AI Intelligence] Failed to fetch recommendations:', error?.message)
    throw new Error(error?.response?.data?.message || 'Failed to load AI recommendations.')
  }
}

/**
 * Dismisses a recommendation from the Recommendation Center.
 */
export const dismissAIRecommendation = async (recommendationId: string) => {
  try {
    const { data } = await apiClient.post(`/ai-intelligence/admin/recommendations/${recommendationId}/dismiss`)
    return data
  } catch (error: any) {
    console.error(`[AI Intelligence] Failed to dismiss recommendation ${recommendationId}:`, error?.message)
    throw new Error(error?.response?.data?.message || 'Failed to dismiss recommendation.')
  }
}

