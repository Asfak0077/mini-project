import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Zap, BarChart3, Lock, Smartphone, Bell,
  Users, CheckCircle2, ArrowRight, BookOpen, Clock, Star, Award
} from 'lucide-react'
import ThemeToggle from '../components/shared/ThemeToggle'
import AmbientBackground from '../components/shared/AmbientBackground'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../store/authStore'

const AboutPage: React.FC = () => {
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Resolution',
      description: 'Streamlined complaint submission with live tracking, automated assignment, and stage-by-stage lifecycle updates.'
    },
    {
      icon: ShieldCheck,
      title: 'Verified Redressal',
      description: 'Role-based access for students, departmental faculty, and administrators with authenticated SHA-256 validation.'
    },
    {
      icon: BarChart3,
      title: 'Insightful Analytics',
      description: 'Real-time service quality metrics, SLA adherence benchmarks, and satisfaction distributions across departments.'
    },
    {
      icon: Lock,
      title: 'Confidential & Secure',
      description: 'Protected data layers ensuring student privacy, immutable audit records, and encrypted credential handling.'
    },
    {
      icon: Smartphone,
      title: 'Responsive Workspace',
      description: 'Seamlessly optimized for mobile, tablet, and high-resolution desktop interfaces with light & dark theme support.'
    },
    {
      icon: Bell,
      title: 'Real-Time Sync',
      description: 'Instant WebSocket and event updates on ticket assignments, status progressions, and faculty remarks.'
    }
  ]

  const stats = [
    { label: 'AVERAGE RESOLUTION', value: '24 hrs', desc: 'Industry-leading SLA turnaround' },
    { label: 'SATISFACTION RATING', value: '4.9 / 5', desc: 'Over 2,500+ verified evaluations' },
    { label: 'DEPARTMENT REACH', value: '100%', desc: 'Unified campus-wide coverage' },
    { label: 'SECURITY PROTOCOL', value: 'Grade A', desc: 'Encrypted audit ledger' }
  ]

  const guidelines = [
    {
      step: '01',
      title: 'Be Specific & Clear',
      desc: 'Provide exact dates, locations, classroom/lab numbers, and affected individuals to expedite investigation.'
    },
    {
      step: '02',
      title: 'Select Accurate Category',
      desc: 'Choose Academic, Infrastructure, Transport, or Hostel to route directly to authorized departmental faculty.'
    },
    {
      step: '03',
      title: 'Monitor & Evaluate',
      desc: 'Track stage progress in your Ticket History and provide 5-star quality feedback once resolved.'
    }
  ]

  return (
    <div className="min-h-screen relative bg-[var(--background)] text-[var(--text-primary)] overflow-x-hidden font-sans transition-colors duration-300">
      <AmbientBackground />

      {/* Top Header */}
      <header className="relative z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md bg-[#111827] dark:bg-white dark:text-[#111827]">
            CR
          </div>
          <span className="text-lg font-black text-[var(--text-primary)] tracking-tighter">
            CampusResolve
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to={isAuthenticated ? (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student') : '/login'}>
            <Button size="sm">
              {isAuthenticated ? 'Open Dashboard' : 'Portal Login'}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--border-subtle)]">
            <Award className="w-3.5 h-3.5" /> Institutional Grievance Platform
          </div>
          <h1 className="text-3xl sm:text-5xl font-[800] text-[var(--text-primary)] tracking-tight leading-tight">
            Transparent Redressal for the Modern Campus
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium leading-relaxed">
            Empowering students, faculty, and administration with a frictionless digital workflow for campus resolution, feedback, and accountability.
          </p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="p-6 rounded-[20px] bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-md)] flex flex-col justify-between h-[130px]"
            >
              <span className="text-[10.5px] font-bold text-[var(--text-muted)] tracking-[0.12em] uppercase">
                {stat.label}
              </span>
              <div className="text-2xl font-[800] text-[var(--text-primary)]">
                {stat.value}
              </div>
              <span className="text-[11.5px] text-[var(--text-secondary)] font-medium">
                {stat.desc}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-[800] text-[var(--text-primary)] tracking-tight">System Capabilities</h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">Built from the ground up for speed, reliability, and precision.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, idx) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="p-6 rounded-[22px] bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-md)] space-y-3 hover:border-[rgba(148,163,184,0.32)] transition-all"
                >
                  <div className="w-10 h-10 rounded-[14px] bg-[var(--surface-secondary)] text-[var(--accent)] flex items-center justify-center border border-[var(--border)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[16px] font-[800] text-[var(--text-primary)] tracking-tight">{f.title}</h3>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-normal">{f.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Guidelines Card */}
        <div className="p-6 sm:p-8 rounded-[24px] bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-md)] space-y-6">
          <div>
            <h2 className="text-xl font-[800] text-[var(--text-primary)] tracking-tight">Guidelines for Redressal</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">Follow these standard protocols for optimal response times.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {guidelines.map((g) => (
              <div key={g.step} className="p-5 rounded-[16px] bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
                <span className="text-xs font-[800] text-[var(--accent)] tracking-wider">{g.step}</span>
                <h4 className="text-[14px] font-[800] text-[var(--text-primary)]">{g.title}</h4>
                <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed font-normal">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Card */}
        <div className="p-8 sm:p-10 rounded-[24px] bg-[#111827] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-2xl font-[800] tracking-tight">Ready to Submit or Track a Grievance?</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md font-normal">
              Sign in with your institutional credentials to access your personal dashboard.
            </p>
          </div>
          <Link to="/login" className="shrink-0">
            <Button variant="secondary" size="lg" iconRight={<ArrowRight className="w-4 h-4" />}>
              Launch Portal
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default AboutPage
