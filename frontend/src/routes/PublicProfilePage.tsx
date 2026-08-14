import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  User,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  QrCode,
  Mail,
  Phone,
  Sparkles,
  Lock,
  Building,
  Star,
  ExternalLink,
  ArrowUpRight
} from 'lucide-react'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { fetchPublicProfile } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/shared/ToastNotification'
import ProfileQrModal from '../components/profile/ProfileQrModal'
import { UserAvatar } from '../components/ui/Avatar'
import AmbientBackground from '../components/shared/AmbientBackground'

interface PublicProfileData {
  id: string
  mongoId: string
  name: string
  email?: string
  role: string
  department: string
  studentId?: string
  teacherId?: string
  designation?: string
  profilePicture?: string
  profileImage?: string
  bio?: string
  createdAt?: string
  complaintStats: {
    total: number
    resolved: number
    active: number
  }
  isVerified: boolean
}

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const { showToast } = useToast()

  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  useEffect(() => {
    if (!userId) {
      setError('Invalid Profile Identifier')
      setLoading(false)
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchPublicProfile(userId)
        if (res?.success && res?.profile) {
          setProfile(res.profile)
        } else {
          setError(res?.message || 'Access Denied: Profile credentials not found.')
        }
      } catch (err: any) {
        console.error('Public Profile Error:', err)
        setError(err?.response?.data?.message || 'Access Denied: Invalid or expired profile credential.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [userId])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      showToast('success', 'Profile credential link copied!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      showToast('error', 'Failed to copy link')
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen relative bg-[var(--background)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4">
        <AmbientBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 p-8 sm:p-10 rounded-[26px] bg-white/85 dark:bg-[#0E1520]/85 backdrop-blur-2xl border border-[var(--border)] shadow-2xl max-w-md w-full text-center space-y-6"
        >
          <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 w-16 h-16 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-[800] text-[var(--text-primary)] tracking-tight">
              Access Denied
            </h2>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-2">
              {error || 'The requested profile credentials could not be verified or do not exist.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              to={isAuthenticated ? (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student') : '/login'}
              className="w-full py-3 px-4 rounded-xl bg-[#111827] dark:bg-white text-white dark:text-[#111827] text-xs font-bold uppercase tracking-wider transition-all shadow-md block text-center"
            >
              Return to Gateway
            </Link>
          </div>
        </motion.div>
      </main>
    )
  }

  const roleLabel = profile.role === 'admin' ? 'Administrator' : profile.role === 'teacher' ? 'Faculty Member' : 'Student Member'
  const displayId = profile.studentId || profile.teacherId || profile.id.slice(0, 10)

  return (
    <main className="min-h-screen relative bg-[var(--background)] text-[var(--text-primary)] overflow-x-hidden transition-colors duration-200 antialiased py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      {/* Animated Ambient Background */}
      <AmbientBackground />

      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* ── Top Header Navigation Bar ────────────────────────────── */}
        <div className="h-[62px] px-3.5 sm:px-5 rounded-[22px] bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified Ledger Node</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share Link'}</span>
            </button>
          </div>
        </div>

        {/* ── 1. Hero Identity Card ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-6 sm:p-8 lg:p-10 rounded-[28px] bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] relative overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Column 1: Squircle Avatar */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center text-center">
              <div className="w-32 h-32 rounded-[26px] overflow-hidden border-2 border-[var(--border-subtle)] bg-[var(--surface-secondary)] shadow-lg relative flex items-center justify-center ring-4 ring-black/5 dark:ring-white/10">
                <UserAvatar
                  src={profile.profilePicture || profile.profileImage}
                  name={profile.name}
                  size={128}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 p-1.5 rounded-full bg-emerald-500 text-white border-2 border-white dark:border-[#0E1520] shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            </div>

            {/* Column 2: Center Credentials */}
            <div className="lg:col-span-6 space-y-3.5 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="px-3 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-[#111827] text-white dark:bg-white dark:text-[#111827]">
                  {roleLabel}
                </span>

                <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Profile
                </span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-[800] text-[var(--text-primary)] tracking-tight">
                  {profile.name}
                </h1>
                <p className="text-xs font-bold text-[var(--text-muted)] mt-1 font-mono uppercase tracking-wider">
                  ID: {displayId}
                </p>
              </div>

              {profile.bio ? (
                <p className="text-xs font-medium text-[var(--text-secondary)] italic max-w-xl">
                  "{profile.bio}"
                </p>
              ) : (
                <p className="text-xs font-medium text-[var(--text-muted)] italic">
                  CampusResolve Authorized Grievance Protocol Representative.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1 text-xs font-bold text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5 bg-[var(--surface-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
                  <Building className="w-3.5 h-3.5 text-[var(--accent)]" /> Dept: {profile.department}
                </span>
                {profile.designation && (
                  <span className="flex items-center gap-1.5 bg-[var(--surface-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
                    <Award className="w-3.5 h-3.5 text-purple-500" /> {profile.designation}
                  </span>
                )}
                {profile.createdAt && (
                  <span className="flex items-center gap-1.5 bg-[var(--surface-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)]">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" /> Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Column 3: Digital QR Card */}
            <div className="lg:col-span-3 flex flex-col items-center lg:items-end justify-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => setShowQrModal(true)}
                className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm cursor-pointer flex flex-col items-center gap-2 group text-center w-full max-w-[170px]"
              >
                <div className="p-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] w-full flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`}
                    alt="QR Code Preview"
                    className="w-24 h-24 object-contain rounded-lg group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> Scan Credentials
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── 2. Cryptographic Institutional Verification ───────────── */}
        <div className="p-6 sm:p-7 rounded-[26px] bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-[800] text-[var(--text-primary)] tracking-tight flex items-center gap-2 flex-wrap">
                  CampusResolve Institutional Verification
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Active Credential
                  </span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                  Cryptographically signed digital credential for academic grievance management.
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-mono text-[var(--text-muted)] block">Verification Hash</span>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">SHA256:{profile.id.slice(0, 12)}...</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-semibold">
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">Verification Date</span>
              <span className="text-[13.5px] text-[var(--text-primary)] font-bold">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">Security Protocol</span>
              <span className="text-[13.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Grade A Protocol v4.2
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">Institutional Identity</span>
              <span className="text-[13.5px] text-blue-600 dark:text-blue-400 font-bold">Verified {profile.role.toUpperCase()} Node</span>
            </div>
          </div>
        </div>

        {/* ── 3. KPI Metrics Matrix ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] flex items-center justify-between h-[108px]">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                Total Grievances
              </span>
              <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight leading-none">
                {profile.complaintStats.total}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] mt-1 inline-block">
                All filed support tickets
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] flex items-center justify-between h-[108px]">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                Cases Resolved
              </span>
              <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight leading-none">
                {profile.complaintStats.resolved}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] mt-1 inline-block">
                Successfully closed tickets
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] flex items-center justify-between h-[108px]">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                Active Queue
              </span>
              <div className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight leading-none">
                {profile.complaintStats.active}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] mt-1 inline-block">
                Pending resolution
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <ProfileQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        user={{
          id: profile.id,
          name: profile.name,
          role: profile.role,
          department: profile.department,
          studentId: profile.studentId,
          teacherId: profile.teacherId,
          profilePicture: profile.profilePicture
        }}
      />
    </main>
  )
}

export default PublicProfilePage
