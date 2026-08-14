// UI Primitive — Badge (enterprise update)
import React from 'react'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'amber' | 'ghost'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  icon?: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void
}

const variantMap: Record<BadgeVariant, string> = {
  default:  'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]',
  primary:  'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary-border)]',
  success:  'bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success)]/25',
  warning:  'bg-[var(--warning-subtle)] text-[var(--warning)] border border-[var(--warning)]/25',
  danger:   'bg-[var(--danger-subtle)] text-[var(--danger)] border border-[var(--danger)]/25',
  info:     'bg-[var(--info-subtle)] text-[var(--info)] border border-[var(--info)]/25',
  violet:   'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/25',
  amber:    'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25',
  ghost:    'bg-transparent text-[var(--text-muted)] border border-[var(--border)]',
}

export const Badge: React.FC<BadgeProps> = ({
  children, variant = 'default', icon, size = 'md', className = '', onClick
}) => (
  <span
    onClick={onClick}
    className={`
      inline-flex items-center gap-1.5 rounded-full font-medium leading-none
      ${size === 'sm' ? 'px-2 py-0.5 text-[0.65rem]' : 'px-2.5 py-1 text-xs'}
      ${variantMap[variant]}
      ${className}
    `}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    {children}
  </span>
)
