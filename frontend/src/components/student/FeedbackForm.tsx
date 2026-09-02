import React, { FormEvent, useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Star, CheckCircle2, ArrowRight, Info, AlertTriangle,
  Building, Send, ChevronDown, Wand2, FileCheck,
  Award, Sparkles, ShieldCheck, Check, MessageSquare,
  ThumbsUp, HelpCircle, Eye, EyeOff, Bookmark, RotateCcw,
  RefreshCw, CornerDownRight, ThumbsDown, Clock, MessageCircle,
  UserCheck, Shield, ChevronRight, X
} from 'lucide-react'

import { useAuthStore } from '../../store/authStore'
import {
  submitFeedback,
  getStudentFeedback,
  FeedbackDraft,
  saveFeedbackDraftLocal,
  loadFeedbackDraftLocal,
  clearFeedbackDraftLocal,
  ResolutionStatusOption
} from '../../services/feedbackService'
import { fetchStudentComplaints, updateComplaintStatus } from '../../services/complaintService'
import { enhanceFeedbackText } from '../../services/chatbotService'
import { Button } from '../ui/Button'
import ComplaintIdBadge, { formatDisplayComplaintId } from '../shared/ComplaintIdBadge'

interface FeedbackFormProps {
  onSuccess?: () => void
}

// ── Rating Definitions & Labels ──
const OVERALL_RATING_LABELS: Record<number, { label: string; color: string; bg: string; icon: string }> = {
  1: { label: 'Very Dissatisfied', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800', icon: '😞' },
  2: { label: 'Dissatisfied', color: 'text-amber-800 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800', icon: '😕' },
  3: { label: 'Neutral', color: 'text-blue-800 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800', icon: '😐' },
  4: { label: 'Satisfied', color: 'text-indigo-800 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800', icon: '😊' },
  5: { label: 'Very Satisfied', color: 'text-emerald-800 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800', icon: '🌟' }
}

const RESOLUTION_QUALITY_LABELS: Record<number, string> = {
  1: 'Not Resolved',
  2: 'Poor',
  3: 'Acceptable',
  4: 'Good',
  5: 'Excellent'
}

const RESPONSE_TIME_LABELS: Record<number, string> = {
  1: 'Very Slow',
  2: 'Slow',
  3: 'Moderate',
  4: 'Fast',
  5: 'Very Fast'
}

const COMMUNICATION_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent'
}

const STAFF_SUPPORT_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent'
}

const POSITIVE_OPTIONS = [
  'Quick response',
  'Effective resolution',
  'Clear communication',
  'Helpful staff',
  'Professional handling'
]

const IMPROVEMENT_OPTIONS = [
  'Faster response',
  'Better communication',
  'More frequent updates',
  'Better resolution quality',
  'Easier complaint tracking'
]

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess }) => {
  const user = useAuthStore((state) => state.user)
  const studentId = user?.studentId || user?.email || 'STUDENT'
  const [searchParams] = useSearchParams()
  const preselectedTicketId = searchParams.get('id') || ''

  // ── Form State Object ──
  const [draft, setDraft] = useState<FeedbackDraft>({
    complaintId: preselectedTicketId,
    overallRating: 0,
    resolutionQuality: 4,
    responseTime: 4,
    communication: 4,
    staffSupport: 4,
    resolutionStatus: 'Yes, completely resolved',
    unresolvedReason: '',
    feedbackText: '',
    positiveTags: [],
    customPositiveTag: '',
    improvementTags: [],
    customImprovementTag: '',
    recommendationScore: 9,
    isAnonymous: false
  })

  // UI Interactive States
  const [hoverRating, setHoverRating] = useState(0)
  const [hoverQuality, setHoverQuality] = useState(0)
  const [hoverResponse, setHoverResponse] = useState(0)
  const [hoverComm, setHoverComm] = useState(0)
  const [hoverStaff, setHoverStaff] = useState(0)

  // AI Assistant States
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiMode, setAiMode] = useState<'improve' | 'detailed' | 'short' | 'professional'>('improve')
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)

  // Draft & Notification States
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const [reopenSuccess, setReopenSuccess] = useState(false)

  // ── Queries ──
  const { data: complaints = [] } = useQuery({
    queryKey: ['student-complaints', user?.studentId],
    queryFn: () => fetchStudentComplaints(user?.studentId || ''),
    enabled: !!user?.studentId
  })

  const { data: feedbackHistory = [] } = useQuery({
    queryKey: ['student-feedback', user?.studentId],
    queryFn: () => getStudentFeedback(user?.studentId || ''),
    enabled: !!user?.studentId
  })

  const resolvedComplaints = useMemo(
    () => complaints.filter((c: any) => c.status === 'Resolved'),
    [complaints]
  )
  const submittedFeedbackIds = useMemo(
    () => new Set(feedbackHistory.map((f: any) => f.complaintId)),
    [feedbackHistory]
  )

  // Auto-select first non-evaluated resolved ticket if none selected
  useEffect(() => {
    if (!draft.complaintId && resolvedComplaints.length > 0) {
      const firstPending = resolvedComplaints.find((c: any) => !submittedFeedbackIds.has(c.id))
      if (firstPending) {
        setDraft((prev) => ({ ...prev, complaintId: firstPending.id }))
      } else if (resolvedComplaints[0]) {
        setDraft((prev) => ({ ...prev, complaintId: resolvedComplaints[0].id }))
      }
    }
  }, [resolvedComplaints, submittedFeedbackIds, draft.complaintId])

  // Try to restore saved draft when complaintId changes
  useEffect(() => {
    if (draft.complaintId && studentId) {
      const saved = loadFeedbackDraftLocal(studentId, draft.complaintId)
      if (saved) {
        setDraft(saved)
        showToast('✓ Restored your previously saved draft', 'info')
      }
    }
  }, [draft.complaintId, studentId])

  // Active selected complaint details
  const selectedComplaint = useMemo(() => {
    return resolvedComplaints.find((c: any) => c.id === draft.complaintId)
  }, [resolvedComplaints, draft.complaintId])

  const formattedResolvedDate = useMemo(() => {
    if (!selectedComplaint) return 'Recently Resolved'
    const dateVal = selectedComplaint.resolutionDate || selectedComplaint.updatedAt || selectedComplaint.createdAt
    if (!dateVal) return 'Recently Resolved'
    try {
      return new Date(dateVal).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Recently Resolved'
    }
  }, [selectedComplaint])

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // ── AI Enhance Action ──
  const handleAiAction = async (mode: 'improve' | 'detailed' | 'short' | 'professional') => {
    const textToEnhance = draft.feedbackText.trim()
    if (!textToEnhance) {
      setErrorMessage('Please type some initial feedback thoughts first before requesting AI enhancement.')
      return
    }
    setErrorMessage('')
    setAiMode(mode)
    setIsAiLoading(true)

    try {
      const result = await enhanceFeedbackText(textToEnhance, mode)
      if (result && result.trim()) {
        setAiSuggestion(result.trim())
      } else {
        showToast('Could not generate suggestion at this time.', 'error')
      }
    } catch (e: any) {
      showToast('AI enhancement temporarily unavailable.', 'error')
    } finally {
      setIsAiLoading(false)
    }
  }

  const applyAiSuggestion = () => {
    if (aiSuggestion) {
      setDraft((prev) => ({ ...prev, feedbackText: aiSuggestion }))
      setAiSuggestion(null)
      showToast('✓ AI suggestion applied to your feedback!', 'success')
    }
  }

  const dismissAiSuggestion = () => {
    setAiSuggestion(null)
  }

  // ── Positive & Improvement Tag Toggle ──
  const togglePositiveTag = (tag: string) => {
    setDraft((prev) => {
      const exists = prev.positiveTags.includes(tag)
      return {
        ...prev,
        positiveTags: exists
          ? prev.positiveTags.filter((t) => t !== tag)
          : [...prev.positiveTags, tag]
      }
    })
  }

  const toggleImprovementTag = (tag: string) => {
    setDraft((prev) => {
      const exists = prev.improvementTags.includes(tag)
      return {
        ...prev,
        improvementTags: exists
          ? prev.improvementTags.filter((t) => t !== tag)
          : [...prev.improvementTags, tag]
      }
    })
  }

  // ── Save Draft ──
  const handleSaveDraft = () => {
    if (!draft.complaintId) {
      setErrorMessage('Please select a resolved complaint to save a draft for.')
      return
    }
    saveFeedbackDraftLocal(studentId, draft)
    showToast('✓ Draft saved successfully. You can resume anytime.', 'success')
  }

  // ── Reset / Cancel ──
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to reset this feedback form? Any unsaved changes will be discarded.')) {
      if (draft.complaintId) {
        clearFeedbackDraftLocal(studentId, draft.complaintId)
      }
      setDraft({
        complaintId: preselectedTicketId || (resolvedComplaints[0]?.id || ''),
        overallRating: 0,
        resolutionQuality: 4,
        responseTime: 4,
        communication: 4,
        staffSupport: 4,
        resolutionStatus: 'Yes, completely resolved',
        unresolvedReason: '',
        feedbackText: '',
        positiveTags: [],
        customPositiveTag: '',
        improvementTags: [],
        customImprovementTag: '',
        recommendationScore: 9,
        isAnonymous: false
      })
      setAiSuggestion(null)
      setErrorMessage('')
      showToast('Form reset to default state.', 'info')
    }
  }

  // ── Optional Reopen Complaint Handler ──
  const handleReopenComplaint = async () => {
    if (!selectedComplaint) return
    setIsReopening(true)
    try {
      await updateComplaintStatus(
        selectedComplaint.id,
        'In Progress',
        `Student requested reopening: ${draft.unresolvedReason || 'Issue still persists.'}`
      )
      setReopenSuccess(true)
      showToast('✓ Complaint has been flagged and reopened for departmental review.', 'success')
    } catch (err: any) {
      showToast('Unable to reopen complaint. Please submit feedback to alert staff.', 'error')
    } finally {
      setIsReopening(false)
    }
  }

  // ── Submit Mutation ──
  const mutation = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      if (draft.complaintId) {
        clearFeedbackDraftLocal(studentId, draft.complaintId)
      }
      setIsSuccess(true)
      onSuccess?.()
    },
    onError: (error: any) => {
      setErrorMessage(error?.message || 'Unable to submit feedback. Please try again.')
    }
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!draft.complaintId) {
      setErrorMessage('Please select a resolved complaint ticket.')
      return
    }
    if (draft.overallRating === 0) {
      setErrorMessage('Please select an overall satisfaction star rating (1 to 5 stars).')
      return
    }
    if (!draft.resolutionStatus) {
      setErrorMessage('Please specify whether your complaint was fully resolved.')
      return
    }
    if (
      (draft.resolutionStatus === 'Partially resolved' || draft.resolutionStatus === 'No, the issue still exists') &&
      !draft.unresolvedReason.trim()
    ) {
      setErrorMessage('Please provide details in "What still needs attention" so faculty can take action.')
      return
    }

    // Prepare combined positive/improvement tags
    const finalPositive = [...draft.positiveTags]
    if (draft.customPositiveTag?.trim()) finalPositive.push(draft.customPositiveTag.trim())

    const finalImprovement = [...draft.improvementTags]
    if (draft.customImprovementTag?.trim()) finalImprovement.push(draft.customImprovementTag.trim())

    const payload = {
      complaintId: draft.complaintId,
      studentId: draft.isAnonymous ? 'ANONYMOUS' : (user?.studentId || user?.email || 'STUDENT'),
      studentName: draft.isAnonymous ? 'Anonymous Student' : (user?.name || 'Student'),
      studentEmail: draft.isAnonymous ? '' : (user?.email || ''),
      department: selectedComplaint?.department || 'General',
      teacherId: selectedComplaint?.assignedTeacherId || 'Faculty',
      teacherName: selectedComplaint?.assignedTeacherName || 'Department Faculty',
      complaintTitle: selectedComplaint?.title || 'Resolved Grievance',
      resolutionSummary: selectedComplaint?.resolutionNotes || selectedComplaint?.adminRemarks || '',
      rating: draft.overallRating,
      overallRating: draft.overallRating,
      resolutionQuality: draft.resolutionQuality,
      responseTime: draft.responseTime,
      communication: draft.communication,
      staffSupport: draft.staffSupport,
      resolutionStatus: draft.resolutionStatus,
      unresolvedReason: draft.unresolvedReason.trim(),
      positiveTags: finalPositive,
      improvementTags: finalImprovement,
      recommendationScore: draft.recommendationScore,
      isAnonymous: draft.isAnonymous,
      category: selectedComplaint?.category || 'General',
      comment: draft.feedbackText.trim(),
      feedbackText: draft.feedbackText.trim()
    }

    mutation.mutate(payload)
  }

  // Active overall rating display
  const activeRating = hoverRating || draft.overallRating
  const activeRatingInfo = OVERALL_RATING_LABELS[activeRating]

  // Sentiment estimate for live preview
  const estimatedSentiment = useMemo(() => {
    if (draft.overallRating >= 4) return { label: 'Positive', emoji: '😊', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300' }
    if (draft.overallRating === 3) return { label: 'Neutral', emoji: '😐', color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 border-blue-300' }
    if (draft.overallRating > 0) return { label: 'Needs Attention', emoji: '⚠️', color: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 border-rose-300' }
    return { label: 'Pending Rating', emoji: '✨', color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300' }
  }, [draft.overallRating])

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 sm:p-9 shadow-md relative overflow-hidden transition-all duration-200">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-3 backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
                : toastMessage.type === 'error'
                ? 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
                : 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate className="space-y-9">
        
        {/* ====================================================
            1. PREMIUM FEEDBACK FORM HEADER & COMPACT SUMMARY CARD
            ==================================================== */}
        <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
              <Award className="w-4 h-4 stroke-[2.5]" /> Campus Quality Redressal
            </div>
            
            {/* Draft restore indicator */}
            {draft.complaintId && loadFeedbackDraftLocal(studentId, draft.complaintId) && (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                <Bookmark className="w-3 h-3" /> Auto-saved draft active
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-[900] text-slate-900 dark:text-white tracking-tight">
              Share Your Resolution Experience
            </h2>
            <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-1.5 font-medium leading-relaxed">
              Your feedback helps us improve the way campus concerns are handled. Please take a moment to rate your experience with this resolved complaint.
            </p>
          </div>

          {/* Ticket Picker Dropdown (if multiple resolved exist) */}
          {resolvedComplaints.length > 1 && (
            <div className="pt-2">
              <label
                htmlFor="ticket-selector"
                className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5"
              >
                Select Resolved Complaint
              </label>
              <div className="relative">
                <select
                  id="ticket-selector"
                  value={draft.complaintId}
                  onChange={(e) => setDraft((prev) => ({ ...prev, complaintId: e.target.value }))}
                  className="w-full h-12 pl-4 pr-10 rounded-xl bg-slate-50 dark:bg-[#131d2c] border border-slate-300 dark:border-slate-700 text-[13.5px] font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#172234] focus:outline-none focus:border-blue-500 appearance-none transition-all cursor-pointer shadow-2xs"
                >
                  {resolvedComplaints.map((c: any) => {
                    const evaluated = submittedFeedbackIds.has(c.id)
                    const displayCode = formatDisplayComplaintId(c.complaintId || c.ticketNumber || c.id)
                    return (
                      <option key={c.id} value={c.id} disabled={evaluated}>
                        [{displayCode}] {c.title || c.description.slice(0, 45)} {evaluated ? '✓ (Evaluated)' : ''}
                      </option>
                    )
                  })}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          {/* Compact Complaint Summary Card */}
          {selectedComplaint ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-5 rounded-2xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700/80 shadow-2xs text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60 mb-3 flex-wrap gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  COMPLAINT FEEDBACK
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Status: Resolved ✓
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ComplaintIdBadge
                      complaintId={selectedComplaint.complaintId}
                      id={selectedComplaint.id}
                      size="sm"
                    />
                    <h3 className="text-[16px] font-[800] text-slate-900 dark:text-white">
                      {selectedComplaint.title || 'Resolved Grievance'}
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Category: <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedComplaint.category}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">Department</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{selectedComplaint.department || 'CSE'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">Handled By</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {selectedComplaint.assignedTeacherName || 'Dr. Rajesh Kumar'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">Resolved On</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formattedResolvedDate}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>No resolved complaints available to evaluate right now.</span>
            </div>
          )}
        </div>

        {/* ====================================================
            2. OVERALL EXPERIENCE RATING
            ==================================================== */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-[14px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              How satisfied are you with the overall resolution? <span className="text-rose-500">*</span>
            </label>
            {activeRatingInfo && (
              <span className={`text-xs font-black px-3.5 py-1 rounded-full border ${activeRatingInfo.bg} ${activeRatingInfo.color} flex items-center gap-1.5 transition-all shadow-2xs`}>
                <span>{activeRatingInfo.icon}</span>
                <span>{activeRating} {activeRating === 1 ? 'Star' : 'Stars'} → {activeRatingInfo.label}</span>
              </span>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= activeRating
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setDraft((prev) => ({ ...prev, overallRating: star }))}
                    className="p-1.5 transition-all duration-150 hover:scale-125 active:scale-95 focus:outline-none cursor-pointer group"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`w-10 h-10 sm:w-11 sm:h-11 transition-all duration-200 ${
                        isLit
                          ? 'text-amber-500 fill-amber-400 stroke-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]'
                          : 'text-slate-300 dark:text-slate-600 stroke-[1.8] group-hover:text-amber-300'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center sm:text-right">
              {draft.overallRating === 0 ? 'Click a star to rate your experience' : 'Click any star to adjust rating'}
            </div>
          </div>
        </div>

        {/* ====================================================
            3. DETAILED FEEDBACK RATINGS (A, B, C, D)
            ==================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Detailed Experience Dimensions
            </h4>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">1–5 scale</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* A. Resolution Quality */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  A. Resolution Quality
                </span>
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                  {RESOLUTION_QUALITY_LABELS[hoverQuality || draft.resolutionQuality]}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Was your issue resolved effectively?</p>
              
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onMouseEnter={() => setHoverQuality(val)}
                    onMouseLeave={() => setHoverQuality(0)}
                    onClick={() => setDraft((p) => ({ ...p, resolutionQuality: val }))}
                    className={`flex-1 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      val <= (hoverQuality || draft.resolutionQuality)
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* B. Response Time */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  B. Response Time
                </span>
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                  {RESPONSE_TIME_LABELS[hoverResponse || draft.responseTime]}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">How satisfied were you with the time taken to respond?</p>
              
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onMouseEnter={() => setHoverResponse(val)}
                    onMouseLeave={() => setHoverResponse(0)}
                    onClick={() => setDraft((p) => ({ ...p, responseTime: val }))}
                    className={`flex-1 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      val <= (hoverResponse || draft.responseTime)
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* C. Communication */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  C. Communication
                </span>
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                  {COMMUNICATION_LABELS[hoverComm || draft.communication]}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">How clear and helpful was the communication?</p>
              
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onMouseEnter={() => setHoverComm(val)}
                    onMouseLeave={() => setHoverComm(0)}
                    onClick={() => setDraft((p) => ({ ...p, communication: val }))}
                    className={`flex-1 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      val <= (hoverComm || draft.communication)
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* D. Staff Support */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  D. Staff Support
                </span>
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                  {STAFF_SUPPORT_LABELS[hoverStaff || draft.staffSupport]}
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">How helpful and professional was the staff?</p>
              
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onMouseEnter={() => setHoverStaff(val)}
                    onMouseLeave={() => setHoverStaff(0)}
                    onClick={() => setDraft((p) => ({ ...p, staffSupport: val }))}
                    className={`flex-1 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      val <= (hoverStaff || draft.staffSupport)
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            4. RESOLUTION STATUS QUESTION
            ==================================================== */}
        <div className="space-y-3.5">
          <label className="text-[14px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            Was your complaint fully resolved? <span className="text-rose-500">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'Yes, completely resolved', label: 'Yes, completely resolved', icon: '✓', color: 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40' },
              { value: 'Partially resolved', label: 'Partially resolved', icon: '⚡', color: 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40' },
              { value: 'No, the issue still exists', label: 'No, the issue still exists', icon: '✕', color: 'border-rose-500 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40' }
            ].map((opt) => {
              const isSelected = draft.resolutionStatus === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, resolutionStatus: opt.value as ResolutionStatusOption }))}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? `ring-2 ring-blue-500/20 font-black ${opt.color}`
                      : 'bg-slate-50 dark:bg-[#111c2e] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${isSelected ? 'bg-current text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>
                    {isSelected ? '●' : '○'}
                  </span>
                  <span className="text-xs sm:text-[13px]">{opt.label}</span>
                </button>
              )
            })}
          </div>

          {/* Conditional input when partially resolved or issue still exists */}
          {(draft.resolutionStatus === 'Partially resolved' || draft.resolutionStatus === 'No, the issue still exists') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 pt-2"
            >
              <label
                htmlFor="unresolved-input"
                className="text-xs font-extrabold text-amber-900 dark:text-amber-200 block"
              >
                Please explain what still needs attention: <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="unresolved-input"
                rows={2}
                maxLength={400}
                value={draft.unresolvedReason}
                onChange={(e) => setDraft((prev) => ({ ...prev, unresolvedReason: e.target.value }))}
                placeholder="Describe any unresolved elements so department administrators can follow up directly..."
                className="w-full p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-xs sm:text-[13.5px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </motion.div>
          )}

          {/* Warning & Reopen option if issue still exists */}
          {draft.resolutionStatus === 'No, the issue still exists' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>Your complaint may require further attention. Submitting this feedback can help notify the responsible department.</span>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isReopening}
                disabled={reopenSuccess}
                onClick={handleReopenComplaint}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="shrink-0 text-xs"
              >
                {reopenSuccess ? '✓ Reopened' : 'Reopen Complaint'}
              </Button>
            </motion.div>
          )}
        </div>

        {/* ====================================================
            5. FEEDBACK TEXT AREA
            ==================================================== */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label
              htmlFor="feedback-textarea"
              className="text-[14px] font-extrabold text-slate-900 dark:text-white"
            >
              Tell us more about your experience
            </label>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Recommended: 20+ characters
            </span>
          </div>

          <div className="relative">
            <textarea
              id="feedback-textarea"
              rows={4}
              maxLength={1000}
              placeholder="Share what went well and what could have been improved..."
              value={draft.feedbackText}
              onChange={(e) => setDraft((prev) => ({ ...prev, feedbackText: e.target.value }))}
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-[#111c2e] border border-slate-300 dark:border-slate-700 text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#131d2c] focus:outline-none focus:border-blue-500 transition-all min-h-[130px] resize-none shadow-2xs"
            />
            
            <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                draft.feedbackText.length >= 20
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {draft.feedbackText.length} / 1000
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================
            6. AI FEEDBACK ASSISTANT
            ==================================================== */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-[#111c2e] border border-blue-200/80 dark:border-blue-800/60 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-[900] text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ✨ Improve My Feedback with AI
              </h4>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                CampusResolve AI can help make your feedback clearer and more constructive.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { mode: 'improve' as const, label: 'Improve Writing', icon: Wand2 },
              { mode: 'detailed' as const, label: 'Make It More Detailed', icon: MessageSquare },
              { mode: 'short' as const, label: 'Make It Shorter', icon: CornerDownRight },
              { mode: 'professional' as const, label: 'Make It More Professional', icon: Award }
            ].map((btn) => {
              const Icon = btn.icon
              const isCurrent = isAiLoading && aiMode === btn.mode
              return (
                <button
                  key={btn.mode}
                  type="button"
                  disabled={isAiLoading || !draft.feedbackText.trim()}
                  onClick={() => handleAiAction(btn.mode)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'animate-spin text-blue-600' : ''}`} />
                  <span>{isCurrent ? 'Enhancing...' : btn.label}</span>
                </button>
              )
            })}
          </div>

          {/* AI Suggestion Card Slide-in */}
          <AnimatePresence>
            {aiSuggestion && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#131d2c] border-2 border-blue-400 dark:border-blue-600 shadow-md space-y-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Suggested Version
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Mode: {aiMode}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 text-xs sm:text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  "{aiSuggestion}"
                </div>

                <div className="flex items-center justify-end gap-2.5 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={dismissAiSuggestion}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Keep My Original
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction(aiMode)}
                    disabled={isAiLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAiLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                  <button
                    type="button"
                    onClick={applyAiSuggestion}
                    className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Use Suggestion</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ====================================================
            7. POSITIVE AND IMPROVEMENT QUESTIONS
            ==================================================== */}
        <div className="space-y-6">
          {/* What did we do well? */}
          <div className="space-y-2.5">
            <label className="text-[13.5px] font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              What did we do well? <span className="text-slate-400 text-xs font-normal">(Optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {POSITIVE_OPTIONS.map((tag) => {
                const isSelected = draft.positiveTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => togglePositiveTag(tag)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-50 dark:bg-[#111c2e] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span>+</span>}
                    <span>{tag}</span>
                  </button>
                )
              })}
            </div>
            <div className="pt-1">
              <input
                type="text"
                maxLength={80}
                placeholder="Other positive feedback..."
                value={draft.customPositiveTag || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, customPositiveTag: e.target.value }))}
                className="w-full sm:w-80 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#111c2e] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* What could we improve? */}
          <div className="space-y-2.5">
            <label className="text-[13.5px] font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              What could we improve? <span className="text-slate-400 text-xs font-normal">(Optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {IMPROVEMENT_OPTIONS.map((tag) => {
                const isSelected = draft.improvementTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleImprovementTag(tag)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-50 dark:bg-[#111c2e] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <span>+</span>}
                    <span>{tag}</span>
                  </button>
                )
              })}
            </div>
            <div className="pt-1">
              <input
                type="text"
                maxLength={80}
                placeholder="Other area for improvement..."
                value={draft.customImprovementTag || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, customImprovementTag: e.target.value }))}
                className="w-full sm:w-80 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#111c2e] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* ====================================================
            8. WOULD YOU RECOMMEND THE SYSTEM? (0-10 NPS Scale)
            ==================================================== */}
        <div className="space-y-3">
          <label className="text-[13.5px] font-extrabold text-slate-900 dark:text-white block">
            Based on your experience, how likely are you to use CampusResolve again?
          </label>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const isSelected = draft.recommendationScore === score
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, recommendationScore: score }))}
                    className={`flex-1 min-w-[28px] h-10 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                      isSelected
                        ? score >= 8
                          ? 'bg-emerald-600 text-white shadow-md'
                          : score >= 5
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-rose-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {score}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 dark:text-slate-400 px-1">
              <span>Not Likely (0)</span>
              <span>Neutral (5)</span>
              <span>Extremely Likely (10)</span>
            </div>
          </div>
        </div>

        {/* ====================================================
            9. PRIVACY AND ANONYMITY OPTION
            ==================================================== */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Feedback Visibility & Privacy
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, isAnonymous: false }))}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                !draft.isAnonymous
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 font-black'
                  : 'bg-slate-50 dark:bg-[#111c2e] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Eye className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <h5 className="text-xs sm:text-[13px] font-bold">Share feedback with my identity</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Allows faculty to recognize and follow up directly with you.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, isAnonymous: true }))}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                draft.isAnonymous
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-black'
                  : 'bg-slate-50 dark:bg-[#111c2e] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <EyeOff className="w-4 h-4 mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h5 className="text-xs sm:text-[13px] font-bold">Submit feedback anonymously</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Your identity will not be displayed to staff reviewing this feedback.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ====================================================
            10. DYNAMIC FEEDBACK SUMMARY (AI / Review Card)
            ==================================================== */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              YOUR FEEDBACK SUMMARY
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${estimatedSentiment.color} flex items-center gap-1`}>
              <span>{estimatedSentiment.emoji}</span>
              <span>{estimatedSentiment.label}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Overall Rating</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {draft.overallRating > 0 ? `★ ${draft.overallRating}/5` : 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Resolution Quality</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {RESOLUTION_QUALITY_LABELS[draft.resolutionQuality]}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Response Time</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {RESPONSE_TIME_LABELS[draft.responseTime]}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Communication</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {COMMUNICATION_LABELS[draft.communication]}
              </span>
            </div>
          </div>

          {draft.feedbackText.trim() && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 italic">
              "{draft.feedbackText.trim()}"
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* ====================================================
            12. BOTTOM ACTIONS: Cancel, Save Draft, Submit
            ==================================================== */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCancel}
              className="flex-1 sm:flex-none text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleSaveDraft}
              icon={<Bookmark className="w-3.5 h-3.5" />}
              className="flex-1 sm:flex-none text-xs font-bold"
            >
              Save Draft
            </Button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={mutation.isPending}
            disabled={mutation.isPending || !draft.complaintId}
            icon={<Send className="w-4 h-4" />}
            className="w-full sm:w-auto text-xs sm:text-sm font-black px-8"
          >
            Submit Feedback
          </Button>
        </div>
      </form>

      {/* Success Modal Confirmation Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-white/98 dark:bg-[#0f172a]/98 backdrop-blur-md text-center rounded-[24px]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4 border border-emerald-300 dark:border-emerald-700 shadow-md"
            >
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </motion.div>

            <h3 className="text-2xl sm:text-3xl font-[900] text-slate-900 dark:text-white mb-2 tracking-tight">
              ✓ Feedback Submitted Successfully
            </h3>

            <p className="text-[14px] font-medium text-slate-600 dark:text-slate-300 max-w-md mb-6 leading-relaxed">
              Thank you for helping us improve CampusResolve. Your ratings guide faculty accountability and department service quality.
            </p>

            <Link to="/student">
              <Button
                variant="primary"
                icon={<ArrowRight className="w-4 h-4" />}
                className="font-bold px-7"
              >
                Return to Dashboard
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FeedbackForm
