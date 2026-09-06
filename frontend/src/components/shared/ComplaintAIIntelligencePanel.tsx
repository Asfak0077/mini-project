import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, AlertTriangle, ShieldCheck, Activity, RefreshCw,
  Clock, CheckCircle2, ChevronDown, ChevronUp, Cpu, Flame,
  ShieldAlert, Zap, AlertCircle, History, Check, ArrowRight,
  TrendingUp, TrendingDown, Layers
} from 'lucide-react'
import {
  fetchComplaintAIIntelligence,
  refreshComplaintAIIntelligence
} from '../../services/aiIntelligenceService'
import { useAuthStore } from '../../store/authStore'
import { useToast } from './ToastNotification'
import {
  ComplaintAIIntelligence,
  AIAnalysisHistorySnapshot,
  Complaint
} from '../../types/domain'

interface ComplaintAIIntelligencePanelProps {
  complaintId: string
  ticketNumber?: string
  complaint?: Partial<Complaint>
  defaultExpanded?: boolean
  className?: string
  onSelectRelatedComplaint?: (relatedId: string) => void
}

export const ComplaintAIIntelligencePanel: React.FC<ComplaintAIIntelligencePanelProps> = ({
  complaintId,
  ticketNumber,
  complaint,
  defaultExpanded = false,
  className = '',
  onSelectRelatedComplaint
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showHistory, setShowHistory] = useState(false)
  const [showFactorsBreakdown, setShowFactorsBreakdown] = useState(false)
  const role = useAuthStore((state) => state.role) || 'student'
  const isStudent = role === 'student'
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Auto-expand if defaultExpanded changes
  useEffect(() => {
    if (defaultExpanded) {
      setIsExpanded(true)
    }
  }, [defaultExpanded, complaintId])

  // Fetch real-time AI intelligence for current complaint
  const {
    data: intelligence,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useQuery<ComplaintAIIntelligence | null>({
    queryKey: ['ai-intelligence', complaintId],
    queryFn: () => fetchComplaintAIIntelligence(complaintId),
    enabled: !!complaintId,
    staleTime: 3 * 60 * 1000
  })

  // Refresh mutation: forces complete recalculation of telemetry and AI analysis
  const refreshMutation = useMutation({
    mutationFn: () => refreshComplaintAIIntelligence(complaintId),
    onSuccess: (newData) => {
      showToast('success', 'AI analysis updated successfully with latest telemetry.')
      queryClient.setQueryData(['ai-intelligence', complaintId], newData)
      queryClient.invalidateQueries({ queryKey: ['ai-intelligence', complaintId] })
      queryClient.invalidateQueries({ queryKey: ['campus-intelligence-summary'] })
    },
    onError: (err: any) => {
      showToast('error', err?.message || 'Unable to refresh AI analysis. Please try again.')
    }
  })

  // Time format helper
  const formatTime = (ts?: string) => {
    if (!ts) return 'Just now'
    try {
      const d = new Date(ts)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ts
    }
  }

  // Clean and shorten verbose AI cause text to punchy phrases (3-6 words)
  const cleanShortCause = (text: string) => {
    if (!text) return 'Component Discrepancy'
    const clean = text.replace(/\([^)]*\)/g, '').trim()
    const parts = clean.split(/\b(preventing|causing|resulting in|leading to|due to)\b/i)
    const primary = (parts[0] || clean).trim()
    const words = primary.split(/\s+/)
    if (words.length > 5) return words.slice(0, 5).join(' ')
    return primary
  }

  // Clean and shorten verbose action sentences to concise checklist items
  const cleanShortAction = (text: string) => {
    if (!text) return ''
    const first = text.split(/[,.;(]/)[0].trim()
    const words = first.split(/\s+/)
    if (words.length > 7) return words.slice(0, 7).join(' ')
    return first
  }

  // Risk badge helper according to prompt specs:
  // 0-20% = Low Risk, 21-50% = Moderate Risk, 51-75% = High Risk, 76-100% = Critical Risk
  const getRiskBadge = (probability: number = 0, riskLevel?: string) => {
    if (riskLevel === 'COMPLETED') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        label: 'RESOLVED',
        color: 'text-emerald-600',
        barColor: 'bg-emerald-500'
      }
    }

    if (probability >= 76 || riskLevel === 'CRITICAL') {
      return {
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400',
        label: 'CRITICAL RISK',
        color: 'text-rose-600',
        barColor: 'bg-rose-500'
      }
    }
    if (probability >= 51 || riskLevel === 'HIGH') {
      return {
        bg: 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400',
        label: 'HIGH RISK',
        color: 'text-red-600',
        barColor: 'bg-red-500'
      }
    }
    if (probability >= 21 || riskLevel === 'MODERATE' || riskLevel === 'MEDIUM') {
      return {
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400',
        label: 'MODERATE RISK',
        color: 'text-amber-600',
        barColor: 'bg-amber-500'
      }
    }
    return {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
      label: 'LOW RISK',
      color: 'text-emerald-600',
      barColor: 'bg-emerald-500'
    }
  }

  // Health badge helper according to prompt:
  // 90-100 = Excellent, 75-89 = Healthy, 50-74 = Needs Attention, 25-49 = At Risk, 0-24 = Critical
  const getHealthBadge = (score: number) => {
    if (score >= 90) {
      return {
        label: 'Excellent',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        stroke: '#059669',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
      }
    }
    if (score >= 75) {
      return {
        label: 'Healthy',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        stroke: '#10B981',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
      }
    }
    if (score >= 50) {
      return {
        label: 'Needs Attention',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        stroke: '#F59E0B',
        badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
      }
    }
    if (score >= 25) {
      return {
        label: 'At Risk',
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/20',
        stroke: '#F97316',
        badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
      }
    }
    return {
      label: 'Critical',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      stroke: '#EF4444',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
    }
  }

  // Confidence tier badge helper
  const getConfidenceBadge = (level?: string) => {
    switch (level) {
      case 'High Confidence':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
      case 'Low Confidence':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
      case 'Medium Confidence':
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
    }
  }

  const isRefreshing = refreshMutation.isPending || isFetching
  const healthData = intelligence?.healthScore
  const healthScoreVal = typeof healthData?.score === 'number' ? healthData.score : 80
  const healthBadge = getHealthBadge(healthScoreVal)
  const slaData = intelligence?.slaPrediction
  const recurringData = intelligence?.recurringIssue
  const rootCause = intelligence?.rootCauseAnalysis
  const historyList = intelligence?.analysisHistory || []

  // Check if complaint is resolved either by complaint object or slaData.isResolved
  const isResolvedComplaint =
    complaint?.status === 'Resolved' ||
    slaData?.isResolved === true ||
    slaData?.riskLevel === 'COMPLETED'

  return (
    <div
      className={`rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-white dark:bg-[#0E1524] shadow-sm overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* ── Top Bar / Header ── */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-950/70 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white/10 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-[800] text-slate-900 dark:text-white tracking-tight">
                AI Campus Intelligence
              </h3>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Live Telemetry
              </span>
              {ticketNumber && (
                <span className="text-[11px] font-mono text-slate-400">
                  {ticketNumber}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {intelligence?.generatedAt
                ? `Last analyzed: ${formatTime(intelligence.generatedAt)}`
                : 'Real-time telemetry and root cause evaluation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center flex-wrap">
          {/* Quick Health Pill */}
          {healthData && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${healthBadge.bg} ${healthBadge.color}`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Health: {healthScoreVal}/100</span>
              <span className="opacity-70 text-[10px]">({healthBadge.label})</span>
            </div>
          )}

          {/* Refresh AI Button */}
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={isRefreshing || isLoading}
            title="Recalculate AI analysis with latest complaint history & similar grievances"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11.5px] font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isRefreshing ? 'Refreshing AI...' : 'Refresh AI'}</span>
          </button>

          {/* Collapsible toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Toggle AI analysis panel"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Expanded Content ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 sm:p-6 space-y-5"
          >
            {/* Loading Skeleton */}
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="flex items-center gap-3 p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Analyzing complaint data, department history & SLA telemetry...</span>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-full" />
                </div>
              </div>
            ) : isError ? (
              /* Error State */
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <strong className="block text-[13px] text-rose-900 dark:text-rose-200">
                      AI Analysis Temporarily Unavailable
                    </strong>
                    <span className="text-[12px] opacity-90">
                      {(error as any)?.message || 'Unable to compute operational intelligence for this complaint.'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => refetch()}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  Retry Analysis
                </button>
              </div>
            ) : !intelligence ? (
              /* Empty State */
              <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 dark:bg-[#121929] border border-slate-200 dark:border-slate-800 space-y-2">
                <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No AI analysis available yet.
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  More complaint activity or historical data is needed to generate a reliable analysis.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => refreshMutation.mutate()}
                    disabled={isRefreshing}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Run Analysis Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── 1. COMPLAINT HEALTH SCORE (0-100 WEIGHTED) ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#121929]/80 border border-slate-200/90 dark:border-slate-800/90 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Radial Progress Score Gauge */}
                      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200 dark:text-slate-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            stroke={healthBadge.stroke}
                            strokeDasharray={`${healthScoreVal}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className={`text-base font-[900] ${healthBadge.color}`}>
                            {healthScoreVal}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 -mt-1">/ 100</span>
                        </div>
                      </div>

                      {/* Health Status & Human-Readable Explanation */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Complaint Health Score
                          </h4>
                          <span
                            className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${healthBadge.bg} ${healthBadge.color}`}
                          >
                            {healthData?.healthLabel || healthBadge.label}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                          {healthData?.reason ||
                            (isResolvedComplaint
                              ? 'Complaint was successfully resolved within institutional SLA standards.'
                              : 'Complaint is actively progressing under standard operational monitoring.')}
                        </p>
                      </div>
                    </div>

                    {/* Breakdown toggle button */}
                    {healthData?.breakdown && !isStudent && (
                      <button
                        onClick={() => setShowFactorsBreakdown(!showFactorsBreakdown)}
                        className="text-[11.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{showFactorsBreakdown ? 'Hide Breakdown' : 'View Breakdown (7 Factors)'}</span>
                      </button>
                    )}
                  </div>

                  {/* 7-Factor Weighted Breakdown Drawer */}
                  {showFactorsBreakdown && healthData?.breakdown && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]"
                    >
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">SLA (30%)</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {healthData.breakdown.slaCompliance ?? 30}/30
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Progress (20%)</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {healthData.breakdown.statusProgress ?? 20}/20
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Updates (15%)</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {healthData.breakdown.updateFrequency ?? 15}/15
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Assign (10%)</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {healthData.breakdown.assignmentStatus ?? 10}/10
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Priority (10%)</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {healthData.breakdown.prioritySeverity ?? 10}/10
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Recurrence (10%)</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {healthData.breakdown.recurrence ?? 10}/10
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Feedback (5%)</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {healthData.breakdown.feedback ?? 5}/5
                        </strong>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── 2. SLA BREACH PREDICTION OR FINAL SLA ANALYSIS ── */}
                {slaData && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800/90 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          {isResolvedComplaint ? 'Final SLA Analysis' : 'SLA Breach Risk Prediction'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Risk / Status Badge */}
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                            getRiskBadge(slaData.breachProbability, slaData.riskLevel).bg
                          }`}
                        >
                          {isResolvedComplaint
                            ? slaData.finalOutcome || 'RESOLVED WITHIN SLA'
                            : getRiskBadge(slaData.breachProbability, slaData.riskLevel).label}
                        </span>

                        {/* Confidence Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConfidenceBadge(
                            slaData.confidenceLevel
                          )}`}
                        >
                          {slaData.confidenceLevel || 'High Confidence'}
                        </span>
                      </div>
                    </div>

                    {/* Content: Resolved vs Active */}
                    {isResolvedComplaint ? (
                      /* Final SLA Analysis for Resolved Complaints */
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12px]">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              Actual Resolution Time
                            </span>
                            <strong className="text-slate-900 dark:text-white text-sm">
                              {slaData.actualResolutionHours !== null && slaData.actualResolutionHours !== undefined
                                ? `${slaData.actualResolutionHours} hours`
                                : slaData.predictedResolutionTime || 'Completed'}
                            </strong>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              Institutional SLA Target
                            </span>
                            <strong className="text-slate-900 dark:text-white text-sm">
                              {slaData.targetSlaHours ? `${slaData.targetSlaHours} hours` : '48 hours'}
                            </strong>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              Performance Result
                            </span>
                            <strong
                              className={
                                slaData.finalOutcome === 'SLA Breached'
                                  ? 'text-rose-600 text-sm'
                                  : 'text-emerald-600 text-sm'
                              }
                            >
                              {slaData.finalOutcome || 'Completed Within SLA'}
                            </strong>
                          </div>
                        </div>

                        {/* Factors / Performance remarks */}
                        {Array.isArray(slaData.factors || slaData.reason) && (
                          <ul className="space-y-1 pt-1">
                            {(slaData.factors || slaData.reason).map((f, i) => (
                              <li
                                key={i}
                                className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5 font-medium"
                              >
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      /* Active SLA Breach Prediction */
                      <div className="space-y-3">
                        {/* Probability Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11.5px] font-bold">
                            <span className="text-slate-500">
                              Breach Probability:
                            </span>
                            <span className={getRiskBadge(slaData.breachProbability, slaData.riskLevel).color}>
                              {slaData.breachProbability}% • {getRiskBadge(slaData.breachProbability, slaData.riskLevel).label}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${slaData.breachProbability}%` }}
                              transition={{ duration: 0.6 }}
                              className={`h-full rounded-full ${getRiskBadge(slaData.breachProbability, slaData.riskLevel).barColor}`}
                            />
                          </div>
                          <div className="flex justify-between text-[10.5px] font-semibold text-slate-400">
                            <span>Time remaining: <strong>{slaData.timeRemaining}</strong></span>
                            <span>Target SLA: {slaData.targetSlaHours || 48}h</span>
                          </div>
                        </div>

                        {/* Main Contributing Factors */}
                        {Array.isArray(slaData.factors || slaData.reason) && (slaData.factors || slaData.reason).length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                              Key Telemetry Factors
                            </span>
                            <ul className="space-y-1">
                              {(slaData.factors || slaData.reason).map((item, idx) => (
                                <li
                                  key={idx}
                                  className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5 font-medium"
                                >
                                  <span className="text-blue-500 font-bold">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Action */}
                        {slaData.recommendedAction && (
                          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-[12px] font-medium text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Recommended Action:</strong>
                              <span>{slaData.recommendedAction}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 3. AI ROOT CAUSE ANALYSIS (Category-Aware) ── */}
                {!isStudent && rootCause && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101726] border border-slate-200/90 dark:border-slate-800/90 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-[800] uppercase tracking-wider text-slate-900 dark:text-white">
                          AI Root Cause Diagnostics
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConfidenceBadge(
                          rootCause.confidenceLevel
                        )}`}
                      >
                        {rootCause.confidenceLevel || 'Medium Confidence'}
                      </span>
                    </div>

                    {/* Identified Causes (Concise & Punchy) */}
                    {Array.isArray(rootCause.possibleRootCauses) && rootCause.possibleRootCauses.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Identified Causes
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {rootCause.possibleRootCauses.slice(0, 2).map((causeItem, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800/80 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[12px] font-bold gap-2">
                                <span className="text-slate-800 dark:text-slate-200 truncate">
                                  {cleanShortCause(causeItem.cause)}
                                </span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] shrink-0 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                  {causeItem.confidence}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${causeItem.confidence}%` }}
                                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Technical Actions (Compact Checklist) */}
                    {Array.isArray(rootCause.recommendedActions) && rootCause.recommendedActions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Suggested Action Steps
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {rootCause.recommendedActions.slice(0, 4).map((action, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-[11.5px] font-medium text-slate-700 dark:text-slate-300 py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/50 dark:border-slate-800/50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{cleanShortAction(action)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 4. RECURRING FAILURE PATTERNS (Faculty & Admin) ── */}
                {!isStudent && recurringData && recurringData.isRecurring && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                          🔁 Recurring Issue Detected
                        </h4>
                      </div>
                      <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                        {recurringData.recurrenceCount} Occurrences in {recurringData.timePeriod || '30 days'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12px]">
                      <div className="p-2.5 rounded-xl bg-white/90 dark:bg-[#0E1520] border border-purple-100 dark:border-purple-900/50">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Affected Location
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {recurringData.affectedLocation || 'Campus Zone'}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/90 dark:bg-[#0E1520] border border-purple-100 dark:border-purple-900/50">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Issue Pattern
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {recurringData.issuePattern || 'Equipment breakdown'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/90 dark:bg-[#0E1520] border border-purple-100 dark:border-purple-900/50 text-[12px]">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">
                        AI Preventative Recommendation
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {recurringData.recommendation}
                      </p>
                    </div>

                    {recurringData.relatedComplaintIds && recurringData.relatedComplaintIds.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] font-semibold text-slate-500">
                        <span>Related complaints in this zone:</span>
                        {recurringData.relatedComplaintIds.map((cid, i) => (
                          <span
                            key={i}
                            onClick={() => onSelectRelatedComplaint?.(cid)}
                            className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-mono text-[10px] cursor-pointer hover:underline"
                          >
                            {cid}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 5. ANALYSIS HISTORY SNAPSHOTS ── */}
                {historyList.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Analysis History ({historyList.length} previous evaluations)</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 space-y-2 overflow-hidden"
                        >
                          {historyList.map((snap: AIAnalysisHistorySnapshot, i: number) => {
                            const prevSnap = historyList[i + 1]
                            const scoreDiff = prevSnap ? snap.healthScore - prevSnap.healthScore : 0
                            return (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-slate-50 dark:bg-[#121929] border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11.5px]"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {formatTime(snap.timestamp)}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                        getRiskBadge(0, snap.slaRiskLevel).bg
                                      }`}
                                    >
                                      {snap.slaRiskLevel} Risk
                                    </span>
                                  </div>
                                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                                    {snap.reason}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    Health: {snap.healthScore}/100
                                  </span>
                                  {scoreDiff !== 0 && (
                                    <span
                                      className={`flex items-center text-[10px] font-bold ${
                                        scoreDiff > 0 ? 'text-emerald-600' : 'text-rose-600'
                                      }`}
                                    >
                                      {scoreDiff > 0 ? (
                                        <TrendingUp className="w-3 h-3 mr-0.5" />
                                      ) : (
                                        <TrendingDown className="w-3 h-3 mr-0.5" />
                                      )}
                                      {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ComplaintAIIntelligencePanel
