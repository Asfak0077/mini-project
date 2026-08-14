/**
 * Helper utility for handling user profile avatar URLs, initial fallbacks, and image error handling.
 */

export const getAvatarUrl = (path?: string | null): string | null => {
  if (!path || typeof path !== 'string' || !path.trim()) {
    return null
  }
  const cleanPath = path.trim()
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://') || cleanPath.startsWith('data:') || cleanPath.startsWith('blob:')) {
    return cleanPath
  }
  const rawBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001'
  const apiBase = rawBase.replace(/\/api\/?$/, '')
  return `${apiBase}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`
}

export const getInitials = (name?: string | null): string => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'CR'
  }
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].substring(0, 2).toUpperCase()
}

/**
 * Image error handler that hides the broken img element on loading error
 * so that a broken image icon is never shown to the user.
 */
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget
  target.style.display = 'none'
  if (target.parentElement) {
    const fallbacks = target.parentElement.querySelectorAll('.avatar-fallback, .nav-avatar-fallback, .main-avatar-fallback')
    fallbacks.forEach((el) => {
      (el as HTMLElement).style.display = 'flex'
    })
  }
}
