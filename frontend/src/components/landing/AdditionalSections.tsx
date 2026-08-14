import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogIn,
  FilePlus,
  ShieldAlert,
  UserCheck,
  Star,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Zap,
  Award,
  Clock,
  Layers,
  GraduationCap,
  Users
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

export const HowItWorks = () => {
  const steps = [
    {
      num: '01',
      title: 'Authentication & Login',
      desc: 'Securely sign in using your registered college email or OAuth Google credentials.',
      icon: LogIn,
      color: 'bg-blue-500 text-white'
    },
    {
      num: '02',
      title: 'Submit Complaint',
      desc: 'Fill in issue details, choose department category, and upload optional file evidence.',
      icon: FilePlus,
      color: 'bg-cyan-500 text-white'
    },
    {
      num: '03',
      title: 'Admin Review & Triage',
      desc: 'System & Admin verify priority level and assign to department faculty.',
      icon: ShieldAlert,
      color: 'bg-indigo-500 text-white'
    },
    {
      num: '04',
      title: 'Teacher Resolution',
      desc: 'Assigned faculty updates status, posts remarks, and resolves the grievance within SLA.',
      icon: UserCheck,
      color: 'bg-emerald-500 text-white'
    },
    {
      num: '05',
      title: 'Student Feedback',
      desc: 'Student reviews resolution summary and submits a star rating & feedback comment.',
      icon: Star,
      color: 'bg-amber-500 text-white'
    }
  ]

  return (
    <section className="py-16 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="primary" icon={<Layers className="w-3.5 h-3.5 text-blue-500" />}>
            Seamless 5-Step Journey
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How CampusResolve Works
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400">
            From initial submission to final satisfaction feedback in 5 transparent steps.
          </p>
        </div>

        {/* 5 Steps Grid */}
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              >
                <Card hoverEffect={true} className="relative p-6 h-full flex flex-col justify-between group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors font-mono">
                        {step.num}
                      </span>
                      <div className={`p-2.5 rounded-xl ${step.color} shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                      {step.title}
                    </h3>
                    
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}

export const WhyChooseUs = () => {
  return (
    <section className="py-16 relative z-10 space-y-16">
      {/* 1. Why Choose CampusResolve */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <Badge variant="primary" icon={<Award className="w-3.5 h-3.5 text-blue-500" />}>
            Enterprise Advantages
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Why Choose CampusResolve?
          </h2>
          <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400">
            Built specifically for academic institutions requiring SLA accountability, data security, and audit trails.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card hoverEffect={true}>
            <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 w-fit mb-4 border border-blue-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Automated SLA Escalations</h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              If an assigned complaint is not reviewed within 24 hours, the system automatically escalates priority and notifies department heads.
            </p>
          </Card>

          <Card hoverEffect={true}>
            <div className="p-3 rounded-2xl bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 w-fit mb-4 border border-cyan-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Live Timeline Audit Trail</h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              Every status update, reassignment, and admin remark is timestamped and recorded in an immutable activity feed.
            </p>
          </Card>

          <Card hoverEffect={true}>
            <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 w-fit mb-4 border border-emerald-500/20">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">360° Quality Analytics</h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              Real-time charts break down department workloads, resolution rates, and faculty sentiment metrics for continuous improvement.
            </p>
          </Card>
        </div>
      </div>

      {/* 2. Student & Faculty Dual Benefits Comparison */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Student Benefits Card */}
          <Card hoverEffect={false} className="p-8 border-l-4 border-l-blue-600">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Student Benefits</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Empowering campus voices</p>
              </div>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Submit complaints anytime from laptop or mobile.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Track live step-by-step progress without visiting offices.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Submit feedback ratings to rate resolution quality.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>24/7 AI Chatbot assistant to answer queries instantly.</span>
              </li>
            </ul>
          </Card>

          {/* Faculty & Admin Benefits Card */}
          <Card hoverEffect={false} className="p-8 border-l-4 border-l-cyan-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Faculty & Admin Benefits</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Streamlining resolution workflows</p>
              </div>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Automated ticket assignment to designated department heads.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Centralized dashboard for tracking pending vs resolved tickets.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Comprehensive analytics reports for college accreditation.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Eliminates lost paperwork with secure cloud record archiving.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  )
}

export const FAQ = () => {
  const faqs = [
    {
      q: 'How long does it take for a complaint to be addressed?',
      a: 'Complaints are routed immediately to the designated department upon submission. The average initial response time is under 24 hours.'
    },
    {
      q: 'Can I upload files or image evidence with my complaint?',
      a: 'Yes, CampusResolve supports attaching image proof (JPG, JPEG, PNG, WebP) up to 5 MB per file directly with your complaint submission.'
    },
    {
      q: 'Is my student account data protected?',
      a: 'All sessions are secured via JWT authentication tokens and encrypted HTTPS communication. Your data is accessible only by authorized campus faculty and administrators.'
    },
    {
      q: 'How does the feedback rating system work?',
      a: 'Once a teacher marks a complaint as "Resolved", you receive an option on your feedback portal to provide a 1-5 star rating and comment on the resolution quality.'
    },
    {
      q: 'What happens if a complaint remains pending for too long?',
      a: 'Our automated escalation engine monitors complaint SLA timers and alerts administrators if an issue goes unresolved past the 24-hour target timeline.'
    }
  ]

  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section id="faq" className="py-16 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mx-auto w-fit shadow-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
          <Badge variant="primary">
            Clear Answers
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Everything you need to know about CampusResolve features, privacy, and resolution SLAs.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
              >
                <Card
                  hoverEffect={true}
                  className={`p-0 overflow-hidden transition-colors duration-300 ${
                    isOpen ? 'border-blue-500/40 dark:border-blue-500/40 ring-1 ring-blue-500/20' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 text-slate-900 dark:text-white font-extrabold text-sm sm:text-base hover:bg-blue-500/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      {faq.q}
                    </span>
                    <div className={`p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 bg-blue-500 text-white' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="px-6 pb-5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-4 bg-slate-50/50 dark:bg-slate-900/30"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
