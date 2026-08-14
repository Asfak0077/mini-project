import { FormEvent, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { submitFeedback, getStudentFeedback } from '../../services/feedbackService'
import { fetchStudentComplaints } from '../../services/complaintService'
import { enhanceFeedbackText } from '../../services/chatbotService'
import {
  User, Star, CheckCircle2, ArrowRight, Info,
  Building, Send, ChevronDown, Wand2, FileCheck,
  Award, Sparkles, ShieldCheck, Check, MessageSquare,
  ThumbsUp, HelpCircle
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../ui/Button'
import ComplaintIdBadge, { formatDisplayComplaintId } from '../shared/ComplaintIdBadge'

interface FeedbackFormProps {
  onSuccess?: () => void
}

const EVALUATION_CHIPS = [
  'Teaching Quality',
  'Communication',
  'Support & Assistance',
  'Response Speed',
  'Problem Resolution',
  'Staff Helpfulness',
  'Infrastructure Quality',
  'System Ease of Use'
]

const RATING_LABELS: Record<number, { title: string; color: string; bg: string }> = {
  1: { title: 'Needs Improvement', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-700' },
  2: { title: 'Fair Quality', color: 'text-amber-800 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950/70 border-2 border-amber-300 dark:border-amber-700' },
  3: { title: 'Good Resolution', color: 'text-blue-800 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-950/70 border-2 border-blue-300 dark:border-blue-700' },
  4: { title: 'Very Good Quality', color: 'text-indigo-800 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-950/70 border-2 border-indigo-300 dark:border-indigo-700' },
  5: { title: 'Exceptional Resolution ⭐', color: 'text-emerald-800 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/70 border-2 border-emerald-300 dark:border-emerald-700' }
}

export const FeedbackForm = ({ onSuccess }: FeedbackFormProps) => {
  const user = useAuthStore((state) => state.user)
  const [searchParams] = useSearchParams()
  const preselectedTicketId = searchParams.get('id') || ''

  const [selectedComplaintId, setSelectedComplaintId] = useState(preselectedTicketId)
  const [department, setDepartment] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [complaintTitle, setComplaintTitle] = useState('')
  const [resolutionSummary, setResolutionSummary] = useState('')

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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

  const resolvedComplaints = complaints.filter(c => c.status === 'Resolved')
  const submittedFeedbackIds = new Set(feedbackHistory.map((f: any) => f.complaintId))

  // Set default ticket if param passed
  useEffect(() => {
    if (preselectedTicketId && resolvedComplaints.some(c => c.id === preselectedTicketId)) {
      setSelectedComplaintId(preselectedTicketId)
    }
  }, [preselectedTicketId, resolvedComplaints])

  useEffect(() => {
    if (selectedComplaintId) {
      const complaint = resolvedComplaints.find(c => c.id === selectedComplaintId)
      if (complaint) {
        setDepartment(complaint.department)
        setTeacherName(complaint.assignedTeacherName || 'Department Head / Faculty')
        setTeacherId(complaint.assignedTeacherId || 'Unknown')
        setComplaintTitle(complaint.title || 'Resolved Issue')
        setResolutionSummary(complaint.resolutionNotes || complaint.adminRemarks || 'Resolution verified by administration.')
        setMessage('')
      }
    } else {
      setDepartment('')
      setTeacherName('')
      setTeacherId('')
      setComplaintTitle('')
      setResolutionSummary('')
    }
  }, [selectedComplaintId, resolvedComplaints])

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat))
    } else {
      setSelectedCategories([...selectedCategories, cat])
    }
  }

  const handleAiEnhance = async () => {
    if (!comment.trim()) return
    try {
      setIsEnhancing(true)
      const enhanced = await enhanceFeedbackText(comment)
      if (enhanced) {
        setComment(enhanced)
      }
    } catch {
      // Fallback
    } finally {
      setIsEnhancing(false)
    }
  }

  const mutation = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      setIsSuccess(true)
      onSuccess?.()
    },
    onError: (error: any) => {
      setMessage(error?.response?.data?.message || error.message || 'Unable to submit feedback.')
    }
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedComplaintId) {
      setMessage('Please select a resolved complaint ticket.')
      return
    }
    if (rating === 0) {
      setMessage('Please choose a star rating between 1 and 5.')
      return
    }

    mutation.mutate({
      studentId: user?.studentId || user?.email || '',
      studentName: user?.name || '',
      studentEmail: user?.email || '',
      complaintId: selectedComplaintId,
      department,
      teacherId,
      teacherName,
      complaintTitle,
      resolutionSummary,
      rating,
      category: selectedCategories.join(', ') || 'General',
      comment
    })
  }

  const activeDisplayRating = hoverRating || rating
  const currentRatingInfo = RATING_LABELS[activeDisplayRating]

  return (
    <div className="bg-[var(--card)] rounded-[26px] border-2 border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-[var(--shadow-md)] relative overflow-hidden transition-colors duration-200">
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        
        {/* Header Badge & Title */}
        <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 shadow-2xs">
            <Award className="w-4 h-4 stroke-[2.5]" /> Resolution Quality Assessment
          </div>
          <h2 className="text-2xl sm:text-[28px] font-[900] text-slate-900 dark:text-white tracking-tight">
            Share Your Feedback
          </h2>
          <p className="text-[14px] text-slate-600 dark:text-slate-300 font-semibold">
            Evaluate faculty resolution efficiency, communication, and overall service quality.
          </p>
        </div>

        {/* ── STEP 1: Choose Resolved Ticket ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="ticket-selector"
              className="text-xs font-black uppercase tracking-[0.14em] text-slate-800 dark:text-slate-200 block"
            >
              1. Select Resolved Ticket <span className="text-rose-600">*</span>
            </label>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
              {resolvedComplaints.length} tickets available
            </span>
          </div>

          <div className="relative">
            <select
              id="ticket-selector"
              required
              value={selectedComplaintId}
              onChange={(e) => setSelectedComplaintId(e.target.value)}
              className="w-full h-[52px] pl-4 pr-11 rounded-[16px] bg-slate-50 dark:bg-[#131d2c] border-2 border-slate-300 dark:border-slate-700 text-[14px] font-extrabold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-[#172234] focus:outline-none focus:border-blue-500 appearance-none transition-all cursor-pointer shadow-sm"
            >
              <option value="">-- Choose Resolved Grievance Complaint --</option>
              {resolvedComplaints.map((c) => {
                const alreadyRated = submittedFeedbackIds.has(c.id)
                const displayId = formatDisplayComplaintId(c.complaintId || c.ticketNumber || c.id)
                return (
                  <option key={c.id} value={c.id} disabled={alreadyRated}>
                    [{displayId}] {c.category} — {c.title || c.description.slice(0, 40)} {alreadyRated ? '(Already Evaluated ✓)' : ''}
                  </option>
                )
              })}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-400">
              <ChevronDown className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {resolvedComplaints.length === 0 && (
            <div className="p-4 rounded-[16px] bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-start gap-2.5 shadow-2xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5 stroke-[2.5]" />
              <span>You have no resolved complaints yet. Once your submitted grievances are completed by faculty, you can submit satisfaction ratings here.</span>
            </div>
          )}
        </div>

        {/* Selected Complaint Detail Preview */}
        {selectedComplaintId && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-[22px] bg-slate-50 dark:bg-[#101724] border-2 border-slate-200 dark:border-slate-700 space-y-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" /> Resolved Complaint Context
              </div>
              {selectedComplaintId && (
                <ComplaintIdBadge
                  complaintId={resolvedComplaints.find(c => c.id === selectedComplaintId)?.complaintId}
                  id={selectedComplaintId}
                  size="sm"
                />
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
              <div className="p-4 rounded-[16px] bg-white dark:bg-[#151f30] border-2 border-slate-200 dark:border-slate-700 space-y-1 shadow-2xs">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Faculty</span>
                <p className="text-[13.5px] font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" /> {teacherName}
                </p>
              </div>
              <div className="p-4 rounded-[16px] bg-white dark:bg-[#151f30] border-2 border-slate-200 dark:border-slate-700 space-y-1 shadow-2xs">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department Node</span>
                <p className="text-[13.5px] font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" /> {department || 'General Campus'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-[16px] bg-white dark:bg-[#151f30] border-2 border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Official Resolution Statement</span>
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 italic leading-relaxed">
                "{resolutionSummary}"
              </p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Service Rating (High Contrast Stars) ── */}
        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-800 dark:text-slate-200 block">
            2. Overall Service Rating <span className="text-rose-600">*</span>
          </label>

          <div className="p-6 rounded-[22px] bg-slate-50 dark:bg-[#101724] border-2 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
            {/* Highly Visible Stars */}
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= (hoverRating || rating)
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform duration-150 hover:scale-125 active:scale-95 focus:outline-none cursor-pointer group"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`w-10 h-10 sm:w-11 sm:h-11 transition-all duration-200 ${
                        isLit
                          ? 'text-amber-500 fill-amber-400 stroke-amber-600 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]'
                          : 'text-slate-400 dark:text-slate-600 stroke-[2] group-hover:text-amber-400'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            {/* Dynamic label badge (Bold & High Contrast) */}
            <div className="text-center sm:text-right">
              {currentRatingInfo ? (
                <span className={`text-xs font-black px-4 py-2 rounded-full ${currentRatingInfo.bg} ${currentRatingInfo.color} shadow-sm inline-block`}>
                  {activeDisplayRating} / 5 — {currentRatingInfo.title}
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3.5 py-1.5 rounded-full border-2 border-slate-300 dark:border-slate-700 shadow-2xs">
                  Tap stars to evaluate
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── STEP 3: Evaluation Criteria Tags (High Contrast) ── */}
        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-800 dark:text-slate-200 block">
            3. Quality Assessment Dimensions (Optional)
          </label>
          <div className="flex flex-wrap gap-2.5">
            {EVALUATION_CHIPS.map((chip) => {
              const isSelected = selectedCategories.includes(chip)
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleCategory(chip)}
                  className={`px-4 py-2.5 rounded-[14px] text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#111827] dark:bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-300 dark:border-slate-700 shadow-2xs'
                  }`}
                >
                  {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                  <span>{chip}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── STEP 4: Comments & AI Enhance ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="comment-textarea"
              className="text-xs font-black uppercase tracking-[0.14em] text-slate-800 dark:text-slate-200 block"
            >
              4. Detailed Comments & Suggestions
            </label>

            <button
              type="button"
              onClick={handleAiEnhance}
              disabled={isEnhancing || !comment.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 cursor-pointer bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800"
            >
              <Wand2 className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
              <span>{isEnhancing ? 'Polishing with AI...' : '✨ Enhance with AI'}</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              id="comment-textarea"
              rows={4}
              maxLength={500}
              placeholder="Provide constructive feedback regarding the turnaround speed, resolution completeness, or faculty conduct..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-4 rounded-[18px] bg-slate-50 dark:bg-[#131d2c] border-2 border-slate-300 dark:border-slate-700 text-[14px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#172234] focus:outline-none focus:border-blue-500 transition-all min-h-[130px] resize-none shadow-sm"
            />
            <div className="absolute right-4 bottom-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              {comment.length} / 500
            </div>
          </div>
        </div>

        {/* Status Error Message */}
        {message && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-[16px] bg-rose-100 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-800 text-xs font-black text-rose-800 dark:text-rose-300">
            ⚠️ {message}
          </motion.div>
        )}

        {/* ── STEP 5: Submit Action ── */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={mutation.isPending}
            icon={<Send className="w-4 h-4" />}
            className="h-12 text-[14px] font-black rounded-[14px]"
          >
            Submit Resolution Evaluation
          </Button>
        </div>
      </form>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[var(--card)]/98 backdrop-blur-md text-center rounded-[26px]"
          >
            <div className="w-16 h-16 rounded-[22px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4 border-2 border-emerald-300 dark:border-emerald-700 shadow-md">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-[900] text-slate-900 dark:text-white mb-2 tracking-tight">
              Feedback Submitted!
            </h3>

            <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300 max-w-md mb-6 leading-relaxed">
              Thank you for evaluating your grievance resolution quality. Your ratings directly guide faculty accountability and department service ratings.
            </p>

            <Link to="/student">
              <Button
                variant="primary"
                icon={<ArrowRight className="w-4 h-4" />}
                className="font-bold"
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
