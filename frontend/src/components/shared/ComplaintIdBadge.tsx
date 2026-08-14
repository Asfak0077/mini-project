import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useToast } from './ToastNotification'

interface ComplaintIdBadgeProps {
  id?: string
  complaintId?: string
  ticketNumber?: string
  showLabel?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Ensures the visible Complaint ID is strictly in the CR-001, CR-002, CR-010, CR-100 format.
 */
export const formatDisplayComplaintId = (rawId?: string, fallback = 'CR-001'): string => {
  if (!rawId) return fallback
  const clean = String(rawId).trim()
  if (/^CR-\d+$/i.test(clean)) {
    const num = parseInt(clean.replace(/^CR-/i, ''), 10)
    return `CR-${String(num).padStart(3, '0')}`
  }
  // If ObjectId or other legacy format, fallback gracefully to a 3-digit CR representation
  if (clean.length >= 3) {
    return `CR-${clean.slice(-3).toUpperCase()}`
  }
  return fallback
}

export const ComplaintIdBadge: React.FC<ComplaintIdBadgeProps> = ({
  id,
  complaintId,
  ticketNumber,
  showLabel = false,
  className = '',
  size = 'md'
}) => {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  const resolvedId = formatDisplayComplaintId(complaintId || ticketNumber || id)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard.writeText(resolvedId)
    setCopied(true)
    showToast('info', 'Complaint ID copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-[13.5px] px-3 py-1.5 gap-2'
  }

  return (
    <div className={`inline-flex items-center ${showLabel ? 'gap-1.5' : ''} ${className}`}>
      {showLabel && (
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
          Complaint ID
        </span>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className={`
          inline-flex items-center font-mono font-bold rounded-lg
          bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-500/15 dark:hover:bg-blue-500/25
          text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:border-blue-500/30
          transition-all cursor-pointer select-none group shrink-0
          ${sizeClasses[size]}
        `}
        title={`Copy ${resolvedId}`}
        aria-label={`Copy Complaint ID ${resolvedId}`}
      >
        <span>{resolvedId}</span>
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        ) : (
          <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </button>
    </div>
  )
}

export default ComplaintIdBadge
