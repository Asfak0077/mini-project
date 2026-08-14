// Design System — Card components
import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { MOTION, hoverLift } from '../../utils/animations'

/* ── DashboardCard ───────────────────────────────────────────── */
interface DashboardCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  children,
  className = '',
  hover = true,
  padding = 'md',
  ...props
}) => {
  const padMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-6 sm:p-8' }
  return (
    <motion.div
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`
        bg-[var(--card)] border border-[var(--border)]
        rounded-2xl shadow-sm
        hover:shadow-md
        transition-all duration-200
        ${padMap[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ── StatsCard ───────────────────────────────────────────────── */
interface StatsCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: string; up: boolean }
  description?: string
  accent?: 'blue' | 'violet' | 'green' | 'amber' | 'red' | 'cyan'
  onClick?: () => void
  className?: string
}

const accentMap = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400',   ring: 'ring-blue-100 dark:ring-blue-800/30' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-100 dark:ring-violet-800/30' },
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-100 dark:ring-emerald-800/30' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-100 dark:ring-amber-800/30' },
  red:    { bg: 'bg-red-50 dark:bg-red-900/20',   text: 'text-red-600 dark:text-red-400',   ring: 'ring-red-100 dark:ring-red-800/30' },
  cyan:   { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-100 dark:ring-cyan-800/30' },
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label, value, icon, trend, description, accent = 'blue', onClick, className = ''
}) => {
  const ac = accentMap[accent]
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5
        shadow-sm hover:shadow-md
        transition-all duration-200 relative overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        {icon && (
          <div className={`p-2.5 rounded-xl ring-1 ${ac.bg} ${ac.ring}`}>
            <span className={ac.text}>{icon}</span>
          </div>
        )}
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            trend.up
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-heading)] tabular-nums tracking-tight mb-0.5">
          {value}
        </p>
        <p className="text-[13px] font-semibold text-[var(--text-secondary)]">{label}</p>
        {description && (
          <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">{description}</p>
        )}
      </div>
    </motion.div>
  )
}

/* ── FormCard ─────────────────────────────────────────────────── */
interface FormCardProps {
  children: React.ReactNode
  className?: string
}

export const FormCard: React.FC<FormCardProps> = ({ children, className = '' }) => (
  <div
    className={`
      bg-[var(--card)] border border-[var(--border)] rounded-2xl
      shadow-sm overflow-hidden p-6
      ${className}
    `}
  >
    {children}
  </div>
)

/* ── DataCard ─────────────────────────────────────────────────── */
interface DataCardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
}

export const DataCard: React.FC<DataCardProps> = ({
  children, title, subtitle, actions, icon, padding = 'md', className = ''
}) => {
  const padMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-6 sm:p-8' }
  return (
    <div
      className={`
        bg-[var(--card)] border border-[var(--border)] rounded-2xl
        shadow-sm overflow-hidden
        ${className}
      `}
    >
      {(title || subtitle || actions || icon) && (
        <div className="flex items-center justify-between gap-4 p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-xl bg-[var(--surface-hover)] text-[var(--text-primary)]">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-sm font-bold text-[var(--text-heading)] tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={padMap[padding]}>
        {children}
      </div>
    </div>
  )
}

/* ── ActionCard (complaint/ticket card) ────────────────────────── */
interface ActionCardProps {
  children: React.ReactNode
  className?: string
  priority?: 'low' | 'medium' | 'high'
}

const priorityBorder: Record<string, string> = {
  high: 'border-l-[3px] border-l-red-500',
  medium: 'border-l-[3px] border-l-amber-500',
  low: 'border-l-[3px] border-l-emerald-500',
}

export const ActionCard: React.FC<ActionCardProps> = ({ children, className = '', priority }) => (
  <motion.div
    whileHover={{ x: 4 }}
    transition={{ duration: 0.2 }}
    className={`
      bg-[var(--card)] border border-[var(--border)] rounded-xl p-4
      shadow-sm hover:shadow-md
      transition-all duration-200
      ${priority ? priorityBorder[priority] : ''}
      ${className}
    `}
  >
    {children}
  </motion.div>
)
