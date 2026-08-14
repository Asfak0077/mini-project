// Design System — Page Layout components
import React from 'react'

/* ── PageHeader ──────────────────────────────────────────────── */
interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumb,
  className = ''
}) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 ${className}`}
  >
    <div>
      {breadcrumb && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          {breadcrumb}
        </div>
      )}
      {badge && <div className="mb-2">{badge}</div>}
      <h1 className="text-[28px] sm:text-[30px] font-[750] text-[var(--text-primary)] tracking-[-0.035em] leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14px] text-[var(--text-secondary)] mt-[6px] max-w-2xl font-normal leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex items-center gap-2.5 shrink-0 mt-2 sm:mt-0">
        {actions}
      </div>
    )}
  </div>
)

/* ── PageSection ─────────────────────────────────────────────── */
interface PageSectionProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export const PageSection: React.FC<PageSectionProps> = ({
  children,
  title,
  subtitle,
  actions,
  className = ''
}) => (
  <section className={`space-y-4 ${className}`}>
    {(title || subtitle || actions) && (
      <div className="flex items-center justify-between gap-4">
        <div>
          {title && (
            <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    )}
    {children}
  </section>
)
