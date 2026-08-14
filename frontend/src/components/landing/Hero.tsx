import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, ArrowRight, ShieldCheck, CheckCircle2, Clock, Activity, MessageSquare } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const Hero = () => {
  return (
    <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-12 items-center">
        
        {/* Left Content Column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="lg:col-span-7 space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Badge variant="primary" icon={<Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" />}>
              Official Smart Campus Platform
            </Badge>
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
            Transforming Campus Grievances Into{' '}
            <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent">
              Instant Resolutions
            </span>
          </h1>

          <p className="text-base sm:text-lg font-semibold text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            CampusResolve&apos;s Smart Digital Complaint & Feedback Management System empowers students, faculty, and administrators with real-time tracking, AI-assisted reporting, and transparent SLA management.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link to="/login">
              <Button size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Launch Portal
              </Button>
            </Link>
            <a href="#features">
              <Button variant="secondary" size="lg">
                Explore Features
              </Button>
            </a>
          </div>

          {/* Quick Highlight Badges */}
          <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-3 gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>24h Resolution SLA</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>JWT & Role Security</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>AI Feedback System</span>
            </div>
          </div>
        </motion.div>

        {/* Right Content - Live Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <Card hoverEffect={true} className="relative z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800/80 mb-6">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Live Resolution Flow
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                SDCFRS Engine
              </span>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Grievance Submitted', detail: 'Student Auth Verified & Encrypted', color: 'bg-blue-500', icon: '1' },
                { label: 'Auto Department Routing', detail: 'Assigned to CSE / ECE / MECH Faculty', color: 'bg-cyan-500', icon: '2' },
                { label: 'Action & Verification', detail: 'Real-time Resolution & Student Feedback', color: 'bg-emerald-500', icon: '3' }
              ].map((step) => (
                <div key={step.label} className="flex items-start gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-blue-500/30 transition-all">
                  <div className={`w-9 h-9 rounded-xl ${step.color} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md`}>
                    {step.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {step.label}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" /> Average Escalation Time
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                &lt; 24 Hours
              </span>
            </div>
          </Card>
        </motion.div>

      </div>
    </section>
  )
}

export default Hero
