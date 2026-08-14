import React from 'react'
import { Check, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
}

interface StrengthCriteria {
  label: string
  met: boolean
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  if (!password) {
    return null
  }

  const criteriaList: StrengthCriteria[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character (!@#$...)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) }
  ]

  const metCount = criteriaList.filter((c) => c.met).length

  let strengthLabel = 'Weak'
  let strengthColor = 'text-rose-600 dark:text-rose-400'
  let barColor = 'bg-rose-500'

  if (metCount === 5) {
    strengthLabel = 'Strong'
    strengthColor = 'text-emerald-600 dark:text-emerald-400'
    barColor = 'bg-emerald-500'
  } else if (metCount >= 3) {
    strengthLabel = 'Moderate'
    strengthColor = 'text-amber-600 dark:text-amber-400'
    barColor = 'bg-amber-500'
  }

  return (
    <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2.5 my-1 text-left">
      {/* Strength meter header */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Password Strength
        </span>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${strengthColor}`}>
          {strengthLabel}
        </span>
      </div>

      {/* 5-segment progress bar */}
      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`h-full rounded-full transition-all duration-300 ${
              index < metCount ? barColor : 'bg-[var(--border)]'
            }`}
          />
        ))}
      </div>

      {/* Checklist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {criteriaList.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-[11.5px] transition-colors">
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                item.met
                  ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-950'
                  : 'bg-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              {item.met ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <X className="w-2.5 h-2.5 stroke-[2.5]" />}
            </div>
            <span
              className={`truncate font-medium ${
                item.met ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PasswordStrengthIndicator
