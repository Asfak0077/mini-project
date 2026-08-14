import { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { SupabaseNotification, fetchUserNotifications } from '../services/notificationHelper'

export const useSupabaseNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<SupabaseNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { socket, connected } = useSocket()

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      queueMicrotask(() => {
        if (!cancelled) {
          setNotifications([])
          setUnreadCount(0)
        }
      })
      return () => {
        cancelled = true
      }
    }

    fetchUserNotifications(userId).then((data) => {
      if (!cancelled) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    }).catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!socket || !connected || !userId) return

    const refresh = () => {
      fetchUserNotifications(userId).then((data) => {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }).catch(() => undefined)
    }

    socket.on('new_complaint', refresh)
    socket.on('complaint_assigned', refresh)
    socket.on('new_assignment', refresh)
    socket.on('status_updated', refresh)
    socket.on('new_notification', refresh)
    socket.on('support_ticket_created', refresh)
    socket.on('support_ticket_assigned', refresh)
    socket.on('support_ticket_replied', refresh)
    socket.on('support_ticket_resolved', refresh)

    return () => {
      socket.off('new_complaint', refresh)
      socket.off('complaint_assigned', refresh)
      socket.off('new_assignment', refresh)
      socket.off('status_updated', refresh)
      socket.off('new_notification', refresh)
      socket.off('support_ticket_created', refresh)
      socket.off('support_ticket_assigned', refresh)
      socket.off('support_ticket_replied', refresh)
      socket.off('support_ticket_resolved', refresh)
    }
  }, [socket, connected, userId])

  return { notifications, unreadCount, setNotifications, setUnreadCount }
}
