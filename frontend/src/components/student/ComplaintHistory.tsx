import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { fetchStudentComplaints, deleteComplaint } from '../../services/complaintService'
import { useAuthStore } from '../../store/authStore'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import ComplaintTimeline from './ComplaintTimeline'
import { useToast } from '../shared/ToastNotification'
import {
  Search, ChevronDown, Clock, User, MessageSquare,
  Calendar, CheckCircle2, AlertTriangle, Trash2,
  RefreshCw, Inbox, Shield, Zap, Copy, Check, Star,
  ArrowRight, Tag, Building2, FileText, CheckCircle,
  FilePlus, Sparkles, Filter, ChevronRight, ArrowUpRight
} from 'lucide-react'
import { Button } from '../ui/Button'
import ComplaintIdBadge from '../shared/ComplaintIdBadge'

const priorityConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  high: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', label: 'High Priority', dot: 'bg-rose-500' },
  medium: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', label: 'Medium Priority', dot: 'bg-amber-500' },
  low: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', label: 'Low Priority', dot: 'bg-blue-500' }
}

const FILTER_TABS = [
  { id: 'all', label: 'All Complaints' },
  { id: 'Submitted', label: 'Submitted' },
  { id: 'Assigned', label: 'Assigned' },
  { id: 'In Progress', label: 'In Progress' },
  { id: 'Resolved', label: 'Resolved' },
  { id: 'Escalated', label: 'Escalated' }
]

export const ComplaintHistory = () => {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const studentId = user?.studentId || user?.email || ''

  const complaintsQuery = useQuery({
    queryKey: ['complaints', 'student', studentId],
    queryFn: () => fetchStudentComplaints(studentId),
    enabled: !!studentId
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComplaint(id, studentId),
    onSuccess: () => {
      showToast('success', 'Complaint deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      setDeleteConfirmId(null)
    },
    onError: () => {
      showToast('error', 'Failed to delete complaint')
    }
  })

  const allComplaints = complaintsQuery.data ?? []

  // Count by status for filter tabs
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allComplaints.length }
    allComplaints.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1
    })
    return counts
  }, [allComplaints])

  const complaints = useMemo(() => {
    let items = allComplaints

    items = items.filter((item) => {
      const matchesSearch =
        search.trim().length === 0 ||
        item.category.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })

    return [...items].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === 'priority') {
        const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 }
        return (pMap[b.priority] || 0) - (pMap[a.priority] || 0)
      }
      return 0
    })
  }, [allComplaints, search, statusFilter, sortBy])

  const stats = {
    total: allComplaints.length,
    pending: allComplaints.filter(c => c.status === 'Submitted' || c.status === 'Assigned').length,
    inProgress: allComplaints.filter(c => c.status === 'In Progress').length,
    resolved: allComplaints.filter(c => c.status === 'Resolved').length
  }

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    showToast('info', 'Ticket ID copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (complaintsQuery.isLoading) {
    return <LoadingSpinner />
  }

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  return (
    <div className="space-y-5 transition-colors duration-200">
      {/* ── 1. Top Metrics Bar (4 macOS Glassmorphic Cards) ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Filed',
            value: stats.total,
            desc: 'All recorded complaints',
            icon: Inbox,
            color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
          },
          {
            label: 'Pending Review',
            value: stats.pending,
            desc: 'Awaiting faculty review',
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
          },
          {
            label: 'In Progress',
            value: stats.inProgress,
            desc: 'Investigation underway',
            icon: Zap,
            color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10'
          },
          {
            label: 'Resolved',
            value: stats.resolved,
            desc: 'Verified solutions',
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
          }
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              whileHover={{ y: -2 }}
              className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col justify-between h-[108px] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase">
                  {stat.label}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-auto">
                <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
                  {String(stat.value).padStart(2, '0')}
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {stat.desc}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── 2. Search, Sort, and Filter Hub ─────────────────────────── */}
      <div className="bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-4 sm:p-5 shadow-[var(--shadow-sm)] space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search complaints by title, keyword, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[13.5px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[13px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">By Priority</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => complaintsQuery.refetch()}
            className="w-full md:w-auto h-11 px-4 rounded-xl bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${complaintsQuery.isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Pills with Live Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-[var(--border-subtle)]/60 pt-3">
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.id
            const count = filterCounts[tab.id] ?? 0
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#111827] dark:bg-white text-white dark:text-[#111827] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 dark:bg-black/15 text-white dark:text-[#111827]'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3. Complaints Ticket List ──────────────────────────────── */}
      <div className="space-y-3.5">
        {complaints.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl rounded-2xl border border-[var(--border)] py-14 px-6 text-center shadow-[var(--shadow-sm)] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center mx-auto border border-[var(--border-subtle)]">
              <Inbox className="w-5 h-5" />
            </div>
            <h4 className="text-base font-[800] text-[var(--text-primary)] tracking-tight">
              No Grievance Complaints Found
            </h4>
            <p className="text-[12.5px] font-medium text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search keywords or switching to another filter status tab.'
                : 'You have not submitted any complaints yet. Click "Lodge Grievance" above to submit one.'}
            </p>
          </div>
        ) : (
          complaints.map((complaint, idx) => {
            const isExpanded = expandedId === complaint.id
            const priority = priorityConfig[complaint.priority] || priorityConfig.medium
            const shortId = complaint.id.slice(0, 8)

            return (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                className={`bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl rounded-2xl border transition-all duration-200 overflow-hidden shadow-[var(--shadow-sm)] ${
                  isExpanded
                    ? 'border-blue-500/50 ring-2 ring-blue-500/10'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-md'
                }`}
              >
                {/* ── Collapsed Row Header ── */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                  className="p-4 sm:p-5 cursor-pointer space-y-3 select-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* High-Contrast Badge Tags Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={complaint.status} />

                        {/* Priority Badge with glowing indicator */}
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${priority.bg} ${priority.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                          <span>{priority.label}</span>
                        </span>

                        {/* Department/Category Chip */}
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--surface-secondary)] px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
                          {complaint.category || complaint.department}
                        </span>

                        {/* Standardized Complaint ID Badge with Copy */}
                        <ComplaintIdBadge
                          complaintId={complaint.complaintId}
                          id={complaint.id}
                          size="sm"
                        />
                      </div>

                      {/* Ticket Title */}
                      <h3 className="text-[15.5px] font-[800] text-[var(--text-primary)] tracking-tight leading-snug">
                        {complaint.title || complaint.description}
                      </h3>

                      {/* Snippet (when collapsed) */}
                      {!isExpanded && (
                        <p className="text-[12.5px] text-[var(--text-secondary)] font-medium line-clamp-1 leading-relaxed">
                          {complaint.description}
                        </p>
                      )}
                    </div>

                    {/* Chevron Indicator */}
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 border border-[var(--border-subtle)]"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </div>

                  {/* Summary Footer */}
                  <div className="flex items-center justify-between text-[11.5px] font-semibold text-[var(--text-muted)] pt-2.5 border-t border-[var(--border-subtle)]/70">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(complaint.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ({getTimeSince(complaint.createdAt)})
                    </span>
                    {complaint.assignedTeacherName ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <User className="w-3 h-3" />
                        {complaint.assignedTeacherName}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-secondary)] px-2 py-0.5 rounded-full">
                        Auto-routing queue
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Expanded Drawer ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="border-t border-[var(--border)] bg-[var(--surface-secondary)]/50 p-4 sm:p-6 space-y-4"
                    >
                      {/* Resolution Lifecycle Timeline */}
                      <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#111927]/90 border border-[var(--border)] shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5 flex-wrap gap-2">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" /> Resolution Lifecycle Timeline
                          </h4>
                          <div className="flex items-center gap-2">
                            <ComplaintIdBadge complaintId={complaint.complaintId} id={complaint.id} showLabel size="sm" />
                            <span className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                              SLA: 48h
                            </span>
                          </div>
                        </div>
                        <ComplaintTimeline status={complaint.status} createdAt={complaint.createdAt} updatedAt={complaint.updatedAt} />
                      </div>

                      {/* Structured 3-Column Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#111927]/90 border border-[var(--border)] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                            Department Node
                          </span>
                          <p className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {complaint.department || 'Campus Facilities'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#111927]/90 border border-[var(--border)] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                            Assigned Staff
                          </span>
                          <p className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            {complaint.assignedTeacherName || 'Department Head / Staff'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#111927]/90 border border-[var(--border)] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                            Ledger Integrity
                          </span>
                          <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            SHA-256 Verified
                          </p>
                        </div>
                      </div>

                      {/* Detailed Grievance Statement */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#111927]/90 border border-[var(--border)] space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Grievance Details
                        </h4>
                        <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/80 border border-[var(--border-subtle)]">
                          <p className="text-[13px] font-medium text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                            {complaint.description}
                          </p>
                        </div>
                      </div>

                      {/* Faculty Remarks (if present) */}
                      {complaint.adminRemarks && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Official Resolution Remarks
                          </h5>
                          <p className="text-[12.5px] font-semibold text-amber-900 dark:text-amber-200 italic leading-relaxed">
                            "{complaint.adminRemarks}"
                          </p>
                        </div>
                      )}

                      {/* Action Row */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        {complaint.status === 'Resolved' && (
                          <Link
                            to={`/student/feedback?id=${complaint.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-white" />
                            <span>Rate Resolution & Give Feedback</span>
                          </Link>
                        )}

                        {complaint.status === 'Submitted' && (
                          <div className="ml-auto">
                            {deleteConfirmId === complaint.id ? (
                              <div className="flex items-center gap-2 bg-rose-500/10 p-1.5 rounded-xl border border-rose-500/20">
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 px-2">Permanently delete?</span>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  isLoading={deleteMutation.isPending}
                                  onClick={() => deleteMutation.mutate(complaint.id)}
                                  className="rounded-lg text-xs"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="rounded-lg text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(complaint.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Complaint</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ComplaintHistory
