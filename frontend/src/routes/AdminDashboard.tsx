import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Shield, LayoutGrid, CheckCircle, Clock, TrendingUp, Zap,
  Activity, Calendar, Filter, Sparkles, Star, RefreshCw,
  Building2, AlertTriangle, ArrowUpRight, Search
} from 'lucide-react'
import AnalyticsCharts from '../components/admin/AnalyticsCharts'
import ComplaintTable from '../components/admin/ComplaintTable'
import AppShell from '../components/ds/AppShell'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import RecentActivityLog from '../components/admin/RecentActivityLog'
import TeacherPerformance from '../components/admin/TeacherPerformance'
import { assignComplaint, fetchAnalytics, fetchComplaints, updateComplaintStatus } from '../services/complaintService'
import { fetchTeachers } from '../services/teacherService'
import { getAllFeedback } from '../services/feedbackService'
import { ComplaintStatus } from '../types/domain'
import { useToast } from '../components/shared/ToastNotification'
import useSocket from '../hooks/useSocket'
import { motion } from 'framer-motion'

const AdminDashboard = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'pending' | 'resolved' | 'performance'>('all')
  const { showToast } = useToast()

  const complaintsQuery = useQuery({ queryKey: ['complaints'], queryFn: fetchComplaints })
  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })
  const analyticsQuery = useQuery({ queryKey: ['analytics'], queryFn: fetchAnalytics })
  const feedbackQuery = useQuery({ queryKey: ['all-feedback'], queryFn: getAllFeedback })

  useSocket({
    onNewComplaint: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onComplaintAssigned: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onStatusUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    }
  })

  const assignMutation = useMutation({
    mutationFn: ({ complaintId, teacherId }: { complaintId: string; teacherId: string }) => assignComplaint(complaintId, teacherId),
    onSuccess: async () => {
      showToast('success', 'Grievance assigned to faculty successfully!')
      await queryClient.invalidateQueries({ queryKey: ['complaints'] })
      await queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: () => showToast('error', 'Failed to assign complaint')
  })

  const statusMutation = useMutation({
    mutationFn: ({ complaintId, status }: { complaintId: string; status: ComplaintStatus }) => updateComplaintStatus(complaintId, status),
    onSuccess: async () => {
      showToast('success', 'Ticket status updated successfully!')
      await queryClient.invalidateQueries({ queryKey: ['complaints'] })
      await queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: () => showToast('error', 'Failed to update status')
  })

  const filteredComplaints = useMemo(() => {
    const rows = complaintsQuery.data ?? []
    return rows.filter((item) => {
      const matchesSearch =
        search.trim().length === 0 ||
        item.category?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase())

      const statusOk = statusFilter === 'all' || item.status === statusFilter
      const deptOk = deptFilter === 'all' || item.department === deptFilter
      const priorityOk = priorityFilter === 'all' || item.priority === priorityFilter

      if (!matchesSearch || !statusOk || !deptOk || !priorityOk) return false

      if (activeTab === 'assigned') return item.assignedTeacherId && item.status !== 'Resolved'
      if (activeTab === 'pending') return item.status === 'Submitted' && !item.assignedTeacherId
      if (activeTab === 'resolved') return item.status === 'Resolved'
      return true
    })
  }, [complaintsQuery.data, search, deptFilter, priorityFilter, statusFilter, activeTab])

  const departments = useMemo(
    () => Array.from(new Set((complaintsQuery.data ?? []).map((item) => item.department))),
    [complaintsQuery.data]
  )

  const todayFormatted = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }), [])

  const stats = useMemo(() => {
    const all = complaintsQuery.data ?? []
    const feedback = feedbackQuery.data ?? []
    const avgRating = feedback.length > 0
      ? (feedback.reduce((acc: number, curr: any) => acc + curr.rating, 0) / feedback.length).toFixed(1)
      : '5.0'
    return {
      total: all.length,
      assigned: all.filter(c => c.assignedTeacherId).length,
      pending: all.filter(c => c.status === 'Submitted' && !c.assignedTeacherId).length,
      resolved: all.filter(c => c.status === 'Resolved').length,
      avgRating: `${avgRating} ★`,
      today: all.filter(c => {
        const date = new Date(c.createdAt)
        const today = new Date()
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
      }).length
    }
  }, [complaintsQuery.data, feedbackQuery.data])

  if (complaintsQuery.isLoading || teachersQuery.isLoading || analyticsQuery.isLoading) {
    return <LoadingSpinner />
  }

  const tabs = [
    { id: 'all', label: 'All Complaints', icon: LayoutGrid, count: stats.total },
    { id: 'pending', label: 'Pending Assignment', icon: Clock, count: stats.pending },
    { id: 'assigned', label: 'In Progress', icon: Zap, count: stats.assigned },
    { id: 'resolved', label: 'Resolved', icon: CheckCircle, count: stats.resolved },
    { id: 'performance', label: 'Faculty Analytics', icon: TrendingUp },
  ]

  const statCards = [
    {
      label: 'TOTAL COMPLAINTS',
      value: stats.total,
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
      action: () => setActiveTab('all'),
      active: activeTab === 'all'
    },
    {
      label: 'IN PROGRESS',
      value: stats.assigned,
      icon: Zap,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
      action: () => setActiveTab('assigned'),
      active: activeTab === 'assigned'
    },
    {
      label: 'PENDING ACTION',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
      action: () => setActiveTab('pending'),
      active: activeTab === 'pending'
    },
    {
      label: 'RESOLVED CASES',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
      action: () => setActiveTab('resolved'),
      active: activeTab === 'resolved'
    },
    {
      label: 'TODAY FILED',
      value: stats.today,
      icon: Calendar,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
    },
    {
      label: 'STUDENT RATING',
      value: stats.avgRating,
      icon: Star,
      color: 'text-amber-500 bg-amber-500/10'
    }
  ]

  return (
    <AppShell>
      <div className="space-y-5 pb-8">
        {/* ── 1. Header Bar ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
              Administrative Console
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
              Overseeing {filteredComplaints.length} complaints across university departments.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl px-3.5 py-2 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{todayFormatted}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" />
              <span>Master Admin</span>
            </div>
          </div>
        </div>

        {/* ── 2. Metric KPI Cards Row (6 Responsive Cards) ─────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {statCards.map((card, idx) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                whileHover={{ y: -2 }}
                onClick={card.action}
                className={`
                  p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border
                  shadow-[var(--shadow-sm)] flex flex-col justify-between h-[112px] transition-all
                  ${card.action ? 'cursor-pointer hover:border-[var(--accent)] hover:shadow-md' : ''}
                  ${card.active ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20' : 'border-[var(--border)]'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase truncate">
                    {card.label}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="text-xl sm:text-2xl font-[800] text-[var(--text-primary)] tracking-tight">
                  {typeof card.value === 'number' ? String(card.value).padStart(2, '0') : card.value}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ── 3. Segmented Navigation Tabs ─────────────────────────── */}
        <div className="bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-2 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer
                    ${
                      isActive
                        ? 'bg-[#111827] dark:bg-white text-white dark:text-[#111827] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-white/20 dark:bg-black/15 text-white dark:text-[#111827]'
                          : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {activeTab === 'performance' ? (
          <TeacherPerformance />
        ) : (
          <div className="space-y-5">
            {/* ── 4. Search & Filter Suite ─────────────────────────── */}
            <div className="bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl rounded-2xl border border-[var(--border)] p-4 sm:p-5 shadow-[var(--shadow-sm)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search student, keyword, ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[13px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>

                {/* Status Select */}
                <div>
                  <select
                    id="admin-status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[13px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Escalated">Escalated</option>
                  </select>
                </div>

                {/* Department Select */}
                <div>
                  <select
                    id="admin-dept-filter"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[13px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Priority Select */}
                <div>
                  <select
                    id="admin-priority-filter"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[13px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High / Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── 5. Grievance Management Data Table ───────────────── */}
            <ComplaintTable
              complaints={filteredComplaints}
              teachers={teachersQuery.data ?? []}
              onAssign={(complaintId, teacherId) => {
                if (!teacherId) return
                assignMutation.mutate({ complaintId, teacherId })
              }}
              onStatusChange={(complaintId, status) => statusMutation.mutate({ complaintId, status })}
            />

            {/* ── 6. Analytics Charts & Live Activity Log ──────────── */}
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <AnalyticsCharts complaints={filteredComplaints} />
              </div>
              <div className="lg:col-span-4 flex flex-col">
                <div className="bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-sm)] flex-1">
                   <RecentActivityLog />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default AdminDashboard
