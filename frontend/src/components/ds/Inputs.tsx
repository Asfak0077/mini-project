// Design System — Standard Form Input Components (clean static labels, validation states)
import React, { forwardRef } from 'react'

/* ── HelperText ─────────────────────────────────────────────── */
interface HelperTextProps {
  children: React.ReactNode
  error?: boolean
}

export const HelperText: React.FC<HelperTextProps> = ({ children, error }) => (
  <p className={`text-[13px] mt-1 ${error ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
    {children}
  </p>
)

/* ── FormGroup ─────────────────────────────────────────────── */
interface FormGroupProps {
  children: React.ReactNode
  className?: string
}

export const FormGroup: React.FC<FormGroupProps> = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>{children}</div>
)

/* ── DSInput ─────────────────────────────────────────────────── */
interface DSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  containerClassName?: string
}

export const DSInput = forwardRef<HTMLInputElement, DSInputProps>(
  ({ label, helperText, error, icon, iconRight, containerClassName = '', className = '', id, required, maxLength, value, onChange, placeholder, ...props }, ref) => {
    const valLength = typeof value === 'string' ? value.length : 0

    return (
      <div className={`space-y-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {label} {required && <span className="text-[var(--danger)]">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            required={required}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`
              w-full h-[48px] bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text-heading)]
              rounded-xl px-3.5 text-sm font-normal
              placeholder:text-[var(--placeholder)]
              focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? '!border-[var(--danger)] focus:!ring-[var(--danger)]/20' : ''}
              ${icon ? 'pl-10' : ''}
              ${iconRight ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />

          {iconRight && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10">
              {iconRight}
            </span>
          )}
        </div>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            {error && <HelperText error>{error}</HelperText>}
            {!error && helperText && <HelperText>{helperText}</HelperText>}
          </div>
          {maxLength && (
            <div className="text-xs text-[var(--text-muted)] mt-1 ml-2 shrink-0">
              {valLength} / {maxLength}
            </div>
          )}
        </div>
      </div>
    )
  }
)

DSInput.displayName = 'DSInput'

/* ── DSSelect ─────────────────────────────────────────────────── */
interface DSSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  containerClassName?: string
}

export const DSSelect = forwardRef<HTMLSelectElement, DSSelectProps>(
  ({ label, helperText, error, containerClassName = '', className = '', id, required, children, ...props }, ref) => (
    <div className={`space-y-1.5 w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label} {required && <span className="text-[var(--danger)]">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          className={`
            w-full h-[48px] bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text-heading)]
            rounded-xl px-3.5 pr-10 text-sm font-normal appearance-none
            focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
            transition-colors duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? '!border-[var(--danger)] focus:!ring-[var(--danger)]/20' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {error && <HelperText error>{error}</HelperText>}
      {!error && helperText && <HelperText>{helperText}</HelperText>}
    </div>
  )
)

DSSelect.displayName = 'DSSelect'

/* ── DSTextarea ─────────────────────────────────────────────── */
interface DSTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  containerClassName?: string
}

export const DSTextarea = forwardRef<HTMLTextAreaElement, DSTextareaProps>(
  ({ label, helperText, error, containerClassName = '', className = '', id, required, maxLength, value, onChange, placeholder, ...props }, ref) => {
    const valLength = typeof value === 'string' ? value.length : 0

    return (
      <div className={`space-y-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {label} {required && <span className="text-[var(--danger)]">*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={id}
            required={required}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`
              w-full min-h-[160px] bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text-heading)]
              rounded-xl p-3.5 text-sm font-normal resize-y
              placeholder:text-[var(--placeholder)]
              focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? '!border-[var(--danger)] focus:!ring-[var(--danger)]/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            {error && <HelperText error>{error}</HelperText>}
            {!error && helperText && <HelperText>{helperText}</HelperText>}
          </div>
          {maxLength && (
            <div className="text-xs text-[var(--text-muted)] mt-1 ml-2 shrink-0">
              {valLength} / {maxLength}
            </div>
          )}
        </div>
      </div>
    )
  }
)

DSTextarea.displayName = 'DSTextarea'

