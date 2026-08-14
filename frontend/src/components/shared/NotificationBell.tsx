import { useState } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useNotifications } from '../../contexts/NotificationContext'
import { formatDisplayComplaintId } from './ComplaintIdBadge'

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  const toggleNotifications = () => {
    setIsOpen(!isOpen)
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markRead(notification.id)
    }

    if (role === 'admin') navigate('/admin')
    else if (role === 'teacher') navigate('/teacher')
    else if (role === 'student') {
      navigate(notification.type === 'profile_updated' ? '/student/profile' : '/student/history')
    }
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleNotifications}
        className="relative w-10 h-10 rounded-full bg-white dark:bg-[#101722] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all shadow-[var(--shadow-sm)] flex items-center justify-center cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5 text-[var(--text-secondary)]" />

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#101722]"
            />
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-80 z-50 origin-top-right rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-xl)] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface-secondary)]/50">
                <h3 className="font-bold text-[var(--text-heading)] text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-xs font-bold text-[var(--primary)] hover:underline transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-muted)] text-xs font-medium">
                    <p>No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer ${!notification.read ? 'bg-[var(--primary-subtle)]' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!notification.read ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                          <div className="flex-1">
                            <p className={`text-xs font-bold mb-0.5 flex items-center gap-1.5 ${!notification.read ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {(notification.metadata as any)?.complaintId && (
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">
                                  {formatDisplayComplaintId(String((notification.metadata as any).complaintId))}
                                </span>
                              )}
                              <span>{String(notification.title || '')}</span>
                            </p>
                            <p className={`text-xs ${!notification.read ? 'text-[var(--text-heading)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-[var(--border)] bg-[var(--surface-secondary)]/50 text-center">
                <button className="text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors w-full py-1">
                  View all history
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
