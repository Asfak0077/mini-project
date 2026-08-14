import React, { useEffect, useState } from 'react'
import { BarChart3, Clock, UserCheck, Activity, Award, Sparkles } from 'lucide-react'
import { StatCard, AccentTheme } from '../ui/StatCard'

interface StatsData {
  total: number
  assigned: number
  pending: number
  resolved: number
  today: number
  avgRating: string
}

interface AdminStatsCardsProps {
  data: StatsData
  isLoading?: boolean
  onCardClick?: (type: string) => void
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ data, isLoading = false, onCardClick }) => {
  const { total = 0, assigned = 0, pending = 0, resolved = 0, today = 0, avgRating = '0' } = data || {}
  const counts = { total, assigned, pending, resolved, today }

  const totalComplaints = counts.total || 1

  const cards: Array<{
    id: string
    title: string
    value: string | number
    icon: React.ReactNode
    accentTheme: AccentTheme
    description: string
    progress?: number
    sparklineData?: number[]
  }> = [
    {
      id: 'all',
      title: 'Total Complaints',
      value: counts.total,
      icon: <BarChart3 className="h-5 w-5" />,
      accentTheme: 'blue',
      description: 'All system tickets logged',
      sparklineData: [20, 28, 35, 42, 50, 65, counts.total || 75]
    },
    {
      id: 'today',
      title: "Today's Volume",
      value: counts.today,
      icon: <Activity className="h-5 w-5" />,
      accentTheme: 'cyan',
      description: 'New tickets past 24h',
      sparklineData: [2, 5, 8, 12, 10, 15, counts.today || 18]
    },
    {
      id: 'assigned',
      title: 'Assigned Tasks',
      value: counts.assigned,
      icon: <UserCheck className="h-5 w-5" />,
      accentTheme: 'purple',
      description: 'Routing to faculty',
      progress: Math.round((counts.assigned / totalComplaints) * 100)
    },
    {
      id: 'pending',
      title: 'Pending Action',
      value: counts.pending,
      icon: <Clock className="h-5 w-5" />,
      accentTheme: 'orange',
      description: 'Awaiting triage',
      progress: Math.round((counts.pending / totalComplaints) * 100)
    },
    {
      id: 'resolved',
      title: 'Resolved Cases',
      value: counts.resolved,
      icon: <Award className="h-5 w-5" />,
      accentTheme: 'green',
      description: 'Closed & verified',
      progress: Math.round((counts.resolved / totalComplaints) * 100)
    },
    {
      id: 'rating',
      title: 'Global Rating',
      value: data.avgRating || '4.8 ★',
      icon: <Sparkles className="h-5 w-5" />,
      accentTheme: 'cyan',
      description: 'Student CSAT score',
      sparklineData: [4.2, 4.5, 4.6, 4.7, 4.8, 4.8, 4.9]
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm animate-pulse space-y-3"
          >
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-16" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => onCardClick?.(card.id)}
          className="cursor-pointer"
        >
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

export default React.memo(AdminStatsCards)
