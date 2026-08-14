import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole,
  RefreshCw, ShieldCheck, AlertCircle, Key
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { updatePasswordInBackend } from '../services/authService'
import ThemeToggle from '../components/shared/ThemeToggle'
import AmbientBackground from '../components/shared/AmbientBackground'
import PasswordStrengthIndicator from '../components/shared/PasswordStrengthIndicator'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../store/authStore'

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'success'

const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking')
  const [userEmail, setUserEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const validation = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    }

    const isValid = Object.values(checks).every(Boolean) && password === confirmPassword && password.length > 0

    return {
      checks,
      isValid
    }
  }, [password, confirmPassword])

  useEffect(() => {
    let mounted = true
    let invalidTimer: number | undefined

    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      if (session) {
        if (session.user?.email) setUserEmail(session.user.email)
        setRecoveryState('ready')
        return
      }

      const hash = window.location.hash
      if (hash && (hash.includes('access_token=') || hash.includes('type=recovery'))) {
        invalidTimer = window.setTimeout(async () => {
          const { data: { session: latestSession } } = await supabase.auth.getSession()
          if (mounted) {
            if (latestSession) {
              if (latestSession.user?.email) setUserEmail(latestSession.user.email)
              setRecoveryState('ready')
            } else {
              setRecoveryState('invalid')
            }
          }
        }, 500)
      } else {
        setRecoveryState('invalid')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (session?.user?.email) setUserEmail(session.user.email)
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED'))) {
        if (invalidTimer) window.clearTimeout(invalidTimer)
        setRecoveryState('ready')
        setError('')
      }
    })

    void checkRecoverySession()

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (invalidTimer) window.clearTimeout(invalidTimer)
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (recoveryState !== 'ready') {
      setError('Your password reset link is invalid or has expired.')
      setRecoveryState('invalid')
      return
    }

    if (!validation.isValid) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
      } else {
        setError('Please choose a password that meets all strength requirements.')
      }
      return
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    const targetEmail = userEmail || currentSession?.user?.email

    setSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        throw new Error(updateError.message || 'Failed to update password in Supabase Auth.')
      }

      if (targetEmail) {
        await updatePasswordInBackend(targetEmail, password).catch((syncErr) => {
          console.warn('Backend password hash sync note:', syncErr)
        })
      }

      setRecoveryState('success')
      setSuccessMessage('Password changed successfully. Redirecting to login...')

      await supabase.auth.signOut().catch(() => undefined)
      useAuthStore.getState().clearAuth()

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while resetting your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen relative bg-[var(--background)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 transition-colors duration-300 font-sans">
      <AmbientBackground />

      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto relative z-10">
        <Link to="/login" className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[460px] mx-auto my-auto py-8 relative z-10">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[24px] shadow-[var(--shadow-md)] p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-secondary)] text-[var(--text-primary)] flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-[800] tracking-tight text-[var(--text-primary)]">Reset Password</h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium">
              Create a new secure password for your account.
            </p>
            {userEmail && <p className="text-xs font-bold text-blue-500">{userEmail}</p>}
          </div>

          {recoveryState === 'checking' && (
            <div className="py-8 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)] mx-auto" />
              <p className="text-xs font-semibold text-[var(--text-muted)]">Verifying password reset link...</p>
            </div>
          )}

          {recoveryState === 'invalid' && (
            <div className="space-y-4 text-center py-4">
              <div className="p-3.5 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your password reset link is invalid or has expired.</span>
              </div>
              <Link to="/forgot-password" className="block">
                <Button fullWidth size="lg">
                  Request New Link
                </Button>
              </Link>
            </div>
          )}

          {(recoveryState === 'ready' || recoveryState === 'success') && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <AnimatePresence mode="wait">
                {successMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3.5 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3.5 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-[48px] pl-10 pr-10 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              <PasswordStrengthIndicator password={password} />

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-[48px] pl-10 pr-10 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-rose-500 font-semibold">Passwords do not match.</p>
              )}

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={submitting}
                disabled={!validation.isValid}
                className="mt-2"
              >
                Update Password & Sign In
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword