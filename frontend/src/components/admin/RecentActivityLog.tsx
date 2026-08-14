import { useQuery } from '@tanstack/react-query'
import { Activity, Shield, Zap, CheckCircle2, UserCheck, Clock, RefreshCw, Star, AlertTriangle } from 'lucide-react'
import { fetchActivityLogs, fetchTeacherActivityLogs, ActivityLogEntry } from '../../services/complaintService'
import { formatDisplayComplaintId } from '../shared/ComplaintIdBadge'

interface Props {
  teacherId?: string
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  created:           { label: 'New Complaint',       color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: <Zap className="h-4 w-4" /> },
  assigned:          { label: 'Assigned to Teacher', color: 'text-purple-500',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  icon: <UserCheck className="h-4 w-4" /> },
  reassigned:        { label: 'Reassigned',          color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: <RefreshCw className="h-4 w-4" /> },
  status_changed:    { label: 'Status Updated',      color: 'text-indigo-500',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  icon: <Clock className="h-4 w-4" /> },
  escalated:         { label: 'Escalated',           color: 'text-rose-500',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: <AlertTriangle className="h-4 w-4" /> },
  deleted:           { label: 'Deleted',             color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   icon: <Shield className="h-4 w-4" /> },
  feedback_submitted:{ label: 'Feedback Submitted',  color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <Star className="h-4 w-4" /> },
}

const getConfig = (action: string) =>
  ACTION_CONFIG[action] ?? { label: action, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: <CheckCircle2 className="h-4 w-4" /> }

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const RecentActivityLog = ({ teacherId }: Props = {}) => {
  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['activity-logs', teacherId ?? 'all'],
    queryFn: () => teacherId ? fetchTeacherActivityLogs(teacherId, 15) : fetchActivityLogs(15)
  })

  return (
    <div
      className="p-6 sm:p-7 rounded-[22px] border bg-[var(--card)] border-[var(--border)] shadow-[var(--shadow-md)] h-full relative overflow-hidden space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[14px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-[800] text-[var(--text-primary)] tracking-tight">Activity Log</h3>
            <p className="text-xs font-semibold text-[var(--text-muted)]">Live operational events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-[var(--surface-secondary)] animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)]">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-widest">No activity recorded yet</p>
          </div>
        ) : (
          logs.map((log: ActivityLogEntry) => {
            const cfg = getConfig(log.action)
            const complaint = log.complaintId
            return (
              <div
                key={log._id}
                className={`flex items-start gap-3 p-3.5 rounded-[16px] border ${cfg.border} ${cfg.bg} transition-all duration-200`}
              >
                <div className={`p-2 rounded-[12px] shrink-0 ${cfg.color}`}>
                  {cfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>

                  {complaint && (
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">
                      <span className="font-mono text-blue-600 dark:text-blue-400 mr-1.5 font-extrabold">
                        {formatDisplayComplaintId(complaint.complaintId || complaint.ticketNumber || (complaint._id ? `CR-${String(complaint._id).slice(-3).toUpperCase()}` : ''))}
                      </span>
                      {complaint.category || complaint.title || 'Complaint'}
                      {complaint.department && <span className="text-[var(--text-muted)] font-semibold"> · {complaint.department}</span>}
                    </p>
                  )}

                  {log.performedBy?.name && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium">
                      by <span className="font-bold text-[var(--text-primary)]">{log.performedBy.name}</span>
                      {log.performedBy.role && <span className="ml-1 capitalize">({log.performedBy.role})</span>}
                    </p>
                  )}

                  {log.notes && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1 italic truncate">"{log.notes}"</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default RecentActivityLog
