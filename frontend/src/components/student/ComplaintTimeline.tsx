import React from 'react'
import { motion } from 'framer-motion'
import { Check, Clock, ShieldCheck, ArrowRight, Sparkles, FileText, UserCheck, Zap, CheckCircle2 } from 'lucide-react'
import { ComplaintStatus } from '../../types/domain'

interface ComplaintTimelineProps {
  status: ComplaintStatus
  createdAt: string
  updatedAt?: string
}

interface StepInfo {
  name: ComplaintStatus
  label: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
}

const statusSteps: StepInfo[] = [
  { name: 'Submitted', label: 'Submitted', desc: 'Ticket lodged & logged', icon: FileText },
  { name: 'Assigned', label: 'Assigned', desc: 'Routed to faculty officer', icon: UserCheck },
  { name: 'In Progress', label: 'In Progress', desc: 'Active investigation', icon: Zap },
  { name: 'Resolved', label: 'Resolved', desc: 'Resolution verified', icon: CheckCircle2 },
]

export const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({ status, createdAt, updatedAt }) => {
  const isEscalated = status === 'Escalated'
  let effectiveIndex = statusSteps.findIndex((s) => s.name === status)
  if (effectiveIndex === -1) {
    effectiveIndex = isEscalated ? 2 : 0
  }

  const currentStepIndex = Math.max(0, effectiveIndex)

  const getStepState = (index: number) => {
    if (index < currentStepIndex) return 'completed'
    if (index === currentStepIndex) return 'current'
    return 'upcoming'
  }

  const createdDateStr = new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const updatedDateStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'In progress'

  return (
    <div className="w-full py-4 px-2 sm:px-4">
      <div className="relative">
        {/* Visible Background Track Line */}
        <div className="absolute left-[8%] right-[8%] top-6 h-[4px] bg-slate-200 dark:bg-slate-700 -translate-y-1/2 rounded-full pointer-events-none" />

        {/* High-Contrast Active Progress Line */}
        <motion.div
          className="absolute left-[8%] top-6 h-[4px] -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-500 z-0"
          initial={{ width: '0%' }}
          animate={{
            width: `${Math.min(84, (currentStepIndex / (statusSteps.length - 1)) * 84)}%`
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Step Nodes Grid */}
        <div className="relative z-10 grid grid-cols-4 gap-2 sm:gap-4">
          {statusSteps.map((step, index) => {
            const state = getStepState(index)
            const isCompleted = state === 'completed'
            const isCurrent = state === 'current'
            const StepIcon = step.icon

            return (
              <div key={step.name} className="flex flex-col items-center text-center">
                {/* Node Icon Circle */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.08 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-md ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/25 dark:ring-blue-400/30 scale-110'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : isCurrent ? (
                    <StepIcon className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <span className="text-xs font-black font-mono">{index + 1}</span>
                  )}
                </motion.div>

                {/* Step Label (High Contrast) */}
                <p
                  className={`mt-3 text-[12px] sm:text-[13px] font-[800] uppercase tracking-wider ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : isCompleted
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step.label}
                </p>

                {/* Step Description (High Contrast) */}
                <p
                  className={`text-[11px] font-semibold mt-0.5 max-w-[120px] hidden sm:block leading-tight ${
                    isCurrent || isCompleted
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.desc}
                </p>

                {/* Timestamp Pill */}
                {index === 0 && (
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-2xs">
                    {createdDateStr}
                  </span>
                )}
                {index === statusSteps.length - 1 && isCompleted && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mt-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                    {updatedDateStr}
                  </span>
                )}
                {isCurrent && index !== 0 && (
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mt-1.5 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-700 shadow-2xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Active Stage
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ComplaintTimeline
