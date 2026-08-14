import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import AppShell from '../components/ds/AppShell'
import { getAllFeedback, FeedbackPayload } from '../services/feedbackService'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import {
  BarChart3, Users, Star, AlertTriangle, Zap, Target, Shield, Calendar
} from 'lucide-react'
import { motion } from 'framer-motion'

const GRADIENTS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#22c55e'
]

const FeedbackAnalyticsPage = () => {
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['feedback_analytics'],
    queryFn: getAllFeedback
  })

  const todayFormatted = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric'
  }), [])

  const stats = useMemo(() => {
    if (!feedbacks.length) return null

    const total = feedbacks.length
    const avgRating = (feedbacks.reduce((acc: number, curr: FeedbackPayload) => acc + curr.rating, 0) / total).toFixed(1)

    const distribution = [0, 0, 0, 0, 0]
    feedbacks.forEach((f: FeedbackPayload) => {
      if (f.rating >= 1 && f.rating <= 5) {
        distribution[f.rating - 1]++
      }
    })

    const distributionData = [
      { name: '1 Star', count: distribution[0] },
      { name: '2 Stars', count: distribution[1] },
      { name: '3 Stars', count: distribution[2] },
      { name: '4 Stars', count: distribution[3] },
      { name: '5 Stars', count: distribution[4] }
    ]

    const depts: Record<string, { total: number; count: number }> = {}
    feedbacks.forEach((f: FeedbackPayload) => {
      const d = f.department || 'General'
      if (!depts[d]) depts[d] = { total: 0, count: 0 }
      depts[d].total += f.rating
      depts[d].count += 1
    })

    const departmentData = Object.keys(depts).map((d) => ({
      name: d,
      avg: Number((depts[d].total / depts[d].count).toFixed(1))
    }))

    return { total, avgRating, distributionData, departmentData }
  }, [feedbacks])

  if (isLoading) return <LoadingSpinner />

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
              Satisfaction & Service Analytics
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
              Real-time synthesis of student satisfaction data, department benchmarks, and ratings distribution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--card)] px-3.5 py-2 rounded-[14px] border border-[var(--border)] shadow-[var(--shadow-sm)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{todayFormatted}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--active-text)] bg-[var(--active-bg)] px-3 py-2 rounded-[14px] border border-[var(--border-subtle)]">
              <Shield className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </div>
          </div>
        </div>

        {!stats ? (
          <div className="flex flex-col items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--card)] py-20 text-center shadow-[var(--shadow-md)]">
            <p className="text-[var(--text-muted)] font-medium text-sm">No feedback data available for analysis yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
              {[
                { label: 'TOTAL REVIEWS', value: stats.total, icon: Users, bg: 'bg-[var(--primary-subtle)] text-[var(--accent)]' },
                { label: 'AVG RATING', value: `${stats.avgRating} ★`, icon: Star, bg: 'bg-purple-500/15 text-purple-500' },
                { label: 'POSITIVE BIAS', value: `${Math.round((feedbacks.filter((f: any) => f.rating >= 4).length / (feedbacks.length || 1)) * 100)}%`, icon: Zap, bg: 'bg-[var(--active-bg)] text-[var(--active-text)]' },
                { label: 'CRITICAL ISSUES', value: feedbacks.filter((f: any) => f.rating <= 2).length, icon: AlertTriangle, bg: 'bg-rose-500/15 text-rose-500' }
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
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-[800] text-[var(--text-primary)] tracking-tight">Rating Spectrum</h3>
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.distributionData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.15)" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={70} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '14px', color: '#111827', boxShadow: '0 4px 18px rgba(15,23,42,0.08)' }} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                        {stats.distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={GRADIENTS[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Averages */}
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-[800] text-[var(--text-primary)] tracking-tight">Department Averages</h3>
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.departmentData} margin={{ bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                      <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '14px', color: '#111827', boxShadow: '0 4px 18px rgba(15,23,42,0.08)' }} />
                      <Bar dataKey="avg" fill="#111827" radius={[8, 8, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default FeedbackAnalyticsPage
