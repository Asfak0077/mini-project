import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, AlertTriangle, ShieldAlert,
  TrendingUp, RefreshCw, CheckCircle2, X,
  MapPin, Flame, Building2, Eye
} from 'lucide-react'
import AppShell from '../components/ds/AppShell'
import {
  fetchCampusIntelligenceSummary,
  smartEscalateComplaint,
  dismissAIRecommendation
} from '../services/aiIntelligenceService'
import { fetchComplaints } from '../services/complaintService'
import { Complaint, CampusIntelligenceSummary, AIRecommendationItem } from '../types/domain'
import { useToast } from '../components/shared/ToastNotification'
import ComplaintAIIntelligencePanel from '../components/shared/ComplaintAIIntelligencePanel'

const AIRecommendationsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'patterns' | 'opportunities'>('all')

  // Queries
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isFetching,
    refetch
  } = useQuery<CampusIntelligenceSummary>({
    queryKey: ['campus-intelligence-summary'],
    queryFn: () => fetchCampusIntelligenceSummary(),
    staleTime: 3 * 60 * 1000
  })

  // Smart Escalate Mutation
  const escalateMutation = useMutation({
    mutationFn: ({ complaintId, reason }: { complaintId: string; reason: string }) =>
      smartEscalateComplaint(complaintId, reason),
    onSuccess: (data: any) => {
      showToast('success', `✓ ${data?.ticketId || 'Complaint'} escalated to Urgent priority!`)
      queryClient.invalidateQueries({ queryKey: ['campus-intelligence-summary'] })
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
    },
    onError: (err: any) => {
      showToast('error', err?.message || 'Failed to escalate complaint.')
    }
  })

  // Dismiss Recommendation Mutation
  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissAIRecommendation(id),
    onSuccess: () => {
      showToast('info', 'Recommendation dismissed.')
      queryClient.invalidateQueries({ queryKey: ['campus-intelligence-summary'] })
    },
    onError: () => {
      showToast('error', 'Failed to dismiss recommendation.')
    }
  })

  const urgentActions = summary?.aiRecommendations?.urgentActions || []
  const patternAlerts = summary?.aiRecommendations?.patternAlerts || []
  const opportunities = summary?.aiRecommendations?.opportunities || []

  // Filtered lists
  const displayUrgent = activeFilter === 'all' || activeFilter === 'urgent'
  const displayPatterns = activeFilter === 'all' || activeFilter === 'patterns'
  const displayOpportunities = activeFilter === 'all' || activeFilter === 'opportunities'

  const totalRecommendations = urgentActions.length + patternAlerts.length + opportunities.length

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-[900] text-slate-900 dark:text-white tracking-tight">
                  Agent Recommendation Center
                </h1>
                <p className="text-[13.5px] text-slate-500 dark:text-slate-400 font-medium">
                  AI-driven actionable recommendations for SLA risks, recurring patterns, and operational bottlenecks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isFetching ? 'Updating...' : 'Refresh Telemetry'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all' as const, label: 'All Recommendations', count: totalRecommendations },
            { id: 'urgent' as const, label: 'Urgent Actions', count: urgentActions.length },
            { id: 'patterns' as const, label: 'Pattern Alerts', count: patternAlerts.length },
            { id: 'opportunities' as const, label: 'Opportunities', count: opportunities.length }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === pill.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#0E1520] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono ${
                  activeFilter === pill.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {totalRecommendations === 0 && !isSummaryLoading && (
          <div className="p-12 rounded-3xl bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-[800] text-slate-900 dark:text-white">All Systems Operational</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No active SLA breach risks or recurring issue spikes detected across campus departments.
            </p>
          </div>
        )}

        {/* ── SECTION 1: URGENT ACTIONS ── */}
        {displayUrgent && urgentActions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <h2 className="text-sm font-[900] uppercase tracking-wider">Urgent Actions</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                {urgentActions.length} Pending
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {urgentActions.map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0E1520] border border-red-500/30 dark:border-red-950/60 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative overflow-hidden group"
                >
                  <div className="space-y-2.5">
                    {/* Header: Priority & Confidence */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getPriorityBadge(rec.priority)}`}>
                        {rec.priority} PRIORITY
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        {rec.confidence}% Confidence
                      </span>
                    </div>

                    {/* Title & Reason */}
                    <div>
                      <h3 className="text-sm font-[800] text-slate-900 dark:text-white">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>

                    {/* AI Recommends Escalation Banner */}
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>AI recommends escalation</span>
                      </div>
                      <p className="text-[11.5px] font-semibold text-amber-800 dark:text-amber-300">
                        {rec.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {rec.complaintId && (
                        <button
                          onClick={() => setSelectedComplaintId(rec.complaintId || null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Complaint</span>
                        </button>
                      )}
                      {rec.complaintId && (
                        <button
                          disabled={escalateMutation.isPending}
                          onClick={() =>
                            rec.complaintId &&
                            escalateMutation.mutate({
                              complaintId: rec.complaintId,
                              reason: rec.reason
                            })
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer shadow-2xs"
                        >
                          Escalate Now
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => dismissMutation.mutate(rec.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold px-2 py-1 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 2: PATTERN ALERTS ── */}
        {displayPatterns && patternAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Flame className="w-4 h-4" />
              <h2 className="text-sm font-[900] uppercase tracking-wider">Pattern Alerts</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                {patternAlerts.length} Identified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patternAlerts.map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getPriorityBadge(rec.priority)}`}>
                        {rec.priority} PRIORITY
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {rec.confidence}% Conf.
                      </span>
                    </div>

                    <h3 className="text-sm font-[800] text-slate-900 dark:text-white">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {rec.reason}
                    </p>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800">
                      <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Recommended Action</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {rec.recommendedAction}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      {rec.complaintId ? (
                        <button
                          onClick={() => setSelectedComplaintId(rec.complaintId || null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 transition-colors cursor-pointer"
                        >
                          View Complaint
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {rec.location}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => dismissMutation.mutate(rec.id)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 3: OPPORTUNITIES ── */}
        {displayOpportunities && opportunities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
              <h2 className="text-sm font-[900] uppercase tracking-wider">Operational Opportunities</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                {opportunities.length} Actionable
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getPriorityBadge(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {rec.confidence}% Conf.
                      </span>
                    </div>

                    <h3 className="text-sm font-[800] text-slate-900 dark:text-white">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {rec.reason}
                    </p>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800">
                      <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Intervention</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {rec.recommendedAction}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {rec.department && (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        {rec.department}
                      </span>
                    )}

                    <button
                      onClick={() => dismissMutation.mutate(rec.id)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPLAINT INSPECTION MODAL ── */}
        <AnimatePresence>
          {selectedComplaintId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-2xl bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              >
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#121929]/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-base font-[800] text-slate-900 dark:text-white">
                      Complaint Intelligence Inspection
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedComplaintId(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                  <ComplaintAIIntelligencePanel
                    complaintId={selectedComplaintId}
                    defaultExpanded={true}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

export default AIRecommendationsPage
