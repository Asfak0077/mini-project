import React, { useState, useEffect } from 'react'
import { getAvatarUrl, getInitials } from '../../utils/avatarUtils'

export interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number
  className?: string
  showBorder?: boolean
  showShadow?: boolean
  onClick?: () => void
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  showBorder = true,
  showShadow = true,
  onClick
}) => {
  const [hasError, setHasError] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)
  if (prevSrc !== src) {
    setPrevSrc(src)
    setHasError(false)
  }
  const avatarUrl = getAvatarUrl(src)

  const sizeClasses: Record<string, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
    '2xl': 'h-28 w-28 text-3xl'
  }

  const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined
  const sizeClass = typeof size === 'string' ? sizeClasses[size] || sizeClasses.md : ''

  const initials = getInitials(name)

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none ${
        showBorder ? 'border-2 border-white dark:border-slate-800' : ''
      } ${showShadow ? 'shadow-md shadow-blue-500/10' : ''} ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      } ${sizeClass} ${className}`}
      style={{
        ...sizeStyle,
        background: 'linear-gradient(135deg, #2563EB, #06B6D4)'
      }}
    >
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={name || 'User Profile'}
          loading="lazy"
          className="h-full w-full object-cover rounded-full transition-opacity duration-300"
          onError={() => {
            if (import.meta.env.DEV) {
              console.warn(`[Avatar] Failed to load image at "${avatarUrl}". Displaying initials fallback for "${name || 'User'}".`)
            }
            setHasError(true)
          }}
        />
      ) : (
        <span className="font-black text-white uppercase tracking-wider">{initials}</span>
      )}
    </div>
  )
}

export default UserAvatar
