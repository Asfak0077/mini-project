import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AppShell from '../components/ds/AppShell'
import ComplaintForm from '../components/student/ComplaintForm'
import { fetchStudentComplaints } from '../services/complaintService'
import useSocket from '../hooks/useSocket'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Inbox,
  Clock,
  Sparkles,
  Zap,
  Calendar,
  ArrowRight,
  Plus,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  FileText,
  UserCheck,
  ChevronRight,
  X
} from 'lucide-react'
import StatusBadge from '../components/shared/StatusBadge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { UserAvatar } from '../components/ui/Avatar'
import ComplaintIdBadge from '../components/shared/ComplaintIdBadge'

const StudentDashboard: React.FC = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const studentId = user?.studentId || user?.email || ''
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [activityTimeframe, setActivityTimeframe] = useState<'weekly' | 'monthly'>('monthly')

  useSocket({
    onStatusUpdated: () => queryClient.invalidateQueries({ queryKey: ['complaints'] }),
    onComplaintAssigned: () => queryClient.invalidateQueries({ queryKey: ['complaints'] })
  })

  const complaintsQuery = useQuery({
    queryKey: ['complaints', 'student', studentId],
    queryFn: () => fetchStudentComplaints(studentId),
    enabled: !!studentId
  })

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const greeting = useMemo(() => getGreeting(), [])
  const todayFormatted = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric'
  }), [])

  const complaints = complaintsQuery.data ?? []
  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Submitted' || c.status === 'Assigned').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length
  }), [complaints])

  const resolutionRate = useMemo(() => {
    if (stats.total === 0) return 85
    return Math.round((stats.resolved / stats.total) * 100) || 85
  }, [stats])

  // Chart data based on active timeframe
  const chartData = useMemo(() => {
    if (activityTimeframe === 'weekly') {
      return [
        { name: 'Mon', active: 2, resolved: 1 },
        { name: 'Tue', active: 4, resolved: 3 },
        { name: 'Wed', active: 3, resolved: 2 },
        { name: 'Thu', active: 6, resolved: 5 },
        { name: 'Fri', active: 4, resolved: 4 },
        { name: 'Sat', active: 1, resolved: 1 },
        { name: 'Sun', active: 2, resolved: 2 },
      ]
    }
    return [
      { name: 'Jan', active: 4, resolved: 3 },
      { name: 'Feb', active: 7, resolved: 6 },
      { name: 'Mar', active: 5, resolved: 4 },
      { name: 'Apr', active: 9, resolved: 8 },
      { name: 'May', active: 12, resolved: 11 },
      { name: 'Jun', active: 8, resolved: 7 },
      { name: 'Jul', active: 10, resolved: 9 },
      { name: 'Aug', active: stats.total || 6, resolved: stats.resolved || 5 },
    ]
  }, [activityTimeframe, stats])

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6 w-full mx-auto pb-6">
        {/* ── Greeting Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
              {greeting}, {user?.name?.split(' ')[0] || 'Student'}!
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[var(--text-secondary)] mt-0.5 font-medium">
              Explore grievances, department trends, and real-time resolution status.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-white dark:bg-[#101722] px-3 py-1.5 rounded-full border border-[var(--border)] shadow-[var(--shadow-sm)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{todayFormatted}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Portal Live</span>
            </div>
          </div>
        </div>

        {/* ── ROW 1: 4 Stat Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat Card 1: Total Filed (with mini bar chart) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-2xl bg-white dark:bg-[#101722] border border-[var(--border)] shadow-[var(--shadow-sm)] flex items-center justify-between h-[108px]"
          >
            <div>
              <span className="text-[10.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-0.5">
                Total Filed
              </span>
              <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight leading-none">
                {String(stats.total).padStart(2, '0')}
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 inline-block">
                +{stats.total > 0 ? stats.total : 2} this term
              </span>
            </div>

            {/* Mini Bar Chart Indicator */}
            <div className="flex items-end gap-1.5 h-9 px-2 py-1">
              {[40, 65, 30, 85, 55, 100].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300 hover:bg-[#111827] dark:hover:bg-white"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </motion.div>

          {/* Stat Card 2: Pending (with subtle icon + wave indicator) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.04 }}
            className="p-4 rounded-2xl bg-white dark:bg-[#101722] border border-[var(--border)] shadow-[var(--shadow-sm)] flex items-center justify-between h-[108px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-0.5">
                  Pending
                </span>
                <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight leading-none">
                  {String(stats.pending).padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Mini Wave SVG */}
            <svg className="w-12 h-7 text-amber-500/40" viewBox="0 0 60 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 20 Q 15 5, 30 18 T 58 10" />
            </svg>
          </motion.div>

          {/* Stat Card 3: In Progress (with purple badge) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            className="p-4 rounded-2xl bg-white dark:bg-[#101722] border border-[var(--border)] shadow-[var(--shadow-sm)] flex items-center justify-between h-[108px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase block mb-0.5">
                  In Progress
                </span>
                <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight leading-none">
                  {String(stats.inProgress).padStart(2, '0')}
                </div>
              </div>
            </div>

            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300">
              Active SLA
            </span>
          </motion.div>

          {/* Stat Card 4: Activity / Resolved (Sage Green Accent Card) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.12 }}
            className="p-4 rounded-2xl bg-[#4D7C5F] text-white shadow-[0_8px_24px_rgba(77,124,95,0.25)] flex items-center justify-between h-[108px] relative overflow-hidden"
          >
            <div className="relative z-10">
              <span className="text-[10.5px] font-bold text-white/80 tracking-wider uppercase block mb-0.5">
                Resolution Rate
              </span>
              <div className="text-2xl sm:text-3xl font-[800] tracking-tight leading-none">
                {resolutionRate}%
              </div>
              <span className="text-[11px] font-semibold text-emerald-200 mt-1 inline-block">
                {stats.resolved} complaints resolved
              </span>
            </div>

            {/* Smooth SVG sparkline */}
            <div className="relative z-10">
              <svg className="w-14 h-8 text-white" viewBox="0 0 70 35" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M4 25 C 20 28, 30 5, 50 16 S 66 6, 66 6" />
              </svg>
            </div>

            {/* Subtle background glow */}
            <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />
          </motion.div>
        </div>

        {/* ── ROW 2: Analytics Grid (Chart + Gauge + Profile Widget) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Main Activity Chart Card (Spans 6 cols on desktop) */}
          <div className="lg:col-span-6 bg-white dark:bg-[#101722] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[16px] font-[800] text-[var(--text-primary)] tracking-tight">
                  Grievance Trends
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> On track
                </span>
              </div>

              {/* Monthly / Weekly toggle */}
              <div className="flex items-center bg-[var(--surface-secondary)] rounded-full p-0.5 border border-[var(--border)] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActivityTimeframe('weekly')}
                  className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer text-[11px] ${
                    activityTimeframe === 'weekly'
                      ? 'bg-white dark:bg-[#151D2A] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTimeframe('monthly')}
                  className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer text-[11px] ${
                    activityTimeframe === 'monthly'
                      ? 'bg-white dark:bg-[#151D2A] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex items-center gap-3 mb-2 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Resolved SLA</span>
                <span className="text-[13px] font-bold text-[var(--text-primary)]">94.2%</span>
                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">+2.45%</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Avg Turnaround</span>
                <span className="text-[13px] font-bold text-[var(--text-primary)]">24 hrs</span>
                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">-4.75%</span>
              </div>
            </div>

            {/* Smooth Recharts AreaChart */}
            <div className="h-[145px] w-full mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sageTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4D7C5F" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4D7C5F" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 6px 20px rgba(15,23,42,0.1)',
                      fontSize: '11.5px',
                      fontWeight: 600
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved"
                    stroke="#4D7C5F"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#sageTrendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resolution Gauge Progress Card (Spans 3 cols on desktop) */}
          <div className="lg:col-span-3 bg-white dark:bg-[#101722] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
            <div>
              <h3 className="text-[15px] font-[800] text-[var(--text-primary)] tracking-tight">
                Resolution Metric
              </h3>
              <p className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                Department Performance
              </p>
            </div>

            <div className="my-1.5">
              <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
                {resolutionRate}%
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] mt-0.5 font-medium leading-snug">
                Response efficiency is 18% higher than college baseline
              </p>
            </div>

            {/* Arc Progress Meter Gauge */}
            <div className="relative flex flex-col items-center justify-center pt-1">
              <svg className="w-32 h-18" viewBox="0 0 100 55">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  className="text-slate-100 dark:text-slate-800"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#4D7C5F"
                  strokeWidth="9"
                  strokeDasharray="125.6"
                  strokeDashoffset={125.6 * (1 - resolutionRate / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="text-center -mt-3.5">
                <span className="text-[13px] font-[800] text-[var(--text-primary)]">{resolutionRate}%</span>
              </div>
            </div>
          </div>

          {/* Student Profile Widget Card (Spans 3 cols on desktop) */}
          <div className="lg:col-span-3 bg-white dark:bg-[#101722] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col items-center justify-between text-center">
            <div className="w-full flex justify-end">
              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Active Student
              </span>
            </div>

            <div className="flex flex-col items-center my-0.5">
              <div className="relative">
                <UserAvatar
                  src={user?.profilePicture || user?.profileImage}
                  name={user?.name || 'Student'}
                  size="md"
                  className="w-14 h-14 rounded-2xl ring-4 ring-slate-100 dark:ring-slate-800 shadow-xs"
                />
                <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white dark:ring-[#101722]">
                  ✓
                </span>
              </div>
              <h4 className="text-[14.5px] font-[800] text-[var(--text-primary)] mt-2.5 tracking-tight truncate max-w-[190px]">
                {user?.name || 'Student Name'}
              </h4>
              <p className="text-[11.5px] text-[var(--text-muted)] truncate max-w-[180px]">
                {user?.email || 'student@campusresolve.edu'}
              </p>
              <span className="text-[10.5px] font-bold text-[var(--accent)] mt-0.5">
                {user?.department || 'CSE'} · {user?.studentId || '23VEC371'}
              </span>
            </div>

            {/* 3 Quick User Stats */}
            <div className="grid grid-cols-3 gap-1.5 w-full pt-2.5 border-t border-[var(--border)]">
              <div>
                <span className="text-[9.5px] font-bold text-[var(--text-muted)] uppercase block">Filed</span>
                <span className="text-[14px] font-[800] text-[var(--text-primary)]">{stats.total}</span>
              </div>
              <div>
                <span className="text-[9.5px] font-bold text-[var(--text-muted)] uppercase block">Solved</span>
                <span className="text-[14px] font-[800] text-[var(--text-primary)]">{stats.resolved}</span>
              </div>
              <div>
                <span className="text-[9.5px] font-bold text-[var(--text-muted)] uppercase block">Rating</span>
                <span className="text-[14px] font-[800] text-amber-500">4.9 ★</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Action Card + Recent Tickets + Support Widget ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Action Card: Submit Grievance (Spans 5 cols on desktop) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#101722] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-blue-600 bg-blue-500/10 rounded-full">
                  Redressal Desk
                </span>
              </div>
              <h3 className="text-[17px] font-[800] text-[var(--text-primary)] tracking-tight">
                Submit New Grievance
              </h3>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                Directly route academic, infrastructure, or transport issues to verified department faculty.
              </p>
            </div>

            {/* Clean Structured Routing Preview Card */}
            <div className="my-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#151D2A] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Direct Faculty Dispatch
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-secondary)] px-2 py-0.5 rounded-md font-semibold">
                  CR-2026 SLA
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Infrastructure', 'Academic', 'Hostel', 'Transport'].map((cat) => (
                  <span
                    key={cat}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E293B] text-[var(--text-secondary)] border border-[var(--border)] shadow-xs"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full h-11 rounded-xl bg-[#111827] dark:bg-white text-white dark:text-[#111827] font-bold text-[13px] hover:bg-[#2563EB] dark:hover:bg-blue-500 dark:hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Submit Grievance Now
            </button>
          </div>

          {/* Recent Tickets List Card (Spans 4 cols on desktop) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#101722] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[15px] font-[800] text-[var(--text-primary)] tracking-tight">
                Recent Complaints
              </h3>
              <span className="text-[10.5px] font-bold text-[var(--text-muted)] bg-[var(--surface-secondary)] px-2.5 py-0.5 rounded-full border border-[var(--border)]">
                {complaints.length} Total
              </span>
            </div>

            <div className="divide-y divide-[var(--border-subtle)] my-auto">
              {complaintsQuery.isLoading ? (
                <div className="py-3 space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 rounded-lg bg-[var(--surface-secondary)] animate-pulse" />
                  ))}
                </div>
              ) : complaints.length > 0 ? (
                complaints.slice(0, 3).map((ticket) => (
                  <Link
                    key={ticket.id}
                    to="/student/history"
                    className="py-2.5 flex items-center justify-between gap-2.5 group hover:bg-[var(--surface-secondary)] -mx-1.5 px-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ComplaintIdBadge complaintId={ticket.complaintId} id={ticket.id} size="sm" />
                        <p className="text-[12.5px] font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                          {ticket.title || ticket.description}
                        </p>
                      </div>
                      <span className="text-[10.5px] font-medium text-[var(--text-muted)]">
                        {ticket.category || 'General'} · {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </Link>
                ))
              ) : (
                <div className="py-5 text-center text-xs text-[var(--text-muted)]">
                  No grievances submitted yet.
                </div>
              )}
            </div>

            <Link
              to="/student/history"
              className="mt-2.5 w-full py-2 rounded-lg text-center text-[11.5px] font-bold text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors flex items-center justify-center gap-1.5 border border-[var(--border)] cursor-pointer"
            >
              View All History <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Campus Support & AI Guide Widget (Spans 3 cols on desktop) */}
          <div className="lg:col-span-3 bg-white dark:bg-[#101722] rounded-2xl p-5 border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col items-center justify-between text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center my-0.5">
              <ShieldCheck className="w-6 h-6" strokeWidth={1.8} />
            </div>

            <div className="my-1">
              <h4 className="text-[14.5px] font-[800] text-[var(--text-primary)] tracking-tight">
                Campus Redressal SLA
              </h4>
              <p className="text-[11.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                All complaints are logged on the immutable ledger with direct escalation after 48 hours.
              </p>
            </div>

            <Link
              to="/about"
              className="w-full py-2 rounded-lg bg-[#4D7C5F] text-white font-bold text-[11.5px] hover:bg-[#3d634c] transition-colors shadow-xs cursor-pointer block"
            >
              Review Campus Policy
            </Link>
          </div>
        </div>

        {/* ── Modal for Grievance Submission ─────────────────────── */}
        <AnimatePresence>
          {isSubmitModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSubmitModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#101722] rounded-2xl border border-[var(--border)] shadow-2xl p-6 sm:p-8 z-10"
              >
                <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[var(--border)]">
                  <div>
                    <h2 className="text-lg sm:text-xl font-[800] text-[var(--text-primary)] tracking-tight">
                      Submit New Grievance
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Fill in the details below for fast faculty resolution.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <ComplaintForm onSuccess={() => setIsSubmitModalOpen(false)} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

export default StudentDashboard
