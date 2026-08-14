import { AnalyticsSummary } from '../../types/domain'
import {
  BarChart3,
  Clock,
  Activity,
  CheckCircle2,
  ShieldAlert,
  Zap
} from 'lucide-react'
import { StatCard, AccentTheme } from '../ui/StatCard'

interface KpiCardsProps {
  summary: AnalyticsSummary
}

const KpiCards = ({ summary }: KpiCardsProps) => {
  const cards: Array<{
    label: string
    value: string | number
    icon: React.ReactNode
    accentTheme: AccentTheme
    description: string
    progress?: number
  }> = [
    {
      label: 'Telemetry Total',
      value: summary.total,
      icon: <BarChart3 className="h-5 w-5" />,
      accentTheme: 'blue',
      description: 'System-wide grievance count'
    },
    {
      label: 'Pending Protocols',
      value: summary.pending,
      icon: <Clock className="h-5 w-5" />,
      accentTheme: 'orange',
      description: 'Unassigned or queued',
      progress: summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0
    },
    {
      label: 'In Operation',
      value: summary.inProgress,
      icon: <Activity className="h-5 w-5" />,
      accentTheme: 'cyan',
      description: 'Under active resolution',
      progress: summary.total > 0 ? Math.round((summary.inProgress / summary.total) * 100) : 0
    },
    {
      label: 'Success Delta',
      value: summary.resolved,
      icon: <CheckCircle2 className="h-5 w-5" />,
      accentTheme: 'green',
      description: 'Successfully closed cases',
      progress: summary.total > 0 ? Math.round((summary.resolved / summary.total) * 100) : 0
    },
    {
      label: 'Priority 1 Flux',
      value: summary.escalated,
      icon: <ShieldAlert className="h-5 w-5" />,
      accentTheme: 'red',
      description: 'Escalated priority cases',
      progress: summary.total > 0 ? Math.round((summary.escalated / summary.total) * 100) : 0
    },
    {
      label: 'Resolution Velocity',
      value: `${summary.averageResolutionHours}h`,
      icon: <Zap className="h-5 w-5" />,
      accentTheme: 'purple',
      description: 'Average time to resolve'
    }
  ]

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
      {cards.map((card) => (
        <div key={card.label}>
          <StatCard
            label={card.label}
            value={card.value}
            icon={card.icon}
            accentTheme={card.accentTheme}
            description={card.description}
            progress={card.progress}
          />
        </div>
      ))}
    </section>
  )
}

export default KpiCards
