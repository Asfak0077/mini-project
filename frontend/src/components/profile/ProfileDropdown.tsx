import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CircleUserRound, Settings, FileText, LogOut,
  ChevronDown, IdCard
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { logout } from '../../services/authService'
import { UserAvatar } from '../ui/Avatar'

interface ProfileDropdownProps {
  onCloseSidebar?: () => void
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onCloseSidebar }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsOpen(false)
    if (onCloseSidebar) onCloseSidebar()
    await logout()
    navigate('/login')
  }

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    if (onCloseSidebar) onCloseSidebar()
    navigate(path)
  }

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Faculty' : 'Student'
  const studentId = user?.studentId || user?.teacherId || user?.id || 'N/A'
  const department = user?.department || (role === 'admin' ? 'Administration' : role === 'teacher' ? 'Faculty' : 'General')

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Menu Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-full left-0 right-0 mb-2.5 z-50 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card)] shadow-xl p-2 space-y-1 text-[var(--text-primary)]"
          >
            {/* User Details Header */}
            <div className="px-3 py-2.5 rounded-[14px] bg-[var(--surface-secondary)] border border-[var(--border)] mb-1">
              <div className="flex items-center justify-between gap-1 mb-1">
                <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                  {user?.name || 'Campus User'}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--primary-subtle)] text-[var(--accent)] shrink-0 border border-[var(--primary-border)]">
                  {roleLabel}
                </span>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                {user?.email || 'No email provided'}
              </p>
              <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-1 text-[10px]">
                <div>
                  <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider block">ID</span>
                  <span className="font-bold text-[var(--text-primary)] truncate block">{studentId}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider block">Dept</span>
                  <span className="font-bold text-[var(--text-primary)] truncate block">{department}</span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            {/* 1. Profile */}
            <button
              type="button"
              onClick={() => handleNavigate('/student/profile')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer group"
            >
              <CircleUserRound className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0" />
              <span>Profile</span>
            </button>

            {/* 2. Account Details */}
            <button
              type="button"
              onClick={() => handleNavigate('/student/profile')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer group"
            >
              <IdCard className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0" />
              <span>Account Details</span>
            </button>

            {/* 3. Settings */}
            <button
              type="button"
              onClick={() => handleNavigate('/student/profile')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer group"
            >
              <Settings className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0" />
              <span>Settings</span>
            </button>

            {/* 4. Terms & Policies */}
            <button
              type="button"
              onClick={() => handleNavigate('/about')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer group"
            >
              <FileText className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0" />
              <span>Terms & Policies</span>
            </button>

            <div className="my-1 border-t border-[var(--border)]" />

            {/* 5. Sign Out */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer group"
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[16px] bg-[var(--surface-secondary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all duration-200 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer shadow-none"
      >
        <UserAvatar
          src={user?.profilePicture || user?.profileImage}
          name={user?.name}
          size="sm"
          className="w-9 h-9 shrink-0 rounded-full ring-1 ring-black/5"
        />

        <div className="flex flex-col justify-center min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-bold text-[var(--text-primary)] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
              {user?.name || 'Campus User'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] truncate leading-none mt-0.5">
            {user?.email || 'Logged in'}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[var(--text-primary)]' : 'group-hover:text-[var(--text-primary)]'
          }`}
        />
      </motion.button>
    </div>
  )
}

export default ProfileDropdown
