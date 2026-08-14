// UI Primitive — StatCard (enterprise update)
import React from 'react'
import { motion } from 'framer-motion'
import { MOTION, hoverLift } from '../../utils/animations'

export type AccentTheme = 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'red' | 'amber' | 'violet'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  accentTheme?: AccentTheme
  trend?: { value: string; up: boolean }
  progress?: number
  sparklineData?: number[]
  onClick?: () => void
  className?: string
  isLoading?: boolean
}

const accentMap: Record<AccentTheme, { bg: string; text: string; ring: string }> = {
  blue:   { bg: 'bg-blue-500/10 dark:bg-blue-500/15',     text: 'text-blue-600 dark:text-blue-400',     ring: 'ring-blue-500/25' },
  green:  { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/25' },
  orange: { bg: 'bg-orange-500/10 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500/25' },
  purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/25' },
  cyan:   { bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',     text: 'text-cyan-600 dark:text-cyan-400',     ring: 'ring-cyan-500/25' },
  red:    { bg: 'bg-red-500/10 dark:bg-red-500/15',       text: 'text-red-600 dark:text-red-400',       ring: 'ring-red-500/25' },
  amber:  { bg: 'bg-amber-500/10 dark:bg-amber-500/15',   text: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-500/25' },
  violet: { bg: 'bg-violet-500/10 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/25' },
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon, description, accentTheme = 'blue', trend, progress,
  onClick, className = '', isLoading
}) => {
  const ac = accentMap[accentTheme]

  if (isLoading) {
    return (
      <div className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-sm)] space-y-3 ${className}`}>
        <div className="flex justify-between">
          <div className="h-10 w-10 rounded-xl bg-[var(--surface-secondary)] animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-[var(--surface-secondary)] animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-[var(--surface-secondary)] rounded animate-pulse mt-2" />
        <div className="h-4 w-28 bg-[var(--surface-secondary)] rounded animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div
      whileHover={hoverLift}
      transition={MOTION.card}
      onClick={onClick}
      className={`
        bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5
        shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]
        hover:border-[var(--border-strong)] transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        {icon && (
          <div className={`p-2.5 rounded-xl ring-1 ${ac.bg} ${ac.ring}`}>
            <span className={`w-5 h-5 flex items-center justify-center ${ac.text}`}>{icon}</span>
          </div>
        )}
        {trend && (
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            trend.up
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums mb-1">
        {value}
      </p>
      <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      )}
      {typeof progress === 'number' && (
        <div className="w-full bg-[var(--surface-secondary)] h-1.5 rounded-full mt-3 overflow-hidden">
          <div className="bg-[var(--primary)] h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </motion.div>
  )
}
