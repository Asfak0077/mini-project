import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import AppShell from '../components/ds/AppShell'
import { getAllFeedback, FeedbackPayload } from '../services/feedbackService'
import { MessageSquare, Star, CheckCircle2, AlertCircle, Shield, Calendar } from 'lucide-react'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const AdminFeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackPayload[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const data = await getAllFeedback()
        setFeedbacks(data)
      } catch (error) {
        console.error('Failed to fetch feedback:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchFeedback()
  }, [])

  const todayFormatted = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric'
  }), [])

  const stats = {
    total: feedbacks.length,
    avgRating: feedbacks.length
      ? (feedbacks.reduce((acc: number, curr: FeedbackPayload) => acc + curr.rating, 0) / feedbacks.length).toFixed(1)
      : '0.0',
    positive: feedbacks.filter((f: FeedbackPayload) => f.rating >= 4).length,
    needsAttention: feedbacks.filter((f: FeedbackPayload) => f.rating <= 2).length
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
              Student Feedback Feed
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
              Qualitative sentiment and service quality metrics across {feedbacks.length} verified submissions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--card)] px-3.5 py-2 rounded-[14px] border border-[var(--border)] shadow-[var(--shadow-sm)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{todayFormatted}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--active-text)] bg-[var(--active-bg)] px-3 py-2 rounded-[14px] border border-[var(--border-subtle)]">
              <Shield className="w-3.5 h-3.5" />
              <span>Verified Analytics</span>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
          {[
            { label: 'TOTAL REVIEWS', value: stats.total, icon: MessageSquare, bg: 'bg-[var(--primary-subtle)] text-[var(--accent)]' },
            { label: 'AVG SCORE', value: `${stats.avgRating} ★`, icon: Star, bg: 'bg-purple-500/15 text-purple-500' },
            { label: 'POSITIVE REVIEWS', value: stats.positive, icon: CheckCircle2, bg: 'bg-[var(--active-bg)] text-[var(--active-text)]' },
            { label: 'NEEDS ATTENTION', value: stats.needsAttention, icon: AlertCircle, bg: 'bg-rose-500/15 text-rose-500' }
          ].map((card, idx) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                whileHover={{ y: -2 }}
                className="p-5 rounded-[18px] bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-md)] flex flex-col justify-between h-[120px] transition-all hover:border-[rgba(148,163,184,0.32)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[var(--text-muted)] tracking-[0.12em] uppercase">
                    {card.label}
                  </span>
                  <div className={`w-8 h-8 rounded-[11px] flex items-center justify-center ${card.bg}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.9} />
                  </div>
                </div>
                <div className="text-2xl font-[800] text-[var(--text-primary)]">
                  {typeof card.value === 'number' ? String(card.value).padStart(2, '0') : card.value}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Feedback Feed Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-[800] text-[var(--text-primary)] tracking-tight">Recent Submissions</h2>
            <span className="text-[11.5px] font-bold text-[var(--text-muted)] px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)]">
              {feedbacks.length} Entries
            </span>
          </div>

          {feedbacks.length === 0 ? (
            <div className="bg-[var(--card)] rounded-[18px] border border-[var(--border)] py-16 text-center shadow-[var(--shadow-md)]">
              <div className="w-14 h-14 rounded-[18px] bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">No Feedback Submitted Yet</h4>
              <p className="text-[13px] font-medium text-[var(--text-muted)] max-w-sm mx-auto">
                Student evaluations on resolved complaints will automatically appear in this feed.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {feedbacks.map((fb, idx) => (
                <motion.div
                  key={fb._id || fb.id || idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-5 shadow-[var(--shadow-md)] space-y-3.5 hover:border-[rgba(148,163,184,0.32)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= fb.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-[var(--border-strong)]'
                          }`}
                        />
                      ))}
                      <span className="text-[12.5px] font-bold text-[var(--text-primary)] ml-1.5">{fb.rating}.0</span>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--text-muted)]">
                      {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                    </span>
                  </div>

                  {(fb.comment || fb.comments) && (
                    <p className="text-[13px] font-medium text-[var(--text-secondary)] italic leading-relaxed bg-[var(--surface-secondary)] p-3.5 rounded-[14px] border border-[var(--border)]">
                      &quot;{fb.comment || fb.comments}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <span>{fb.department || 'General'} Dept</span>
                    {fb.studentName && <span>by {fb.studentName}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default AdminFeedbackPage
