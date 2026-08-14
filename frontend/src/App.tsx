import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import StudentFeedbackPage from './routes/StudentFeedbackPage'
import LandingPage from './routes/Landing'
import LoginPage from './routes/Login'
import SetPasswordPage from './routes/SetPasswordPage'
import StudentDashboard from './routes/StudentDashboard'
import AdminDashboard from './routes/AdminDashboard'
import AdminFeedbackPage from './routes/AdminFeedbackPage'
import TeacherManagement from './routes/TeacherManagement'
import TeacherDashboard from './routes/TeacherDashboard'
import ProfilePage from './routes/ProfilePage'
import ComplaintHistoryPage from './routes/ComplaintHistoryPage'
import FeedbackAnalyticsPage from './routes/FeedbackAnalyticsPage'
import AboutPage from './routes/AboutPage'
import ForgotPasswordPage from './routes/ForgotPasswordPage'
import ResetPasswordPage from './routes/ResetPassword'
import PublicProfilePage from './routes/PublicProfilePage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { fetchCurrentUser, verifyGoogleUserSession } from './services/authService'

import ChatAssistant from './components/chat/ChatAssistant'

import { supabase } from './lib/supabaseClient'

const App = () => {
  const role = useAuthStore((state) => state.role)
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  // Subscribe to isDarkMode so any external setTheme calls re-apply the DOM.
  // The store's applyThemeToDom is the single source of truth — no duplicate logic here.
  const { isDarkMode, setTheme } = useThemeStore()
  useEffect(() => {
    // Re-sync DOM on mount in case hydration script ran before body existed
    setTheme(isDarkMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for Supabase Auth state changes (OAuth callbacks, TOKEN_REFRESHED, SIGNED_IN, SIGNED_OUT)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password')
        return
      }

      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().clearAuth()
        return
      }

      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        const userEmail = (session.user.email || '').toLowerCase().trim()
        const currentStore = useAuthStore.getState()

        // Avoid re-verifying if already authenticated as this exact user with valid token
        if (currentStore.isAuthenticated && currentStore.user?.email?.toLowerCase() === userEmail && currentStore.token) {
          return
        }

        try {
          // Verify authenticated user's email against backend user/student database
          const verification = await verifyGoogleUserSession(session)

          if (!verification || !verification.authorized) {
            await supabase.auth.signOut().catch(() => undefined)
            useAuthStore.getState().clearAuth()
            const errorMsg = verification?.message || 'Your Google account is not registered for CampusResolve. Please use your authorized college account.'
            useAuthStore.getState().setAuthError(errorMsg)
            navigate('/login')
            return
          }

          useAuthStore.getState().setAuth({
            token: verification.accessToken,
            role: verification.role,
            user: verification.user
          })

          // Route to role-specific dashboard
          if (verification.role === 'admin') navigate('/admin')
          else if (verification.role === 'teacher') navigate('/teacher')
          else navigate('/student')
        } catch (err: any) {
          console.error('Google authorization error:', err)
          await supabase.auth.signOut().catch(() => undefined)
          useAuthStore.getState().clearAuth()
          const errorMsg = err?.response?.data?.message || 'Your Google account is not registered for CampusResolve. Please use your authorized college account.'
          useAuthStore.getState().setAuthError(errorMsg)
          navigate('/login')
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return
    }
    void fetchCurrentUser().catch((err: any) => {
      if (err.response?.status === 401 || err.message?.includes('expired') || err.message?.includes('401')) {
        useAuthStore.getState().clearAuth()
      }
    })
  }, [isAuthenticated, token])

  useEffect(() => {
    if (isAuthenticated && user?.requiresPasswordSetup && window.location.pathname !== '/set-password') {
      navigate('/set-password')
    }
  }, [isAuthenticated, user, navigate])

  return (
    <>
      <ChatAssistant />
      <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/feedback"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentFeedbackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/history"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ComplaintHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminFeedbackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <FeedbackAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TeacherManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              role === 'admin'
                ? <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
                : role === 'teacher'
                  ? <ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>
                  : role === 'student'
                    ? <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>
                    : <LandingPage />
            }
          />
        </Routes>
    </>
  )
}

export default App
