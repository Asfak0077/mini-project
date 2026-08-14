import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppShell from '../components/ds/AppShell'
import FeedbackForm from '../components/student/FeedbackForm'
import {
  Award, ShieldCheck, ThumbsUp, Star,
  HelpCircle, MessageSquare, Sparkles, CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { getStudentFeedback } from '../services/feedbackService'
import { fetchStudentComplaints } from '../services/complaintService'

export const StudentFeedbackPage = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const { data: feedbackHistory = [] } = useQuery({
    queryKey: ['student-feedback', user?.studentId],
    queryFn: () => getStudentFeedback(user?.studentId || ''),
    enabled: !!user?.studentId
  })

  const { data: complaints = [] } = useQuery({
    queryKey: ['student-complaints', user?.studentId],
    queryFn: () => fetchStudentComplaints(user?.studentId || ''),
    enabled: !!user?.studentId
  })

  const resolvedCount = complaints.filter((c: any) => c.status === 'Resolved').length
  const evaluatedCount = feedbackHistory.length

  const guidelines = [
    {
      title: 'Constructive Evaluation',
      desc: 'Focus on communication clarity, timeliness, and the effectiveness of the final resolution.',
      icon: ThumbsUp
    },
    {
      title: 'Institutional Recognition',
      desc: 'High evaluations highlight outstanding faculty commitment and support quality.',
      icon: Award
    },
    {
      title: 'Confidential & Audited',
      desc: 'Reviews are securely stored under campus quality management protocols.',
      icon: ShieldCheck
    }
  ]

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[900] text-slate-900 dark:text-white tracking-tight">
              Resolution Feedback
            </h1>
            <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-1 font-semibold">
              Share your experience with the resolution process and evaluate service quality.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-4 py-2 rounded-full border-2 border-emerald-300 dark:border-emerald-700 shadow-2xs self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Confidential Quality Assessment</span>
          </div>
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Feedback Form Card */}
          <div className="lg:col-span-8">
            <FeedbackForm onSuccess={() => navigate('/student')} />
          </div>

          {/* Right Sidebar Guidelines & Context */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Quick Metrics Tile */}
            <div className="p-6 rounded-[24px] bg-[var(--card)] border-2 border-slate-200/90 dark:border-slate-800 shadow-[var(--shadow-md)] space-y-4">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 tracking-[0.14em] uppercase block">
                Evaluation Status
              </span>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 rounded-[18px] bg-slate-50 dark:bg-[#131d2c] border-2 border-slate-200 dark:border-slate-700 space-y-1 shadow-2xs">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">Resolved</span>
                  <p className="text-2xl font-[900] text-slate-900 dark:text-white">{resolvedCount}</p>
                </div>
                <div className="p-4 rounded-[18px] bg-slate-50 dark:bg-[#131d2c] border-2 border-slate-200 dark:border-slate-700 space-y-1 shadow-2xs">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">Evaluated</span>
                  <p className="text-2xl font-[900] text-emerald-600 dark:text-emerald-400">{evaluatedCount}</p>
                </div>
              </div>

              {resolvedCount > evaluatedCount && (
                <div className="p-3.5 rounded-[14px] bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-900 dark:text-amber-200">
                  ⚡ You have {resolvedCount - evaluatedCount} pending resolution(s) ready for review.
                </div>
              )}
            </div>

            {/* Standards & Guidelines Card */}
            <div className="p-6 rounded-[24px] bg-[var(--card)] border-2 border-slate-200/90 dark:border-slate-800 shadow-[var(--shadow-md)] space-y-4">
              <h3 className="text-sm font-[900] text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Feedback Standards
              </h3>

              <div className="space-y-3.5 pt-1">
                {guidelines.map((g) => {
                  const Icon = g.icon
                  return (
                    <div key={g.title} className="flex items-start gap-3 text-left">
                      <div className="w-9 h-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border-2 border-slate-300 dark:border-slate-700 mt-0.5 shadow-2xs">
                        <Icon className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{g.title}</h4>
                        <p className="text-[12px] text-slate-600 dark:text-slate-300 font-semibold mt-0.5 leading-relaxed">
                          {g.desc}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI Assistant Help Tile */}
            <div className="p-6 rounded-[24px] bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent border-2 border-blue-500/30 shadow-[var(--shadow-sm)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-300">
                <Sparkles className="w-4 h-4" /> AI Review Polish
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                Draft your comments and tap <strong>✨ Enhance with AI</strong> in the form to generate professional, polite phrasing automatically.
              </p>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default StudentFeedbackPage
