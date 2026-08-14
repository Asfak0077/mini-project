import React, { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            {icon && <span className="text-[var(--primary)]">{icon}</span>}
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            className={`w-full h-[48px] rounded-xl border bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all duration-200 ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-[var(--border)] focus:border-[#2563EB]'
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs font-bold text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[var(--text-muted)]">{helperText}</p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, icon, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            {icon && <span className="text-[var(--primary)]">{icon}</span>}
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full rounded-xl border bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all duration-200 min-h-[140px] resize-none ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-[var(--border)] focus:border-[#2563EB]'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
  options?: { value: string; label: string }[]
  children?: React.ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, icon, error, options, children, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            {icon && <span className="text-[var(--primary)]">{icon}</span>}
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full h-[48px] rounded-xl border bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB] transition-all duration-200 cursor-pointer ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-[var(--border)] focus:border-[#2563EB]'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[var(--surface)] text-[var(--text-primary)]">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
