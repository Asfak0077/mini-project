import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { requestPasswordReset } from '../services/authService'
import ThemeToggle from '../components/shared/ThemeToggle'

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [userType, setUserType] = useState<'student' | 'teacher'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await requestPasswordReset(email, userType)
      setSuccess('Password reset instructions have been sent to your email.')
    } catch (err: any) {
      setError(err.message || 'Unable to process reset request. Please check your email address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign in
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[420px] mx-auto my-auto py-8">
        <div
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-md)] p-6 sm:p-8 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mx-auto mb-3 border border-[var(--primary-border)]">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reset Password</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Enter your email to receive a password reset link.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3.5 rounded-xl bg-[var(--success-subtle)] border border-[var(--success)]/25 text-[var(--success)] text-sm flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3.5 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/25 text-[var(--danger)] text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendResetLink} className="space-y-4" noValidate>
            <div className="flex p-1 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setUserType('student')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  userType === 'student'
                    ? 'bg-[var(--card)] text-[var(--text-primary)] shadow-[var(--shadow-xs)] border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setUserType('teacher')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  userType === 'teacher'
                    ? 'bg-[var(--card)] text-[var(--text-primary)] shadow-[var(--shadow-xs)] border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Faculty / Admin
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-sm font-medium text-[var(--text-primary)]">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 disabled:opacity-60 border border-[var(--primary-hover)] cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
