import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { completeSignup } from '../services/authService'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import PasswordStrengthIndicator from '../components/shared/PasswordStrengthIndicator'
import ThemeToggle from '../components/shared/ThemeToggle'
import AmbientBackground from '../components/shared/AmbientBackground'
import { Button } from '../components/ui/Button'
import { LockKeyhole, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, Key, ArrowLeft } from 'lucide-react'

const SetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        if (!hashParams.has('access_token')) {
          setError('Invalid or expired verification link. Please request a new link.')
        }
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Authentication session not found. Please click the link in your email again.')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      const userPayload = {
        email: session.user?.email || '',
        name: session.user?.user_metadata?.name || session.user?.email?.split('@')[0] || 'User',
        department: session.user?.user_metadata?.department || 'General',
        role: session.user?.user_metadata?.role || useAuthStore.getState().role || 'student',
        studentId: session.user?.user_metadata?.studentId || ''
      }

      const data = await completeSignup(userPayload)

      const { setAuth } = useAuthStore.getState()
      setAuth({
        user: data.user,
        token: data.accessToken,
        role: data.user.role
      })

      setLoading(false)
      if (data.user.role === 'teacher') {
        navigate('/teacher')
      } else if (data.user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/student')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to set password')
      setLoading(false)
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
            <h1 className="text-2xl font-[800] tracking-tight text-[var(--text-primary)]">Set Your Password</h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium">
              Create a secure password to complete account activation.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3.5 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full h-[48px] pl-10 pr-10 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <PasswordStrengthIndicator password={password} />

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full h-[48px] pl-10 pr-10 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {confirmPassword && (
              <div className={`p-2.5 rounded-[10px] text-xs font-bold flex items-center gap-2 ${password === confirmPassword ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={loading}
              disabled={!password || password !== confirmPassword}
              className="mt-2"
            >
              Activate Account & Continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SetPasswordPage
