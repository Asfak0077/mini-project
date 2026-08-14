import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useSupabaseNotifications } from '../hooks/useSupabaseNotifications'
import { markAsRead, markAllAsRead, SupabaseNotification } from '../services/notificationHelper'

interface NotificationContextType {
  notifications: SupabaseNotification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const user = useAuthStore(s => s.user)
  const role = useAuthStore(s => s.role)
  
  const userId = useMemo(() => {
    if (!user) return ''
    if (role === 'teacher' && user.teacherId) return user.teacherId
    if (role === 'student' && user.studentId) return user.studentId
    if (user.id) return user.id
    return ''
  }, [user, role])

  const { notifications, unreadCount, setNotifications, setUnreadCount } = useSupabaseNotifications(userId)

  const handleMarkRead = async (id: string) => {
    const target = notifications.find(n => n.id === id)
    if (target && !target.read) {
      // Optimistic update
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      await markAsRead(id)
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    // Optimistic update
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    if (userId) {
      await markAllAsRead(userId)
    }
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markRead: handleMarkRead,
      markAllRead: handleMarkAllRead
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
