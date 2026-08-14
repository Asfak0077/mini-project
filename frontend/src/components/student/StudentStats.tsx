import React, { useEffect, useState } from 'react'
import { FileText, Clock, Settings, CheckCircle2 } from 'lucide-react'
import { StatCard, AccentTheme } from '../ui/StatCard'

interface StatsData {
  total: number
  pending: number
  inProgress: number
  resolved: number
}

interface StudentStatsProps {
  data: StatsData
  isLoading?: boolean
}

const StudentStats: React.FC<StudentStatsProps> = ({ data, isLoading = false }) => {
  const { total = 0, pending = 0, inProgress = 0, resolved = 0 } = data || {}
  const counts = { total, pending, inProgress, resolved }

  const totalCount = counts.total || 1

  const cards: Array<{
    title: string
    value: number
    icon: React.ReactNode
    accentTheme: AccentTheme
    description: string
    progress?: number
    sparklineData?: number[]
  }> = [
    {
      title: 'Submitted',
      value: counts.total,
      icon: <FileText className="h-5 w-5" />,
      accentTheme: 'blue',
      description: 'Total complaints filed',
      sparklineData: [5, 8, 12, 15, 18, 22, counts.total || 25]
    },
    {
      title: 'Pending',
      value: counts.pending,
      icon: <Clock className="h-5 w-5" />,
      accentTheme: 'orange',
      description: 'Awaiting assignment',
      progress: Math.round((counts.pending / totalCount) * 100)
    },
    {
      title: 'In Progress',
      value: counts.inProgress,
      icon: <Settings className="h-5 w-5 animate-spin-slow" />,
      accentTheme: 'cyan',
      description: 'Currently being addressed',
      progress: Math.round((counts.inProgress / totalCount) * 100)
    },
    {
      title: 'Resolved',
      value: counts.resolved,
      icon: <CheckCircle2 className="h-5 w-5" />,
      accentTheme: 'green',
      description: 'Successfully closed cases',
      progress: Math.round((counts.resolved / totalCount) * 100)
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm animate-pulse space-y-4"
          >
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" />
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-16" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.title}>
          <StatCard
            label={card.title}
            value={card.value}
            icon={card.icon}
            accentTheme={card.accentTheme}
            description={card.description}
            progress={card.progress}
            sparklineData={card.sparklineData}
          />
        </div>
      ))}
    </div>
  )
}

export default React.memo(StudentStats)
