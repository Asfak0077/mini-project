import { FormEvent, useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  changeCurrentUserPassword,
  updateUserProfile,
  uploadProfilePhoto
} from '../../services/authService'
import { fetchStudentComplaints, fetchTeacherComplaints } from '../../services/complaintService'
import { getStudentFeedback } from '../../services/feedbackService'
import { generateBio } from '../../services/chatbotService'
import { getAvatarUrl, getInitials } from '../../utils/avatarUtils'
import ProfileQrModal from '../profile/ProfileQrModal'
import { Button } from '../ui/Button'
import {
  User, Shield, Mail, Phone, Building, Hash,
  CheckCircle2, AlertCircle, Save, Award, Sparkles,
  MessageSquare, History, Star, ChevronRight,
  Clock, Lock, QrCode, Camera, Edit3, X, Eye, EyeOff,
  GraduationCap, Calendar, Check, KeyRound, ExternalLink,
  ShieldCheck, FileText, ArrowUpRight, CheckCircle, ShieldAlert
} from 'lucide-react'

const ProfileSettings = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const updateUser = useAuthStore((s) => s.updateUser)
  const { isDarkMode } = useThemeStore()

  // Profile fields state
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [semesterYear, setSemesterYear] = useState(user?.semesterYear ?? '')
  const [designation, setDesignation] = useState(user?.designation ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [studentIdVal, setStudentIdVal] = useState(user?.studentId ?? '')

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChangingPass, setIsChangingPass] = useState(false)

  // Feedback and loading state
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isGeneratingBio, setIsGeneratingBio] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const studentId = user?.studentId || user?.email || ''
  const teacherId = user?.teacherId || user?.id || ''

  // Sync state when user prop updates
  useEffect(() => {
    if (user && !isEditModalOpen) {
      setName(user.name ?? '')
      setPhone(user.phone ?? '')
      setDepartment(user.department ?? '')
      setSemesterYear(user.semesterYear ?? '')
      setDesignation(user.designation ?? '')
      setBio(user.bio ?? '')
      setStudentIdVal(user.studentId ?? '')
    }
  }, [user, isEditModalOpen])

  // Queries for real profile metrics
  const complaintsQ = useQuery({
    queryKey: ['complaints', 'student', studentId],
    queryFn: () => fetchStudentComplaints(studentId),
    enabled: !!studentId && role === 'student',
  })

  const feedbackQ = useQuery({
    queryKey: ['student-feedback', studentId],
    queryFn: () => getStudentFeedback(studentId),
    enabled: !!studentId && role === 'student',
  })

  const teacherComplaintsQ = useQuery({
    queryKey: ['teacher-complaints-profile', teacherId],
    queryFn: () => fetchTeacherComplaints(teacherId),
    enabled: !!teacherId && role === 'teacher',
  })

  const complaints = (role === 'teacher' ? teacherComplaintsQ.data : complaintsQ.data) ?? []
  const feedbacks = feedbackQ.data ?? []

  // Calculate Profile Completion percentage
  const profileCompletion = useMemo(() => {
    let score = 0
    if (user?.name && user.name.trim().length > 0) score += 20
    if (user?.email && user.email.trim().length > 0) score += 20
    if (user?.studentId || user?.teacherId || user?.id) score += 20
    if (user?.department && user.department.trim().length > 0) score += 15
    if (user?.phone && user.phone.trim().length > 0) score += 15
    if (user?.profilePicture || user?.profileImage || (user?.bio && user.bio.trim().length > 0)) score += 10
    return Math.min(score, 100)
  }, [user])

  // Save profile updates
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setStatusMessage(null)

    try {
      const res = await updateUserProfile({
        name,
        phone,
        department,
        studentId: studentIdVal,
        semesterYear,
        designation,
        bio
      })

      if (res?.success) {
        setStatusMessage({ type: 'success', text: 'Profile updated successfully!' })
        setIsEditModalOpen(false)
        void queryClient.invalidateQueries({ queryKey: ['profile'] })
        void queryClient.invalidateQueries({ queryKey: ['user'] })
        setTimeout(() => setStatusMessage(null), 3500)
      } else {
        throw new Error(res?.message || 'Failed to update profile.')
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to save changes.' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle password update
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setIsChangingPass(true)
    try {
      await changeCurrentUserPassword({
        currentPassword,
        newPassword,
        userType: role,
        userId: user?.id
      })

      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setIsPasswordModalOpen(false)
        setPasswordSuccess('')
      }, 1500)
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || err?.message || 'Failed to change password. Check current password.')
    } finally {
      setIsChangingPass(false)
    }
  }

  // Handle Avatar Image Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image size must be under 5MB.' })
      return
    }

    setIsUploadingAvatar(true)
    setStatusMessage(null)

    try {
      const res = await uploadProfilePhoto(file)
      if (res?.success && res?.profileImage) {
        updateUser({
          ...user,
          profilePicture: res.profileImage,
          profileImage: res.profileImage
        })
        setStatusMessage({ type: 'success', text: 'Avatar photo updated successfully!' })
        void queryClient.invalidateQueries({ queryKey: ['profile'] })
        void queryClient.invalidateQueries({ queryKey: ['user'] })
        setTimeout(() => setStatusMessage(null), 3500)
      } else {
        throw new Error(res?.message || 'Upload failed')
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to upload image.' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // AI Bio generator
  const handleAiBio = async () => {
    setIsGeneratingBio(true)
    try {
      const generated = await generateBio(name || user?.name || 'Student', role ?? 'student', department || user?.department || 'General')
      setBio(generated)
    } catch {
      setBio(`${name || user?.name} is an active ${role} in the ${department || user?.department || 'CSE'} department at CampusResolve.`)
    } finally {
      setIsGeneratingBio(false)
    }
  }

  const avatarSrc = user?.profilePicture || user?.profileImage
  const resolvedAvatarUrl = getAvatarUrl(avatarSrc)
  const [avatarImgError, setAvatarImgError] = useState(false)
  const userInitials = getInitials(user?.name || user?.email || 'CR')
  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'Aug 2026'

  // Reset avatar image error if user profile updates
  useEffect(() => {
    setAvatarImgError(false)
  }, [avatarSrc])

  const roleLabel = role === 'teacher' ? 'Faculty Member' : role === 'admin' ? 'Administrator' : 'Student Member'

  return (
    <div className="space-y-6 transition-colors duration-200 pb-8">
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
            Account Profile
          </h1>
          <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
            Manage your verified identity, credentials, security protocols, and preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="md"
            icon={<Edit3 className="w-4 h-4" />}
            onClick={() => setIsEditModalOpen(true)}
            className="shadow-sm"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Global Status Toast / Notification */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Apple macOS Glassmorphic Hero Showcase ──────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-6 sm:p-8 rounded-[26px] bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            
            {/* Squircle Avatar with Ring & Interactive Edit Hover */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] overflow-hidden border-2 border-[var(--border-subtle)] bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#111827] dark:from-[#334155] dark:via-[#1E293B] dark:to-[#0F172A] shadow-md flex items-center justify-center relative ring-4 ring-black/5 dark:ring-white/10">
                {resolvedAvatarUrl && !avatarImgError ? (
                  <img
                    src={resolvedAvatarUrl}
                    alt={user?.name || 'User Avatar'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-[900] text-white tracking-wider select-none">
                    {userInitials}
                  </span>
                )}

                {/* Upload Overlay on Hover */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-[2px]"
                  title="Change avatar photo"
                >
                  {isUploadingAvatar ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                    </>
                  )}
                </button>
              </div>

              {/* Verified Online Status Badge */}
              <div
                className="absolute -bottom-1 -right-1 w-6.5 h-6.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0E1520] flex items-center justify-center text-white shadow-sm"
                title="Verified & Active Node"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Profile Info Details */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-[#111827] text-white dark:bg-white dark:text-[#111827]">
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Verified Identity
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight truncate leading-tight">
                {user?.name || 'Campus Student'}
              </h2>

              <p className="text-[13px] text-[var(--text-secondary)] font-semibold flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[var(--text-primary)] font-bold">
                  {user?.studentId || user?.teacherId || user?.id?.slice(0, 8).toUpperCase() || '23VEC371'}
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span>{user?.department || 'Computer Science & Engineering'}</span>
              </p>

              {user?.bio && (
                <p className="text-[12.5px] text-[var(--text-secondary)] italic max-w-xl line-clamp-2 pt-0.5">
                  "{user.bio}"
                </p>
              )}
            </div>
          </div>

          {/* Action Hub (QR Code, Password, Joined Date) */}
          <div className="flex sm:flex-col items-stretch sm:items-end justify-between gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
              >
                <QrCode className="w-4 h-4 text-[var(--accent)]" />
                <span>Digital ID QR</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
              >
                <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Security</span>
              </button>
            </div>

            <span className="text-[11px] font-semibold text-[var(--text-muted)] self-center sm:self-end">
              Member since {formattedJoinDate}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── 3. Quick Metrics Bar (4 Responsive Cards) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Profile Health */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col justify-between h-[108px]">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Profile Health
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {profileCompletion}% Complete
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-[var(--surface-secondary)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileCompletion}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
              />
            </div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">All verified attributes active</span>
          </div>
        </div>

        {/* Metric 2: Filed Grievances */}
        <Link
          to="/student/history"
          className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)] hover:shadow-md transition-all flex flex-col justify-between h-[108px] group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Total Complaints
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          </div>
          <div>
            <div className="text-2xl font-[800] text-[var(--text-primary)] tracking-tight">
              {String(complaints.length).padStart(2, '0')}
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Track resolution history →</span>
          </div>
        </Link>

        {/* Metric 3: Authentication Tier */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col justify-between h-[108px]">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Security Protocol
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-[15px] font-[800] text-[var(--text-primary)] tracking-tight">
              OAuth 2.0 / JWT
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Grade A Encryption</span>
          </div>
        </div>

        {/* Metric 4: Direct Desk Route */}
        <Link
          to="/student/feedback"
          className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)] hover:shadow-md transition-all flex flex-col justify-between h-[108px] group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Student Feedback
            </span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-[15px] font-[800] text-[var(--text-primary)] tracking-tight">
              {feedbacks.length > 0 ? `${feedbacks.length} Evaluations` : 'Submit Review'}
            </div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Rate department staff →</span>
          </div>
        </Link>
      </div>

      {/* ── 4. Information Grid (2 Structured macOS Cards) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        
        {/* Card 1: Personal & Academic Identity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] space-y-4"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)] text-[var(--accent)] flex items-center justify-center border border-[var(--border)]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15.5px] font-[800] text-[var(--text-primary)] tracking-tight">
                  Academic & Personal Identity
                </h3>
                <p className="text-[11.5px] text-[var(--text-muted)] font-medium">Core student cohort records</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
              title="Edit Personal Information"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                Full Legal Name
              </span>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate">
                {user?.name || 'Asfak Rahman'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                {role === 'teacher' ? 'Faculty ID' : 'Student Roll ID'}
              </span>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)] font-mono truncate">
                {user?.studentId || user?.teacherId || user?.id?.slice(0, 10).toUpperCase() || '23VEC371'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                Department
              </span>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate">
                {user?.department || 'Computer Science & Engineering'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                {role === 'teacher' ? 'Designation' : 'Semester / Year'}
              </span>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate">
                {role === 'teacher' ? (user?.designation || 'Professor') : (user?.semesterYear || 'Semester 7 / Final Year')}
              </p>
            </div>

            <div className="sm:col-span-2 p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                Profile Statement / Bio
              </span>
              <p className="text-[12.5px] font-medium text-[var(--text-secondary)] leading-relaxed">
                {user?.bio || 'No bio provided. Click Edit Profile to add a custom bio or generate one with AI.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Contact & Security Protocol */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] space-y-4"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)] text-[var(--accent)] flex items-center justify-center border border-[var(--border)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15.5px] font-[800] text-[var(--text-primary)] tracking-tight">
                  Contact & Security Protocol
                </h3>
                <p className="text-[11.5px] text-[var(--text-muted)] font-medium">Communication channels & verification</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
              title="Edit Contact Information"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Email */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#151D2A] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Email Address</span>
                  <span className="text-[13px] font-bold text-[var(--text-primary)] truncate block">{user?.email || 'student@campusresolve.edu'}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">Verified</span>
            </div>

            {/* Phone */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#151D2A] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Phone Number</span>
                  <span className="text-[13px] font-bold text-[var(--text-primary)] truncate block">{user?.phone || '+91 6385750815'}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">SMS Active</span>
            </div>

            {/* Security Row */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#151D2A] border border-[var(--border)] flex items-center justify-center text-amber-500 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Account Password</span>
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">Protected & Configured</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── 5. Quick Navigation Hub ─────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <h3 className="text-[14px] font-[800] text-[var(--text-primary)] tracking-tight">
          Quick Actions & Services
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/student/history" className="group">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)] hover:shadow-md transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13px] font-[700] text-[var(--text-primary)]">Complaint History</h4>
                  <p className="text-[11px] text-[var(--text-muted)]">Track submissions</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
            </div>
          </Link>

          <Link to="/student" className="group">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)] hover:shadow-md transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13px] font-[700] text-[var(--text-primary)]">Submit Complaint</h4>
                  <p className="text-[11px] text-[var(--text-muted)]">Lodge a grievance</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
            </div>
          </Link>

          <Link to="/student/feedback" className="group">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)] hover:shadow-md transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13px] font-[700] text-[var(--text-primary)]">Give Feedback</h4>
                  <p className="text-[11px] text-[var(--text-muted)]">Rate resolutions</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
            </div>
          </Link>

          <button
            onClick={() => setShowQrModal(true)}
            className="p-4 rounded-2xl bg-white/80 dark:bg-[#0E1520]/80 backdrop-blur-xl border border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)] hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[13px] font-[700] text-[var(--text-primary)]">Verified QR</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Digital identity</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          </button>
        </div>
      </div>

      {/* ── 6. EDIT PROFILE MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-[24px] bg-[var(--card)] border border-[var(--border)] p-6 sm:p-7 shadow-2xl relative z-10 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-xl font-[800] text-[var(--text-primary)] tracking-tight">Edit Profile</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Update your verified account details</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-[48px] px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full h-[48px] px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-[48px] px-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                    >
                      {['CSE', 'ECE', 'MECH', 'EEE', 'AIDS', 'IT', 'General'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {role === 'teacher' ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Associate Professor"
                      className="w-full h-[48px] px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                      Semester / Year
                    </label>
                    <input
                      type="text"
                      value={semesterYear}
                      onChange={(e) => setSemesterYear(e.target.value)}
                      placeholder="e.g. 3rd Year / 6th Sem"
                      className="w-full h-[48px] px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                      Bio / Statement
                    </label>
                    <button
                      type="button"
                      onClick={handleAiBio}
                      disabled={isGeneratingBio}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      {isGeneratingBio ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a little about your role and interests on campus..."
                    className="w-full p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-medium text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isSavingProfile}
                    icon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. CHANGE PASSWORD MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-[24px] bg-[var(--card)] border border-[var(--border)] p-6 sm:p-7 shadow-2xl relative z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-xl font-[800] text-[var(--text-primary)] tracking-tight">Change Password</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Update your account credentials</p>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full h-[48px] pl-4 pr-11 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-[48px] pl-4 pr-11 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-[48px] px-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isChangingPass}
                    icon={<Lock className="w-3.5 h-3.5" />}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. DIGITAL ID QR MODAL ─────────────────────────────────── */}
      <ProfileQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        user={{
          name: user?.name || 'Student',
          studentId: user?.studentId || user?.teacherId || '23VEC371',
          department: user?.department || 'CSE',
          role: role || 'student',
          profilePicture: user?.profilePicture || user?.profileImage
        }}
      />
    </div>
  )
}

export default ProfileSettings
