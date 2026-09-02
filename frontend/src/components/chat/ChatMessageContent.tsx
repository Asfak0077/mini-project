import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, AlertTriangle, CheckCircle2,
  MapPin, Tag, ArrowRight, Check,
  Copy, Edit3, Loader2, Star, Sparkles, LogIn, Lock,
  Users, Eye, Plus, ThumbsUp, ShieldAlert, Clock
} from 'lucide-react'

import {
  StructuredComplaint,
  StructuredFeedback,
  DuplicateMatch,
  ComplaintQueryResult,
  EligibleResolvedComplaint,
  RAGSource
} from '../../services/chatbotService'

interface ChatMessageContentProps {
  content: string
  isUser?: boolean
  structuredComplaint?: StructuredComplaint | null
  structuredFeedback?: StructuredFeedback | null
  duplicateMatches?: DuplicateMatch[] | null
  queryResults?: ComplaintQueryResult[] | null
  eligibleComplaints?: EligibleResolvedComplaint[] | null
  ragSources?: RAGSource[] | null
  widgetData?: any
  onCreateComplaint?: (draft: StructuredComplaint) => void
  onEditComplaint?: (draft: StructuredComplaint) => void
  onCancelComplaint?: () => void
  onSubmitFeedback?: (feedback: StructuredFeedback) => void
  onEditFeedback?: (feedback: StructuredFeedback) => void
  onCancelFeedback?: () => void
  onSelectResolvedComplaint?: (complaint: EligibleResolvedComplaint) => void
  onSelectComplaintId?: (id: string) => void
  onJoinComplaint?: (complaintId: string) => void
  onCreateAnyway?: (draft: StructuredComplaint) => void
  isSubmittingDraft?: boolean
  isSubmittingFeedback?: boolean
  isJoiningComplaint?: boolean
}


/**
 * Format inline markdown tokens (**bold**, *italic*, `code`)
 */
const formatInlineText = (text: string, isUser = false): React.ReactNode[] => {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g)

  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong
          key={`b-${index}`}
          className={isUser ? 'font-bold !text-white text-white' : 'font-semibold text-slate-900 dark:text-white'}
        >
          {token.slice(2, -2)}
        </strong>
      )
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={`c-${index}`}
          className={`px-1.5 py-0.5 rounded text-[12px] font-mono font-medium ${
            isUser
              ? 'bg-white/20 !text-white text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={`i-${index}`} className={isUser ? 'italic !text-white text-white' : 'italic text-slate-800 dark:text-slate-200'}>
          {token.slice(1, -1)}
        </em>
      )
    }
    return (
      <span key={`t-${index}`} className={isUser ? '!text-white text-white' : ''}>
        {token}
      </span>
    )
  })
}

/**
 * Priority badge helper
 */
const renderPriorityBadge = (priority: string = 'medium') => {
  const p = priority.toLowerCase()
  let color = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
  if (p === 'urgent') {
    color = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 animate-pulse'
  } else if (p === 'high') {
    color = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
  } else if (p === 'low') {
    color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }

  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${color} uppercase tracking-wider`}>
      {priority}
    </span>
  )
}

/**
 * Status badge helper
 */
const renderStatusBadge = (status: string = 'Pending') => {
  const s = status.toLowerCase()
  let color = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
  if (s.includes('resolved') || s.includes('closed')) {
    color = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
  } else if (s.includes('progress')) {
    color = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
  } else if (s.includes('rejected')) {
    color = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
  }

  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {status.trim()}
    </span>
  )
}

/**
 * Sentiment badge helper
 */
const renderSentimentBadge = (sentiment: string = 'Neutral') => {
  const s = sentiment.toLowerCase()
  let color = 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
  if (s.includes('positive')) {
    color = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
  } else if (s.includes('mixed')) {
    color = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
  } else if (s.includes('negative')) {
    color = 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
  }

  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${color}`}>
      {sentiment} Sentiment
    </span>
  )
}

export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  content,
  isUser = false,
  structuredComplaint,
  structuredFeedback,
  duplicateMatches,
  queryResults,
  eligibleComplaints,
  ragSources,
  widgetData,
  onCreateComplaint,
  onEditComplaint,
  onCancelComplaint,
  onSubmitFeedback,
  onEditFeedback,
  onCancelFeedback,
  onSelectResolvedComplaint,
  onSelectComplaintId,
  onJoinComplaint,
  onCreateAnyway,
  isSubmittingDraft = false,
  isSubmittingFeedback = false,
  isJoiningComplaint = false
}) => {
  const navigate = useNavigate()
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [joinedComplaintIds, setJoinedComplaintIds] = useState<Set<string>>(new Set())
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const handleJoinClick = async (complaintId: string) => {
    if (joinedComplaintIds.has(complaintId) || joiningId || isJoiningComplaint) return
    setJoiningId(complaintId)
    try {
      if (onJoinComplaint) {
        await onJoinComplaint(complaintId)
      }
      setJoinedComplaintIds(prev => new Set([...prev, complaintId]))
    } finally {
      setJoiningId(null)
    }
  }


  if (!content && !structuredComplaint && !structuredFeedback && !queryResults && !eligibleComplaints) return null

  // User Message Rendering
  if (isUser) {
    const lines = content.split('\n')
    return (
      <div className="text-[13.5px] sm:text-[14px] leading-relaxed space-y-1 !text-white text-white font-normal">
        {lines.map((line, idx) => (
          <p key={`u-line-${idx}`} className="break-words !text-white text-white m-0">
            {formatInlineText(line, true)}
          </p>
        ))}
      </div>
    )
  }

  // AI Message Markdown Formatting
  let rawLines = (content || '').split('\n')

  // If a structured feedback card is displayed, filter out raw bullet points that duplicate card data
  if (structuredFeedback) {
    rawLines = rawLines.filter(line => {
      const t = line.trim().toLowerCase()
      if (t.startsWith('# feedback summary') || t.startsWith('### feedback summary') || t.startsWith('feedback summary')) return false
      if (t.includes('resolution quality:') || t.includes('response time:') || t.includes('communication:') || t.includes('overall sentiment:') || t.includes('suggested rating:')) return false
      if (t.startsWith('suggested polished feedback:') || t.startsWith('**suggested polished feedback:**') || t.startsWith('"i want to give feedback')) return false
      return true
    })
  }

  const elements: React.ReactNode[] = []
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null
  let inCodeBlock = false
  let codeBuffer: string[] = []

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`space-y-1 my-1.5 pl-4 text-[13.5px] sm:text-[14px] leading-relaxed text-slate-800 dark:text-slate-200 ${
            currentList.type === 'ul' ? 'list-disc' : 'list-decimal'
          }`}
        >
          {currentList.items.map((item, idx) => (
            <li key={`li-${idx}`} className="break-words">
              {formatInlineText(item)}
            </li>
          ))}
        </ListTag>
      )
      currentList = null
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const trimmed = line.trim()

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const blockCode = codeBuffer.join('\n')
        const codeIdx = elements.length
        elements.push(
          <div key={`code-${codeIdx}`} className="relative my-2 group">
            <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[12px] overflow-x-auto border border-slate-800">
              <code>{blockCode}</code>
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(blockCode)
                setCopiedCodeIdx(codeIdx)
                setTimeout(() => setCopiedCodeIdx(null), 2000)
              }}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[11px] flex items-center gap-1"
              title="Copy code"
            >
              {copiedCodeIdx === codeIdx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )
        codeBuffer = []
        inCodeBlock = false
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 dark:text-white mt-2 mb-0.5 leading-snug"
        >
          {formatInlineText(trimmed.slice(4))}
        </h4>
      )
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-[14px] sm:text-[15px] font-bold text-slate-900 dark:text-white mt-2.5 mb-1 leading-snug"
        >
          {formatInlineText(trimmed.slice(3))}
        </h3>
      )
      continue
    }

    if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-[15px] sm:text-[16px] font-bold text-slate-900 dark:text-white mt-3 mb-1 leading-tight"
        >
          {formatInlineText(trimmed.slice(2))}
        </h2>
      )
      continue
    }

    // Unordered List
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/)
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList()
        currentList = { type: 'ul', items: [] }
      }
      currentList.items.push(bulletMatch[1])
      continue
    }

    // Ordered List
    const numberMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (numberMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList()
        currentList = { type: 'ol', items: [] }
      }
      currentList.items.push(numberMatch[1])
      continue
    }

    // Empty line
    if (!trimmed) {
      flushList()
      continue
    }

    // Standard paragraph
    flushList()
    elements.push(
      <p
        key={`p-${elements.length}`}
        className="text-[13.5px] sm:text-[14px] leading-relaxed text-slate-800 dark:text-slate-200 my-1 break-words font-normal"
      >
        {formatInlineText(trimmed)}
      </p>
    )
  }

  flushList()

  return (
    <div className="space-y-2 break-words">
      {/* Markdown Body */}
      {elements.length > 0 && <div className="space-y-0.5">{elements}</div>}

      {/* ── Eligible Resolved Complaints Selection List ───────────────── */}
      {eligibleComplaints && eligibleComplaints.length > 0 && !isDismissed && (
        <div className="my-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-left">
          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
            <span>Select Resolved Complaint to Rate</span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {eligibleComplaints.map((c) => (
              <div
                key={`elig-${c.complaintId}`}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs hover:border-blue-400 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[12.5px] text-blue-600 dark:text-blue-400">{c.complaintId}</span>
                    <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/40">Resolved</span>
                  </div>
                  <h5 className="text-[13px] font-medium text-slate-900 dark:text-white truncate mt-0.5">
                    {c.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Faculty: {c.assignedTeacherName} • Dept: {c.department}
                  </p>
                </div>

                {onSelectResolvedComplaint && (
                  <button
                    onClick={() => onSelectResolvedComplaint(c)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    Rate <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Structured Feedback Analysis Card ─────────────────────────── */}
      {structuredFeedback && !isDismissed && (
        <div className="my-2.5 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2.5 text-left shadow-xs">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-2">
            <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>FEEDBACK ANALYSIS</span>
            </div>
            {renderSentimentBadge(structuredFeedback.sentiment)}
          </div>

          {/* Linked Complaint & Suggested Rating */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                {structuredFeedback.complaintId}
              </span>
              <h4 className="text-[13.5px] font-semibold text-slate-900 dark:text-white leading-snug">
                {structuredFeedback.complaintTitle}
              </h4>
            </div>

            {/* Star Rating Display */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={`star-${star}`}
                  className={`w-3.5 h-3.5 ${
                    star <= (structuredFeedback.suggestedRating || 3)
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              ))}
              <span className="text-[11.5px] font-bold text-slate-900 dark:text-white ml-1">
                {structuredFeedback.suggestedRating}/5
              </span>
            </div>
          </div>

          {/* Metric Breakdown Grid */}
          <div className="grid grid-cols-3 gap-2 text-[11.5px]">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Resolution
              </span>
              <span className={`font-semibold mt-0.5 block ${structuredFeedback.resolutionQuality === 'Poor' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {structuredFeedback.resolutionQuality}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Response Time
              </span>
              <span className={`font-semibold mt-0.5 block ${structuredFeedback.responseTime === 'Poor' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {structuredFeedback.responseTime}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Communication
              </span>
              <span className={`font-semibold mt-0.5 block ${structuredFeedback.communication === 'Poor' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {structuredFeedback.communication}
              </span>
            </div>
          </div>

          {/* Suggested Feedback Quotation Block */}
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              Suggested Feedback
            </span>
            <p className="italic text-slate-800 dark:text-slate-200 font-normal">"{structuredFeedback.suggestedFeedback}"</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-0.5">
            {onCancelFeedback && (
              <button
                onClick={() => {
                  setIsDismissed(true)
                  onCancelFeedback()
                }}
                disabled={isSubmittingFeedback}
                className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            {onEditFeedback && (
              <button
                onClick={() => onEditFeedback(structuredFeedback)}
                disabled={isSubmittingFeedback}
                className="px-3 py-1.5 rounded-xl text-[12px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Feedback</span>
              </button>
            )}

            {onSubmitFeedback && (
              <button
                onClick={() => onSubmitFeedback(structuredFeedback)}
                disabled={isSubmittingFeedback}
                className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSubmittingFeedback ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Use This Feedback</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modern AI Complaint Duplicate Detection Card ─────────────────── */}
      {duplicateMatches && duplicateMatches.length > 0 && !isDismissed && (
        <div className="my-3 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 shadow-md space-y-3.5 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Top Header */}
          <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 dark:border-amber-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  Similar Complaint Found
                </h4>
                <p className="text-[11.5px] text-amber-700 dark:text-amber-400">
                  An active issue was already registered for this campus location
                </p>
              </div>
            </div>

            {duplicateMatches[0] && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  duplicateMatches[0].similarityScore >= 80 || duplicateMatches[0].duplicateType === 'HIGH_CONFIDENCE_DUPLICATE'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
                    : duplicateMatches[0].similarityScore >= 60
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {duplicateMatches[0].similarityScore >= 80 ? 'High-Confidence Match' : 'Possible Duplicate'} ({duplicateMatches[0].similarityScore}%)
              </span>
            )}
          </div>

          {/* Cards for each matching complaint */}
          <div className="space-y-3">
            {duplicateMatches.map((dup) => {
              const isJoined = joinedComplaintIds.has(dup.complaintId)
              const isJoining = joiningId === dup.complaintId
              const affectedCount = (dup.affectedCount || 1) + (isJoined ? 1 : 0)
              const simScore = dup.similarityScore || 75

              return (
                <div
                  key={`dup-${dup.complaintId}`}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 shadow-xs space-y-2.5"
                >
                  {/* Top Bar: ID + Status + Similarity Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {dup.complaintId}
                        </span>
                        {renderStatusBadge(dup.status)}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>Similarity:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{simScore}%</span>
                      </div>
                    </div>

                    {/* Animated Similarity Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ease-out rounded-full ${
                          simScore >= 80
                            ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                            : simScore >= 60
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                            : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(8, simScore))}%` }}
                      />
                    </div>
                  </div>

                  {/* Complaint Title */}
                  <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                    {dup.title}
                  </h4>

                  {/* Metadata Chips Grid */}
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60">
                      <Tag className="w-3 h-3 text-slate-500" />
                      {dup.category}
                    </span>

                    {dup.location && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {dup.location}
                      </span>
                    )}

                    {dup.createdAt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(dup.createdAt).toLocaleDateString()}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                      <Users className="w-3 h-3 text-blue-500" />
                      {affectedCount} Affected Student{affectedCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* ── 3 Action Buttons ── */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center gap-2">
                    {/* Action 1: View Existing Complaint */}
                    {onSelectComplaintId && (
                      <button
                        onClick={() => onSelectComplaintId(dup.complaintId)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                        <span>View Complaint</span>
                      </button>
                    )}

                    {/* Action 2: I'm Also Facing This Issue */}
                    <button
                      onClick={() => handleJoinClick(dup.complaintId)}
                      disabled={isJoined || isJoining || isJoiningComplaint}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        isJoined
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white'
                      }`}
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Joining...</span>
                        </>
                      ) : isJoined ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>You've Joined This Issue</span>
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>I'm Also Facing This Issue</span>
                        </>
                      )}
                    </button>

                    {/* Action 3: Create New Complaint Anyway */}
                    {structuredComplaint && (
                      <button
                        onClick={() => {
                          if (onCreateAnyway) {
                            onCreateAnyway(structuredComplaint)
                          } else if (onCreateComplaint) {
                            onCreateComplaint(structuredComplaint)
                          }
                        }}
                        disabled={isSubmittingDraft}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        {isSubmittingDraft ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Anyway</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Structured Complaint Action Card (COMPLAINT DETECTED) ──────── */}
      {structuredComplaint && (!duplicateMatches || duplicateMatches.length === 0) && !isDismissed && (
        <div className="my-2.5 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2.5 text-left shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-2">
            <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>COMPLAINT DETECTED</span>
            </div>
            {renderPriorityBadge(structuredComplaint.priority)}
          </div>

          {/* Details */}
          <div className="space-y-1">
            <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white leading-snug">
              {structuredComplaint.title}
            </h4>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[12px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                <Tag className="w-3 h-3 text-blue-600 dark:text-blue-400" /> {structuredComplaint.category}
              </span>
              {structuredComplaint.location && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                  <MapPin className="w-3 h-3 text-rose-500" /> {structuredComplaint.location}
                </span>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {structuredComplaint.description}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-0.5">
            {onCancelComplaint && (
              <button
                onClick={() => {
                  setIsDismissed(true)
                  onCancelComplaint()
                }}
                disabled={isSubmittingDraft}
                className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            {onEditComplaint && (
              <button
                onClick={() => onEditComplaint(structuredComplaint)}
                disabled={isSubmittingDraft}
                className="px-3 py-1.5 rounded-xl text-[12px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            )}

            {onCreateComplaint && (
              <button
                onClick={() => onCreateComplaint(structuredComplaint)}
                disabled={isSubmittingDraft}
                className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSubmittingDraft ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Create Complaint</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Verified Database Query Results ────────────────────────────── */}
      {queryResults && queryResults.length > 0 && (
        <div className="my-2 space-y-2 text-left">
          {queryResults.map((item) => (
            <div
              key={`query-${item.complaintId}`}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[13px] text-blue-600 dark:text-blue-400">{item.complaintId}</span>
                  {renderStatusBadge(item.status)}
                </div>
                {item.priority && renderPriorityBadge(item.priority)}
              </div>

              <h4 className="text-[13.5px] font-semibold text-slate-900 dark:text-white mt-0.5">
                {item.title}
              </h4>

              <div className="grid grid-cols-2 gap-2 text-[11.5px] pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Category</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                </div>
                {item.assignedTeacherName && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faculty</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.assignedTeacherName}</span>
                  </div>
                )}
              </div>

              {item.resolutionNotes && (
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/80 text-[12px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Resolution Notes
                  </span>
                  <p className="text-slate-600 dark:text-slate-300">{item.resolutionNotes}</p>
                </div>
              )}

              {onSelectComplaintId && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => onSelectComplaintId(item.complaintId)}
                    className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    View in History <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── RAG Grounded Sources Badges ── */}
      {ragSources && ragSources.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-left">
          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Grounded Policy Sources:
          </span>
          {ragSources.map((src, i) => (
            <span
              key={`rag-${i}`}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
            >
              {src.title}
            </span>
          ))}
        </div>
      )}

      {/* ── Sign In to Continue CTA Button for Guest Mode ── */}
      {(widgetData?.type === 'AUTH_REQUIRED' || (typeof content === 'string' && content.includes('Please sign in to securely access'))) && (
        <div className="mt-3 pt-1 flex items-center justify-start text-left">
          <button
            onClick={() => navigate(widgetData?.target || '/login')}
            className="px-4 py-2 rounded-xl text-[12.5px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Continue</span>
          </button>
        </div>
      )}
    </div>
  )
}


export default ChatMessageContent
