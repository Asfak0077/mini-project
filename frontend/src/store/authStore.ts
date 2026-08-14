import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'student' | 'admin' | 'teacher'

export interface AuthUser {
  id?: string
  name: string
  email: string
  phone?: string
  department?: string
  studentId?: string
  teacherId?: string
  notificationsEnabled?: boolean
  lastLogin?: string
  profilePicture?: string
  profileImage?: string
  requiresPasswordSetup?: boolean
  bio?: string
  address?: string
  semesterYear?: string
  designation?: string
  specialization?: string
  officeLocation?: string
  preferences?: { darkMode: boolean; language: string; emailNotifications: boolean }
  activityHistory?: Array<{ action: string; details: string; timestamp: string; _id?: string }>
  completionPercentage?: number
  createdAt?: string
}

interface AuthState {
  token: string | null
  role: UserRole | null
  user?: AuthUser
  isAuthenticated: boolean
  authError: string | null
  setAuth: (payload: { token: string; role: UserRole; user: AuthUser }) => void
  updateUser: (user: Partial<AuthUser>) => void
  setAuthError: (err: string | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: undefined,
      isAuthenticated: false,
      authError: null,
      setAuth: ({ token, role, user }) =>
        set({ token, role, user, isAuthenticated: true, authError: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : state.user
        })),
      setAuthError: (authError) => set({ authError }),
      clearAuth: () => set({ token: null, role: null, user: undefined, isAuthenticated: false })
    }),
    {
      name: 'sdcfrs-auth'
    }
  )
)
