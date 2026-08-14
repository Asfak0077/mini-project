import apiClient from './apiClient'

export interface SupabaseNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
  metadata?: Record<string, unknown> | null
}

interface ApiNotification {
  _id?: string
  id?: string
  userId?: string
  user_id?: string
  title?: string
  message?: string
  type?: string
  read?: boolean
  createdAt?: string
  created_at?: string
  metadata?: Record<string, unknown> | null
}

const getErrorMessage = (error: unknown) => {
  const maybeError = error as { response?: { data?: { message?: string } }, message?: string }
  return maybeError.response?.data?.message || maybeError.message || 'Unknown notification error'
}

const normalizeNotification = (notification: ApiNotification): SupabaseNotification => ({
  id: notification.id ?? notification._id ?? '',
  user_id: notification.user_id ?? notification.userId ?? '',
  title: notification.title ?? 'Notification',
  message: notification.message ?? '',
  type: notification.type ?? 'notification',
  read: notification.read ?? (notification as any).is_read ?? false,
  created_at: notification.created_at ?? notification.createdAt ?? new Date().toISOString(),
  metadata: notification.metadata
})

export const fetchUserNotifications = async (userId: string): Promise<SupabaseNotification[]> => {
  if (!userId) return []

  try {
    const { data } = await apiClient.get('/notifications?limit=30')
    const notifications: ApiNotification[] = Array.isArray(data?.notifications) ? data.notifications : []
    return notifications.map(normalizeNotification).filter(notification => notification.id)
  } catch (error) {
    console.error('Error fetching notifications:', getErrorMessage(error))
    return []
  }
}

export const markAsRead = async (id: string) => {
  try {
    await apiClient.post(`/notifications/mark-read/${id}`)
  } catch (error) {
    console.error('Error marking as read:', getErrorMessage(error))
  }
}

export const markAllAsRead = async (userId: string) => {
  if (!userId) return
  try {
    await apiClient.post('/notifications/mark-all-read')
  } catch (error) {
    console.error('Error marking all as read:', getErrorMessage(error))
  }
}
