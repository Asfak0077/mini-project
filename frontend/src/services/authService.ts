import apiClient from './apiClient'
import { UserRole, useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabaseClient'

export interface Credentials {
  email: string
  password: string
}

export interface TeacherCredentials {
  teacherId?: string
  email?: string
  password: string
}

const inferRoleFromEmail = (email: string): UserRole => {
  const normalized = email.toLowerCase()
  if (normalized.startsWith('admin')) return 'admin'
  if (normalized.startsWith('teacher') || normalized.startsWith('faculty') || normalized.includes('.teacher@')) return 'teacher'
  return 'student'
}

const getErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || error?.message || fallback
}

type ProfilePayload = {
  name?: string
  phone?: string
  department?: string
  studentId?: string
  emailNotifications?: boolean
  semesterYear?: string
  designation?: string
  specialization?: string
  officeLocation?: string
  bio?: string
  address?: string
  preferences?: { darkMode: boolean; language: string; emailNotifications: boolean }
}

export const loginWithEmail = async (credentials: Credentials) => {
  try {
    const cleanEmail = credentials.email.trim()

    // 1. Authenticate with Supabase Auth (SOURCE OF TRUTH)
    const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: credentials.password
    })

    // 2. Also authenticate against backend API
    let backendResult: any = null
    try {
      const { data } = await apiClient.post('/auth/student-login', credentials)
      backendResult = data
    } catch (backendErr: any) {
      if (sbError) {
        throw new Error(sbError.message || backendErr?.response?.data?.message || 'Invalid email address or password.')
      }
    }

    if (sbError && !backendResult) {
      throw new Error(sbError.message || 'Invalid email address or password.')
    }

    const userData = backendResult?.user || {
      id: sbData?.user?.id || 'demo-user',
      name: sbData?.user?.user_metadata?.name || 'User',
      email: cleanEmail,
      role: inferRoleFromEmail(cleanEmail)
    }

    const role = userData.role ?? inferRoleFromEmail(cleanEmail)
    const accessToken = backendResult?.accessToken || sbData?.session?.access_token || ''

    useAuthStore.getState().setAuth({
      token: accessToken,
      role,
      user: {
        id: userData.id ?? userData._id,
        name: userData.name ?? 'User',
        email: userData.email ?? cleanEmail,
        phone: userData.phone ?? '',
        department: userData.department ?? (role === 'admin' ? 'Administration' : role === 'teacher' ? 'Faculty' : 'General'),
        studentId: userData.studentId ?? userData.idNumber ?? '',
        teacherId: userData.teacherId ?? '',
        semesterYear: userData.semesterYear ?? '',
        designation: userData.designation ?? '',
        specialization: userData.specialization ?? '',
        officeLocation: userData.officeLocation ?? '',
        bio: userData.bio ?? '',
        address: userData.address ?? '',
        profilePicture: userData.profilePicture || userData.profileImage || undefined,
        profileImage: userData.profileImage || userData.profilePicture || undefined,
        notificationsEnabled: userData.emailNotifications ?? true,
        preferences: userData.preferences ?? { darkMode: true, language: 'en', emailNotifications: true },
        activityHistory: userData.activityHistory ?? [],
        completionPercentage: userData.completionPercentage ?? 20,
        lastLogin: userData.lastLogin ?? new Date().toISOString()
      }
    })

    return { success: true, ...userData, role }
  } catch (error: any) {
    throw new Error(getErrorMessage(error, 'Unable to sign in. Check your credentials.'))
  }
}

export const loginWithTeacherId = async (credentials: TeacherCredentials) => {
  try {
    // Normalize teacher ID to uppercase for case-insensitive handling
    const normalizedCredentials = {
      ...credentials,
      teacherId: (credentials.teacherId || credentials.email || '').toUpperCase()
    }

    const { data } = await apiClient.post('/auth/teacher-login', normalizedCredentials)
    useAuthStore.getState().setAuth({
      token: data.accessToken,
      role: 'teacher',
      user: {
        id: data.user?.id ?? normalizedCredentials.teacherId,
        name: data.user?.name ?? 'Faculty Member',
        email: data.user?.email ?? '',
        phone: data.user?.phone ?? '',
        department: data.user?.department ?? 'Faculty',
        studentId: '',
        teacherId: data.user?.teacherId ?? normalizedCredentials.teacherId,
        semesterYear: '',
        designation: data.user?.designation ?? 'Professor',
        specialization: data.user?.specialization ?? '',
        officeLocation: data.user?.officeLocation ?? '',
        bio: data.user?.bio ?? '',
        address: '',
        profilePicture: data.user?.profilePicture || data.user?.profileImage || undefined,
        profileImage: data.user?.profileImage || data.user?.profilePicture || undefined,
        notificationsEnabled: data.user?.emailNotifications ?? true,
        preferences: data.user?.preferences ?? { darkMode: true, language: 'en', emailNotifications: true },
        activityHistory: data.user?.activityHistory ?? [],
        completionPercentage: data.user?.completionPercentage ?? 20,
        lastLogin: data.user?.lastLogin ?? new Date().toISOString()
      }
    })
    return { success: true, ...data.user, role: 'teacher' as const }
  } catch (error) {
    // Validate with uppercase version for consistent error messages
    const inputUpper = (credentials.teacherId || credentials.email || '').toUpperCase()
    if (!inputUpper.startsWith('TCH') && !inputUpper.includes('@')) {
      throw new Error('Invalid Teacher ID or Email format')
    }
    throw new Error(getErrorMessage(error, 'Unable to sign in. Check your credentials.'))
  }
}

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) {
    console.error('Google OAuth error:', error)
    throw new Error(error.message || 'Google sign-in failed. Please try again or use email and password.')
  }
}

export const verifyGoogleUserSession = async (session: any) => {
  if (!session?.user?.email) return null
  const payload = {
    email: session.user.email,
    name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email.split('@')[0],
    picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
    googleId: session.user.id
  }
  const { data } = await apiClient.post('/auth/verify-google-user', payload)
  return data
}

export const fetchCurrentUser = async () => {
  const { data } = await apiClient.get('/auth/me')
  const profile = data?.user
  if (!profile) {
    throw new Error('User profile not found')
  }
  useAuthStore.getState().updateUser({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    department: profile.department,
    studentId: profile.studentId,
    teacherId: profile.teacherId,
    semesterYear: profile.semesterYear,
    designation: profile.designation,
    specialization: profile.specialization,
    officeLocation: profile.officeLocation,
    bio: profile.bio,
    address: profile.address,
    profilePicture: profile.profilePicture || profile.profileImage || undefined,
    profileImage: profile.profileImage || profile.profilePicture || undefined,
    notificationsEnabled: profile.emailNotifications,
    preferences: profile.preferences,
    activityHistory: profile.activityHistory,
    completionPercentage: profile.completionPercentage
  })
  return profile
}

export const updateCurrentUserProfile = async (payload: ProfilePayload) => {
  const { data } = await apiClient.put('/auth/profile', payload)
  const profile = data?.user
  if (profile) {
    useAuthStore.getState().updateUser({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
      studentId: profile.studentId,
      teacherId: profile.teacherId,
      semesterYear: profile.semesterYear,
      designation: profile.designation,
      specialization: profile.specialization,
      officeLocation: profile.officeLocation,
      bio: profile.bio,
      address: profile.address,
      profilePicture: profile.profilePicture || profile.profileImage || undefined,
      profileImage: profile.profileImage || profile.profilePicture || undefined,
      notificationsEnabled: profile.emailNotifications,
      preferences: profile.preferences,
      activityHistory: profile.activityHistory,
      completionPercentage: profile.completionPercentage
    })
  }

  // Also sync Supabase Auth User metadata if Supabase session exists
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.auth.updateUser({
        data: {
          name: payload.name,
          phone: payload.phone,
          department: payload.department,
          studentId: payload.studentId,
          semesterYear: payload.semesterYear,
          bio: payload.bio,
          address: payload.address
        }
      })
    }
  } catch (err) {
    console.warn('Supabase Auth user metadata sync notice:', err)
  }

  return data
}

export const fetchPublicProfile = async (userId: string) => {
  const { data } = await apiClient.get(`/profile/public/${userId}`)
  return data
}

export const fetchUserProfile = async () => {
  const { data } = await apiClient.get('/profile')
  if (data?.success && data?.user) {
    useAuthStore.getState().updateUser(data.user)
  }
  return data
}

export const updateUserProfile = async (payload: ProfilePayload) => {
  const { data } = await apiClient.put('/profile/update', payload)
  if (data?.success && data?.user) {
    useAuthStore.getState().updateUser(data.user)
  }

  // Also sync Supabase Auth User metadata if Supabase session exists
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.auth.updateUser({
        data: {
          name: payload.name,
          phone: payload.phone,
          department: payload.department,
          studentId: payload.studentId,
          semesterYear: payload.semesterYear,
          bio: payload.bio,
          address: payload.address
        }
      })
    }
  } catch (err) {
    console.warn('Supabase Auth user metadata sync notice:', err)
  }

  return data
}

export const uploadProfilePhoto = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)

  let data
  try {
    const res = await apiClient.post('/users/profile/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    data = res.data
  } catch {
    const res = await apiClient.post('/profile/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    data = res.data
  }

  if (data?.success) {
    const img = data.user?.profilePicture || data.user?.profileImage || data.profilePicture || data.profileImage
    const userUpdates = data.user ? { ...data.user } : {}
    if (img) {
      userUpdates.profilePicture = img
      userUpdates.profileImage = img
    }
    useAuthStore.getState().updateUser(userUpdates)
  }
  return data
}

export const changeCurrentUserPassword = async (payload: {
  currentPassword: string
  newPassword: string
  userType?: UserRole | null
  userId?: string
}) => {
  const { data } = await apiClient.post('/auth/change-password', payload)
  return data
}

export const setPassword = async (password: string) => {
  const { data } = await apiClient.post('/auth/set-password', { password })
  return data
}

export const updatePasswordInBackend = async (arg1: string, arg2?: string) => {
  let userEmail = ''
  let targetPassword = ''

  if (arg1 && arg1.includes('@')) {
    userEmail = arg1
    targetPassword = arg2 || ''
  } else if (arg2 && arg2.includes('@')) {
    userEmail = arg2
    targetPassword = arg1
  } else {
    targetPassword = arg1
    userEmail = arg2 || ''
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  userEmail = userEmail || session?.user?.email || ''

  if (!userEmail) {
    console.error('❌ Cannot update MongoDB password: User email is missing')
    throw new Error('User email is required to update database password.')
  }

  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const { data } = await apiClient.put('/auth/reset-password', {
      password: targetPassword,
      email: userEmail
    }, { headers })

    console.log('[AUTH LOG] MongoDB password hash updated for:', userEmail)
    return data
  } catch (err: any) {
    // Fallback to /auth/update-password
    const { data } = await apiClient.post('/auth/update-password', {
      password: targetPassword,
      email: userEmail
    }, { headers })

    console.log('[AUTH LOG] MongoDB password hash updated via fallback for:', userEmail)
    return data
  }
}



export const requestPasswordReset = async (email: string, role?: UserRole) => {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error('Please enter a valid email address.')
  }

  // 1. Verify user exists if role provided
  if (role) {
    try {
      const { data: check } = await apiClient.post('/auth/verify-email-exists', { email: normalizedEmail, role })
      if (check && check.registered === false) {
        throw new Error('This email is not registered in our system.')
      }
    } catch (err: any) {
      if (err.message && err.message.includes('not registered')) {
        throw err
      }
    }
  }

  const redirectTo = `${window.location.origin}/reset-password`

  // 2. Trigger Supabase Password Reset Link
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  })

  // 3. Also dispatch through backend Nodemailer with the branded institutional template
  apiClient.post('/auth/send-password-reset-email', {
    email: normalizedEmail,
    resetUrl: redirectTo,
    name: 'Student'
  }).catch((e) => console.warn('Backend reset email dispatch notice:', e.message))

  if (error) {
    throw new Error(error.message || 'Failed to send password reset instructions.')
  }

  return { success: true, message: 'Password reset instructions have been sent to your email.' }
}

export const logout = async () => {
  await supabase.auth.signOut().catch(() => undefined)
  useAuthStore.getState().clearAuth()
}

export const checkAllowedEmail = async (email: string) => {
  const { data } = await apiClient.post('/auth/check-email', { email })
  return data
}

export const completeSignup = async (payload: { email: string; name: string; department?: string; role: string; studentId?: string }) => {
  const { data } = await apiClient.post('/auth/complete-signup', payload)
  useAuthStore.getState().setAuth({
    token: data.accessToken,
    role: data.user.role,
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      phone: '',
      department: data.user.department,
      studentId: data.user.studentId ?? '',
      notificationsEnabled: true,
      lastLogin: new Date().toISOString()
    }
  })
  return data
}
