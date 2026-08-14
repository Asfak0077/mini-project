import React, { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loginWithEmail, loginWithTeacherId, signInWithGoogle } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import ThemeToggle from '../components/shared/ThemeToggle'
import AmbientBackground from '../components/shared/AmbientBackground'
import { Button } from '../components/ui/Button'
import {
  GraduationCap, Mail, Lock, Eye, EyeOff,
  AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck,
  Sparkles, Check, HelpCircle
} from 'lucide-react'

type LoginMode = 'student' | 'teacher'

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
)

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<LoginMode>('student')
  const [email, setEmail] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const currentRole = useAuthStore((state) => state.role)
  const authError = useAuthStore((state) => state.authError)
  const setAuthError = useAuthStore((state) => state.setAuthError)

  useEffect(() => {
    if (authError) {
      setError(authError)
      setAuthError(null)
    }
  }, [authError, setAuthError])

  useEffect(() => {
    if (!isAuthenticated || !currentRole) return
    navigate(currentRole === 'admin' ? '/admin' : currentRole === 'teacher' ? '/teacher' : '/student')
  }, [isAuthenticated, currentRole, navigate])

  const handleGoogleClick = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err: any) {
      console.error('Google OAuth error:', err)
      setError(err?.message || 'Google sign-in failed. Please try again or use email and password.')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'teacher') {
        const payload = teacherId.trim().includes('@')
          ? { email: teacherId.trim(), password }
          : { teacherId: teacherId.trim(), password }
        const res = await loginWithTeacherId(payload)
        if (res && (res.success || res.role)) {
          setSuccess('Authentication successful! Redirecting...')
          navigate('/teacher')
        } else {
          setError('Invalid faculty credentials.')
        }
      } else {
        const res = await loginWithEmail({ email: email.trim(), password })
        if (res && (res.success || res.role)) {
          setSuccess('Authentication successful! Redirecting...')
          const userRole = res.role || res.user?.role
          if (userRole === 'admin') navigate('/admin')
          else if (userRole === 'teacher') navigate('/teacher')
          else navigate('/student')
        } else {
          setError('Invalid email address or password.')
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Server connection error.')
    } finally {
      setSubmitting(false)
    }
  }

  const benefits = [
    { label: 'Live SLA Tracking', desc: 'Real-time ticket progression' },
    { label: 'Encrypted Redressal', desc: 'Secure student-faculty channel' },
    { label: 'AI Assistance', desc: 'Instant category & smart drafting' }
  ]

  return (
    <div className="min-h-screen relative bg-[var(--background)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 transition-colors duration-300 font-sans overflow-x-hidden">
      <AmbientBackground />

      {/* ── Top Bar Header ────────────────────────────────────── */}
      <header className="relative z-20 max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md bg-[#111827] dark:bg-white dark:text-[#111827] transition-transform group-hover:scale-105">
            CR
          </div>
          <div className="flex flex-col">
            <span className="text-base font-[800] text-[var(--text-primary)] tracking-tight leading-tight">
              CampusResolve
            </span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase">
              Enterprise Redressal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/about"
            className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
          >
            About & Guidelines
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main Authentication Box ───────────────────────────── */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Hero & Value Statement (Hidden on small mobile if needed, but elegant on lg) */}
          <div className="lg:col-span-6 space-y-6 text-left hidden sm:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--border-subtle)]">
              <Sparkles className="w-3.5 h-3.5" /> Institutional Access Portal
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-[800] text-[var(--text-primary)] tracking-tight leading-[1.15]">
              Seamless Campus Grievance Resolution.
            </h1>

            <p className="text-[14.5px] text-[var(--text-secondary)] font-medium leading-relaxed max-w-md">
              Access your personalized workspace to lodge, monitor, and resolve academic, hostel, and infrastructure tickets in real time.
            </p>

            {/* Feature Pills */}
            <div className="space-y-3 pt-2">
              {benefits.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{b.label}</span>
                    <span className="text-xs text-[var(--text-muted)] font-medium"> — {b.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Protected by SHA-256 verified campus security protocols</span>
            </div>
          </div>

          {/* Right Floating Authentication Card */}
          <div className="lg:col-span-6 w-full max-w-[460px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-[26px] p-6 sm:p-8 shadow-[var(--shadow-md)] relative backdrop-blur-sm space-y-6"
            >
              {/* Card Header */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-[800] text-[var(--text-primary)] tracking-tight">
                  Sign in to your account
                </h2>
                <p className="text-[13px] text-[var(--text-muted)] font-medium">
                  Select your role to access your designated portal.
                </p>
              </div>

              {/* Segmented Role Selector */}
              <div className="p-1 rounded-[16px] bg-[var(--surface-secondary)] border border-[var(--border)] grid grid-cols-2 gap-1 relative">
                {(['student', 'teacher'] as LoginMode[]).map((m) => {
                  const isCurrent = mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(''); setSuccess('') }}
                      className={`relative flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--card)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {m === 'student' ? (
                        <GraduationCap className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>{m === 'student' ? 'Student' : 'Faculty / Staff'}</span>
                    </button>
                  )
                })}
              </div>

              {/* Status Alert Messages */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3.5 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3.5 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {mode === 'student' ? (
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Student Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-[48px] pl-10 pr-4 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label htmlFor="teacherId" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Faculty ID or Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        id="teacherId"
                        type="text"
                        autoComplete="username"
                        required
                        placeholder="FAC-001 or faculty@university.edu"
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full h-[48px] pl-10 pr-4 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-[11.5px] font-bold text-[var(--accent)] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[48px] pl-10 pr-10 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  isLoading={submitting}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                  className="mt-2"
                >
                  Sign in as {mode === 'student' ? 'Student' : 'Faculty'}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-[var(--border)]" />
                <span className="absolute px-3 bg-[var(--card)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  or continue with
                </span>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                className="w-full h-[48px] rounded-[14px] bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[13.5px] font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              {/* Card Footer Help */}
              <div className="text-center pt-1">
                <p className="text-[12px] text-[var(--text-secondary)] font-medium">
                  Need help accessing your portal?{' '}
                  <Link to="/about" className="text-[var(--accent)] font-bold hover:underline">
                    View Guidelines
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LoginPage
