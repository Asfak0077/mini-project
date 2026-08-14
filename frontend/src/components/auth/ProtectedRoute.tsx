import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuthStore, UserRole } from '../../store/authStore'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
  children: ReactNode
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const location = useLocation()
  const { isAuthenticated, role } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && !allowedRoles.includes(role)) {
    const fallback = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student'
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
