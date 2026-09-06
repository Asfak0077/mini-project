import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Sparkles, AlertTriangle, Flame, MapPin, Activity,
  TrendingUp, TrendingDown, Minus, ArrowRight, ShieldAlert,
  Cpu, CheckCircle2, RefreshCw, X, ChevronRight, Filter,
  Search, FileText, BarChart3, HelpCircle, Layers, Check,
  ExternalLink, ShieldCheck, Clock, Gauge, Compass, AlertCircle,
  Building2, Calendar, Eye
} from 'lucide-react'
import { fetchCampusIntelligenceSummary, smartEscalateComplaint } from '../../services/aiIntelligenceService'
import { CampusIntelligenceSummary, CampusHotspot, Complaint } from '../../types/domain'
import ComplaintAIIntelligencePanel from '../shared/ComplaintAIIntelligencePanel'
import { useToast } from '../shared/ToastNotification'

interface AICampusCommandCenterProps {
  complaints?: Complaint[]
  onSelectComplaint?: (complaintId: string) => void
  onFilterCategory?: (category: string) => void
}

export const AICampusCommandCenter: React.FC<AICampusCommandCenterProps> = ({
  complaints = [],
  onSelectComplaint,
  onFilterCategory
}) => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Active section filter: 'all' or section 1-9
  const [activeSection, setActiveSection] = useState<string>('all')
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>('')
  const [complaintSearch, setComplaintSearch] = useState<string>('')
  const [showHealthScoreModal, setShowHealthScoreModal] = useState<boolean>(false)

  // Recurring Issue Filters
  const [recurringDateFilter, setRecurringDateFilter] = useState<'7' | '30' | '90'>('30')
  const [recurringDeptFilter, setRecurringDeptFilter] = useState<string>('all')
  const [recurringCatFilter, setRecurringCatFilter] = useState<string>('all')
  const [recurringLocFilter, setRecurringLocFilter] = useState<string>('')

  // Hotspot modal / drilldown
  const [activeHotspotModal, setActiveHotspotModal] = useState<CampusHotspot | null>(null)

  // Fetch summary telemetry
  const { data: summary, isLoading, isError, isFetching } = useQuery<CampusIntelligenceSummary>({
    queryKey: ['campus-intelligence-summary'],
    queryFn: () => fetchCampusIntelligenceSummary(false),
    staleTime: 3 * 60 * 1000
  })

  // Force Refresh Telemetry Mutation
  const refreshMutation = useMutation({
    mutationFn: () => fetchCampusIntelligenceSummary(true),
    onSuccess: (freshData) => {
      queryClient.setQueryData(['campus-intelligence-summary'], freshData)
      queryClient.invalidateQueries({ queryKey: ['campus-intelligence-summary'] })
      queryClient.invalidateQueries({ queryKey: ['ai-intelligence'] })
      showToast('success', 'Operational intelligence refreshed with latest real-time telemetry.')
    },
    onError: () => {
      showToast('error', 'Telemetry refresh encountered an error. Showing cached analysis.')
    }
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
      showToast('error', err?.message || 'Failed to execute smart escalation.')
    }
  })

  // Default selected complaint
  useEffect(() => {
    if (!selectedComplaintId && complaints.length > 0) {
      const highRisk = summary?.highRiskComplaints?.[0]
      if (highRisk?.complaintId) {
        setSelectedComplaintId(highRisk.complaintId)
      } else {
        setSelectedComplaintId(complaints[0].id)
      }
    }
  }, [complaints, summary, selectedComplaintId])

  const metrics = summary?.metrics || {
    highSlaRiskComplaints: 0,
    recurringIssuesCount: 0,
    highRiskLocationsCount: 0,
    criticalHealthCount: 0,
    averageComplaintHealth: 85,
    mostFrequentIssue: 'None detected',
    mostProblematicLocation: 'Campus Wide',
    totalComplaintsCount: complaints.length,
    resolvedComplaintsCount: complaints.filter(c => c.status === 'Resolved').length,
    activeComplaintsCount: complaints.filter(c => c.status !== 'Resolved').length
  }

  const selectedComplaint = complaints.find(
    (c) => c.id === selectedComplaintId || c.complaintId === selectedComplaintId
  )

  const handlePickComplaint = (id: string) => {
    setSelectedComplaintId(id)
    onSelectComplaint?.(id)
  }

  // Filtered recurring issues based on admin filters
  const filteredRecurringIssues = useMemo(() => {
    if (!summary?.recurringIssues) return []
    return summary.recurringIssues.filter((item) => {
      if (recurringDeptFilter !== 'all') {
        const matchingComplaint = complaints.find(c => c.id === item.complaintId || c.complaintId === item.ticketId)
        if (matchingComplaint && matchingComplaint.department !== recurringDeptFilter) {
          return false
        }
      }
      if (recurringCatFilter !== 'all') {
        const matchingComplaint = complaints.find(c => c.id === item.complaintId || c.complaintId === item.ticketId)
        if (matchingComplaint && matchingComplaint.category !== recurringCatFilter) {
          return false
        }
      }
      if (recurringLocFilter) {
        if (!item.location.toLowerCase().includes(recurringLocFilter.toLowerCase())) {
          return false
        }
      }
      return true
    })
  }, [summary?.recurringIssues, complaints, recurringDeptFilter, recurringCatFilter, recurringLocFilter])

  // Extract unique departments & categories for dropdowns
  const departments = useMemo(() => {
    const set = new Set<string>()
    complaints.forEach(c => { if (c.department) set.add(c.department) })
    return Array.from(set)
  }, [complaints])

  const categories = useMemo(() => {
    const set = new Set<string>()
    complaints.forEach(c => { if (c.category) set.add(c.category) })
    return Array.from(set)
  }, [complaints])

  // Trend Badge Helper
  const renderTrendBadge = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case 'increasing':
      case 'needs attention':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )
      case 'decreasing':
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <TrendingDown className="w-3 h-3" /> {trend}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-600 dark:text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full">
            <Minus className="w-3 h-3" /> Stable
          </span>
        )
    }
  }

  // Hotspot severity indicator
  const getHotspotDot = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'text-rose-500'
      case 'medium': return 'text-amber-500'
      default: return 'text-emerald-500'
    }
  }

  const isRefreshing = refreshMutation.isPending || isFetching

  const sectionsNav = [
    { id: 'all', label: 'Overview' },
    { id: 'sec-1', label: '1. Campus Health' },
    { id: 'sec-2', label: '2. Health Score' },
    { id: 'sec-3', label: '3. SLA Breach Risk' },
    { id: 'sec-4', label: '4. Root Cause Insight' },
    { id: 'sec-5', label: '5. Recurring Patterns' },
    { id: 'sec-6', label: '6. Hotspots' },
    { id: 'sec-7', label: '7. Resolution Prediction' },
    { id: 'sec-8', label: '8. Department Trends' },
    { id: 'sec-9', label: '9. Recommended Actions' },
  ]

  const shouldShow = (secId: string) => activeSection === 'all' || activeSection === secId

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-[800] text-[var(--text-primary)] tracking-tight">
              AI Campus Intelligence Command Center
            </h2>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1 font-medium">
            Autonomous multi-agent telemetry tracking root causes, recurring infrastructure failures, and predictive SLAs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/recommendations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>AI Recommendations Center</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          <button
            onClick={() => refreshMutation.mutate()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{isRefreshing ? 'Recalculating...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* ── Section Quick-Navigation Pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {sectionsNav.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeSection === s.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1520] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: OVERALL CAMPUS HEALTH
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-1') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>1. Overall Campus Health</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {summary?.overallCampusHealth?.status || 'Healthy'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Holistic index computed across SLA adherence, unresolved ticket backlog, and recurrence rates.
                </p>
              </div>
            </div>

            <div className="text-right sm:self-auto self-start">
              <span className="text-2xl sm:text-3xl font-[900] text-emerald-600 dark:text-emerald-400">
                {summary?.overallCampusHealth?.score ?? metrics.averageComplaintHealth}/100
              </span>
              <span className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                Overall Index
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">SLA Compliance</span>
              <span className="text-xl font-[900] text-slate-900 dark:text-white mt-1 block">
                {summary?.overallCampusHealth?.breakdown?.slaComplianceRate ?? 85}%
              </span>
              <span className="text-[10.5px] text-emerald-600 font-semibold">Grievances resolved on time</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Workload</span>
              <span className="text-xl font-[900] text-slate-900 dark:text-white mt-1 block">
                {summary?.overallCampusHealth?.breakdown?.activeWorkload ?? metrics.activeComplaintsCount}
              </span>
              <span className="text-[10.5px] text-blue-600 font-semibold">Under active investigation</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">High SLA Risk</span>
              <span className="text-xl font-[900] text-red-600 mt-1 block">
                {metrics.highSlaRiskComplaints}
              </span>
              <span className="text-[10.5px] text-red-500 font-semibold">Approaching SLA breach</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recurring Clusters</span>
              <span className="text-xl font-[900] text-purple-600 mt-1 block">
                {metrics.recurringIssuesCount}
              </span>
              <span className="text-[10.5px] text-purple-500 font-semibold">Patterned equipment faults</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#121929] p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 font-medium">
            <strong>Campus Summary:</strong> {summary?.overallCampusHealth?.reason || 'Campus operations are running smoothly with high department response times.'}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: COMPLAINT HEALTH SCORE (INTERACTIVE INSPECTOR)
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-2') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>2. Complaint Health Score (0–100)</span>
                  <button
                    onClick={() => setShowHealthScoreModal(true)}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Why this score?
                  </button>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Transparent 7-factor scoring analyzing SLA risk, response cadence, and equipment recurrence.
                </p>
              </div>
            </div>

            {/* Quick Complaint Picker */}
            {complaints.length > 0 && (
              <div className="w-full sm:w-80">
                <select
                  value={selectedComplaintId}
                  onChange={(e) => handlePickComplaint(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select complaint to inspect --</option>
                  {complaints.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.complaintId || c.id.slice(-6)}] {c.title.slice(0, 30)}... ({c.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Complaint AI Panel with live telemetry */}
          {selectedComplaintId ? (
            <ComplaintAIIntelligencePanel
              complaintId={selectedComplaintId}
              ticketNumber={selectedComplaint?.complaintId || selectedComplaint?.ticketNumber}
              complaint={selectedComplaint}
              defaultExpanded={true}
              onSelectRelatedComplaint={(relId) => handlePickComplaint(relId)}
            />
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              Select a complaint to inspect its real-time health score calculation and telemetry.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: SLA BREACH PREDICTION (ACTIVE RISK VS RESOLVED HISTORICAL)
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-3') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>3. SLA Breach Prediction</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                    {metrics.highSlaRiskComplaints} Active At-Risk
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Real-time SLA tracking separating active at-risk complaints from resolved historical cases.
                </p>
              </div>
            </div>

            <span className="text-[10.5px] font-bold text-slate-400 italic">
              AI recommendation and confidence estimate — not a confirmed fact.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Active Complaints at SLA Risk */}
            <div className="space-y-3">
              <h4 className="text-xs font-[800] uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Active Complaints at High SLA Risk
              </h4>

              {summary?.highRiskComplaints && summary.highRiskComplaints.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.highRiskComplaints.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-red-50/40 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 space-y-2 hover:border-red-500/60 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {item.ticketId}: {item.title}
                        </span>
                        <span className="text-[10px] font-extrabold text-red-600 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/30">
                          {item.breachProbability}% Breach Prob ({item.riskLevel})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{item.department} • Priority: <strong>{item.priority}</strong></span>
                        <span className="text-red-600 font-bold">{item.timeRemaining}</span>
                      </div>

                      {item.smartEscalation?.shouldEscalate && (
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                          <span className="truncate"><strong>AI recommends escalation:</strong> {item.smartEscalation.reason}</span>
                          <button
                            disabled={escalateMutation.isPending}
                            onClick={() =>
                              escalateMutation.mutate({
                                complaintId: item.complaintId,
                                reason: item.smartEscalation?.reason || 'High SLA Risk'
                              })
                            }
                            className="px-2 py-1 rounded bg-red-600 text-white font-bold text-[10px] shrink-0 hover:bg-red-700 cursor-pointer"
                          >
                            Escalate Now
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 text-center font-medium">
                  ✓ All active grievances are comfortably within target SLA response limits.
                </div>
              )}
            </div>

            {/* Right: Resolved Complaints (Historical Analysis, Not Active Risk) */}
            <div className="space-y-3">
              <h4 className="text-xs font-[800] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolved Complaints (Historical SLA Audit)
              </h4>

              {summary?.resolvedHistoricalSla && summary.resolvedHistoricalSla.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.resolvedHistoricalSla.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {item.ticketId}: {item.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.isWithinSla
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {item.outcome}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{item.department} ({item.category})</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Actual: {item.actualResolutionHours}h / Target: {item.targetSlaHours}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center font-medium">
                  Historical completion cases will display here once complaints are resolved.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: AI ROOT CAUSE INSIGHT
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-4') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>4. AI Root Cause Insight</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    Pattern Synthesis
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Identifies primary underlying physical and operational failure causes across campus facilities.
                </p>
              </div>
            </div>

            <span className="text-[10.5px] font-bold text-slate-400 italic">
              AI recommendation and confidence estimate — not a confirmed fact.
            </span>
          </div>

          {summary?.topRootCauses && summary.topRootCauses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.topRootCauses.map((rc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rc.category}
                      </span>
                      <span className="text-xs font-extrabold text-purple-600">
                        {rc.confidence}% Confidence
                      </span>
                    </div>

                    <h4 className="text-xs font-[800] text-slate-900 dark:text-white mt-2">
                      {rc.cause}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Frequency: <strong>{rc.frequency} incidents</strong></span>
                    <span className="text-blue-600 font-semibold">Technical action suggested</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center font-medium">
              Insufficient resolved complaint data for automated root-cause clustering.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: RECURRING ISSUE DETECTION (WITH MULTI-FILTER CONTROLS)
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-5') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>5. Recurring Issue Detection</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    {filteredRecurringIssues.length} Matches
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Detects equipment failures that repeatedly re-emerge in the same venue or department.
                </p>
              </div>
            </div>

            {/* Multi-Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Department filter */}
              <select
                value={recurringDeptFilter}
                onChange={(e) => setRecurringDeptFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={recurringCatFilter}
                onChange={(e) => setRecurringCatFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Location search */}
              <input
                type="text"
                value={recurringLocFilter}
                onChange={(e) => setRecurringLocFilter(e.target.value)}
                placeholder="Filter location..."
                className="h-8 w-28 sm:w-36 px-2 rounded-lg bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
              />
            </div>
          </div>

          {filteredRecurringIssues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRecurringIssues.map((ri, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {ri.pattern}
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-full">
                        {ri.count} occurrences
                      </span>
                    </div>

                    <p className="text-[11.5px] text-slate-500 font-medium">
                      Location: <strong>{ri.location}</strong>
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-[#0E1520] border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                    <strong>Recommended Action:</strong> {ri.recommendation}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center font-medium">
              No recurring issues match the selected department, category, or location filters.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6: CAMPUS ISSUE HOTSPOTS
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-6') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>6. Campus Issue Hotspots</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    30-Day Window
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Anonymized geographic clustering identifying buildings and facilities with highest issue density.
                </p>
              </div>
            </div>

            <span className="text-[10.5px] font-bold text-slate-400">
              Identity-protected telemetry
            </span>
          </div>

          {summary?.hotspots && summary.hotspots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.hotspots.map((h, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveHotspotModal(h)}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-2.5 hover:border-blue-500/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-base leading-none ${getHotspotDot(h.severity)}`}>●</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                        {h.location}
                      </h4>
                    </div>
                    {renderTrendBadge(h.trend)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>Total: <strong>{h.complaintCount} incidents</strong></div>
                    <div>Impact Score: <strong>{h.impactScore}/100</strong></div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Top categories: {h.topIssues.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center font-medium">
              No acute campus hotspots detected. Issue volume is evenly distributed.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7: AI RESOLUTION PREDICTION BENCHMARKS
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-7') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>7. AI Resolution Prediction</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    Category Benchmarks
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Predicts typical resolution timeframe, multi-stage workflow path, and escalation probability.
                </p>
              </div>
            </div>

            <span className="text-[10.5px] font-bold text-slate-400 italic">
              Prediction based on similar historical cases.
            </span>
          </div>

          {summary?.resolutionPredictionBenchmarks && summary.resolutionPredictionBenchmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.resolutionPredictionBenchmarks.map((bench, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      {bench.category} Grievances
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-500">
                      Target: {bench.slaTargetHours}h SLA
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Est. Resolution Time</span>
                    <span className="text-sm font-[800] text-slate-900 dark:text-white">
                      {bench.typicalResolutionTime}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase mb-1">Likely Workflow Path</span>
                    <div className="flex items-center gap-1 flex-wrap text-[10.5px] font-semibold text-slate-600 dark:text-slate-300">
                      {bench.path.map((stage, sIdx) => (
                        <React.Fragment key={sIdx}>
                          <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800">
                            {stage}
                          </span>
                          {sIdx < bench.path.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center font-medium">
              Historical path data calibrating.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8: DEPARTMENT PERFORMANCE TRENDS
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-8') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>8. Department Performance Trends</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    Comparative Analytics
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Tracks SLA compliance rate, resolution velocity, and active backlog across departments.
                </p>
              </div>
            </div>
          </div>

          {summary?.departmentPerformanceTrends && summary.departmentPerformanceTrends.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Department</th>
                    <th className="pb-2.5 text-center">Total Grievances</th>
                    <th className="pb-2.5 text-center">Pending Queue</th>
                    <th className="pb-2.5 text-center">Avg Resolution Time</th>
                    <th className="pb-2.5 text-center">SLA Compliance</th>
                    <th className="pb-2.5 text-center">Health Score</th>
                    <th className="pb-2.5 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {summary.departmentPerformanceTrends.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-[#121929]/60 transition-colors">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">
                        {d.department}
                      </td>
                      <td className="py-3 text-center">{d.totalComplaints}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          d.pendingCount >= 5 ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {d.pendingCount}
                        </span>
                      </td>
                      <td className="py-3 text-center">{d.avgResolutionHours}h</td>
                      <td className="py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {d.slaComplianceRate}%
                      </td>
                      <td className="py-3 text-center">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">
                          {d.healthScore}/100
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {renderTrendBadge(d.trend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center font-medium">
              No department historical records loaded.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 9: RECOMMENDED ACTIONS
         ══════════════════════════════════════════════════════════════════════ */}
      {shouldShow('sec-9') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1520] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-[800] text-slate-900 dark:text-white flex items-center gap-2">
                  <span>9. Recommended Actions</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Proactive Interventions
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Automated strategic actions derived from live SLA breach risks and hotspot clusters.
                </p>
              </div>
            </div>

            <Link
              to="/admin/recommendations"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Manage in Recommendation Center</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {summary?.recommendedActions && summary.recommendedActions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {summary.recommendedActions.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        rec.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                        rec.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-600 border-blue-500/20'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="text-[10.5px] font-bold text-slate-500">
                        {rec.confidence}% Conf.
                      </span>
                    </div>

                    <h4 className="text-xs font-[800] text-slate-900 dark:text-white">
                      {rec.title}
                    </h4>

                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300 font-medium">
                      {rec.reason}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    <strong>Action:</strong> {rec.action}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center font-medium">
              No critical interventions required. Campus operations optimal.
            </div>
          )}
        </div>
      )}

      {/* ── Modal: "Why this score?" Health Score Factors ── */}
      <AnimatePresence>
        {showHealthScoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-[800] text-slate-900 dark:text-white">
                    Complaint Health Score Formula (0–100)
                  </h3>
                </div>
                <button
                  onClick={() => setShowHealthScoreModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                The CampusResolve Complaint Health Score evaluates operational integrity across 7 weighted parameters:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>1. SLA Compliance Window</span>
                  <strong>30 pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>2. Status Lifecycle Progress</span>
                  <strong>20 pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>3. Response & Status Update Frequency</span>
                  <strong>15 pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>4. Teacher / Technician Assignment</span>
                  <strong>10 pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>5. Priority & Incident Severity</span>
                  <strong>10 pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>6. Recurrence & Chronic Pattern Risk</span>
                  <strong>10 pts</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-100 dark:border-slate-800 flex justify-between">
                  <span>7. Student Satisfaction / Sentiment</span>
                  <strong>5 pts</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-[11.5px] text-blue-900 dark:text-blue-200 font-medium">
                <strong>Note on Resolved Cases:</strong> Resolved complaints receive final health score evaluations reflecting whether the ticket concluded within target SLA and satisfactory student feedback.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowHealthScoreModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Hotspot Drilldown ── */}
      <AnimatePresence>
        {activeHotspotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-[800] text-slate-900 dark:text-white">
                    {activeHotspotModal.location}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveHotspotModal(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121929]">
                  <span className="text-slate-400 block text-[10.5px] uppercase">Incident Volume</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">{activeHotspotModal.complaintCount} Grievances</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121929]">
                  <span className="text-slate-400 block text-[10.5px] uppercase">Impact Rating</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">{activeHotspotModal.impactScore}/100</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Top Reported Grievance Types:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeHotspotModal.topIssues.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121929] text-xs text-slate-600 dark:text-slate-300 font-medium">
                <strong>Recommended Preventive Action:</strong> Schedule a comprehensive on-site facility audit to replace faulty wiring or aging fixtures before the next academic term.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveHotspotModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AICampusCommandCenter
