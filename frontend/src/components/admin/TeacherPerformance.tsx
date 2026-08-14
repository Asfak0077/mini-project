import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Star, Clock, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react'
import apiClient from '../../services/apiClient'

interface TeacherStats {
  teacherId: string
  name: string
  department: string
  totalAssigned: number
  resolved: number
  active: number
  avgResolutionTime: string
  rating: number
}

const TeacherPerformance: React.FC = () => {
  const { data: teachers, isLoading } = useQuery<TeacherStats[]>({
    queryKey: ['teacher-performance'],
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/teachers/performance')
      return data
    }
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-[22px] bg-[var(--surface-secondary)] border border-[var(--border)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Efficiency Metrics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">Faculty Performance</h2>
          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">Real-time analysis of grievance resolution efficiency by faculty member.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers?.sort((a, b) => b.rating - a.rating).map((teacher, idx) => (
          <motion.div
            key={teacher.teacherId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="p-6 rounded-[22px] border bg-[var(--card)] border-[var(--border)] shadow-[var(--shadow-md)] group hover:border-[rgba(148,163,184,0.32)] transition-all"
          >
            <div className="relative flex flex-col h-full space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-[14px] bg-[var(--surface-secondary)] text-[var(--text-primary)] flex items-center justify-center font-bold border border-[var(--border)]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-[800] text-[var(--text-primary)] leading-tight">{teacher.name}</h3>
                    <p className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{teacher.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-xs font-bold">{teacher.rating}.0</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-[14px] bg-[var(--surface-secondary)] border border-[var(--border)]">
                  <div className="flex items-center gap-1.5 mb-1 text-[var(--text-secondary)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Resolved</span>
                  </div>
                  <p className="text-xl font-[800] text-[var(--text-primary)]">{teacher.resolved}</p>
                </div>
                <div className="p-3.5 rounded-[14px] bg-[var(--surface-secondary)] border border-[var(--border)]">
                  <div className="flex items-center gap-1.5 mb-1 text-[var(--text-secondary)]">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Avg Time</span>
                  </div>
                  <p className="text-xl font-[800] text-[var(--text-primary)]">{teacher.avgResolutionTime}h</p>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Active Load</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-24 bg-[var(--surface-secondary)] rounded-full overflow-hidden border border-[var(--border)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((teacher.active / 10) * 100, 100)}%` }}
                        className="h-full bg-[var(--primary)] rounded-full"
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{teacher.active}</span>
                  </div>
                </div>
                <button className="p-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default TeacherPerformance
