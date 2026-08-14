import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  History,
  MessageSquare,
  CircleUserRound,
  GraduationCap,
  BarChart3,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSidebarStore } from '../../store/sidebarStore'
import { motion, AnimatePresence } from 'framer-motion'
import { UserAvatar } from '../ui/Avatar'
import { logout } from '../../services/authService'

interface NavItemDef {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>
  end?: boolean
  badge?: string
}

const AppSidebar: React.FC = () => {
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const { isExpanded, toggleExpanded, isMobileOpen, closeMobile } = useSidebarStore()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const navItems: NavItemDef[] =
    role === 'admin'
      ? [
          { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
          { to: '/admin/teachers', label: 'Faculty Directory', icon: GraduationCap },
          { to: '/admin/feedback', label: 'Feedback Inbox', icon: MessageSquare },
          { to: '/admin/analytics', label: 'Analytics & Trends', icon: BarChart3 },
          { to: '/student/profile', label: 'Admin Profile', icon: CircleUserRound },
        ]
      : role === 'teacher'
        ? [
            { to: '/teacher', label: 'Faculty Queue', icon: LayoutDashboard, end: true },
            { to: '/student/profile', label: 'Faculty Profile', icon: CircleUserRound },
          ]
        : [
            { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/student/history', label: 'Complaint History', icon: History },
            { to: '/student/feedback', label: 'Submit Feedback', icon: MessageSquare },
            { to: '/student/profile', label: 'My Profile', icon: CircleUserRound },
          ]

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      useAuthStore.getState().clearAuth()
    }
  }

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Faculty Member' : 'Student'

  return (
    <>
      {/* ── Mobile Backdrop Blur Overlay ────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* ── Apple macOS Floating Glassmorphic Island Sidebar ────────── */}
      <aside
        className={`
          fixed z-50 flex flex-col justify-between
          bg-white/85 dark:bg-[#0E1520]/85 backdrop-blur-2xl
          border border-[rgba(220,218,209,0.8)] dark:border-white/[0.08]
          shadow-[0_12px_40px_rgba(15,23,42,0.08),0_2px_10px_rgba(15,23,42,0.04)]
          dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.1)]
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${
            isMobileOpen
              ? 'top-0 bottom-0 left-0 w-[276px] rounded-r-[28px] translate-x-0'
              : 'top-0 bottom-0 left-0 w-[276px] -translate-x-full lg:translate-x-0'
          }
          lg:top-3.5 lg:bottom-3.5 lg:left-3.5 lg:rounded-[28px]
          ${isExpanded ? 'lg:w-[244px]' : 'lg:w-[76px]'}
        `}
        aria-label="Sidebar navigation"
      >
        {/* ── 1. Top Section: Brand Squircle & Toggle ─────────────── */}
        <div
          className={`h-16 px-3.5 flex items-center border-b border-[var(--border-subtle)]/70 transition-all duration-200 ${
            isExpanded ? 'justify-between' : 'justify-center'
          }`}
        >
          <Link
            to="/"
            onClick={closeMobile}
            className="flex items-center gap-3 group cursor-pointer overflow-hidden min-w-0"
            title="CampusResolve Portal"
          >
            {/* macOS Style Gradient Squircle Logo */}
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#111827] via-[#1E293B] to-[#0F172A] dark:from-white dark:via-slate-100 dark:to-slate-200 text-white dark:text-[#0F172A] flex items-center justify-center font-black text-[14.5px] tracking-tight shadow-md shrink-0 group-hover:scale-105 transition-transform duration-200 ring-1 ring-black/5 dark:ring-white/20">
              <span className="font-extrabold tracking-tighter">CR</span>
            </div>

            {/* Brand Title (visible when expanded or on mobile) */}
            <div className={`flex flex-col min-w-0 ${!isExpanded ? 'lg:hidden' : 'block'}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[15px] tracking-tight text-[var(--text-primary)] truncate">
                  CampusResolve
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">
                {roleLabel}
              </span>
            </div>
          </Link>

          {/* Desktop Slide Collapse Button (Only shown when expanded) */}
          {isExpanded && (
            <button
              type="button"
              onClick={toggleExpanded}
              className="hidden lg:flex p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. Middle Section: Navigation Stack ──────────────────── */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)

            return (
              <div
                key={item.to}
                className="relative"
                onMouseEnter={() => setHoveredItem(item.to)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  to={item.to}
                  onClick={closeMobile}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-[16px] text-[13.5px] font-semibold
                    transition-all duration-150 cursor-pointer group
                    ${
                      isActive
                        ? 'text-white dark:text-[#0F172A]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }
                    ${!isExpanded ? 'lg:justify-center lg:px-0 lg:w-11 lg:h-11 lg:mx-auto' : ''}
                  `}
                  aria-label={item.label}
                >
                  {/* macOS Pill Active Background with smooth layoutId */}
                  {isActive && (
                    <motion.div
                      layoutId="macActivePill"
                      className="absolute inset-0 bg-[#111827] dark:bg-white rounded-[16px] shadow-sm z-0"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}

                  <item.icon
                    className={`w-5 h-5 shrink-0 relative z-10 transition-transform duration-200 ${
                      isActive ? 'scale-105' : 'group-hover:scale-105'
                    }`}
                    strokeWidth={isActive ? 2.3 : 1.9}
                  />

                  {/* Label (visible when expanded or on mobile) */}
                  <span
                    className={`truncate relative z-10 transition-all duration-200 ${
                      !isExpanded ? 'lg:hidden' : 'block'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Optional Badge */}
                  {item.badge && isExpanded && (
                    <span className="ml-auto relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {item.badge}
                    </span>
                  )}
                </Link>

                {/* Desktop Floating Frosted Glass Tooltip when Collapsed */}
                <AnimatePresence>
                  {!isExpanded && hoveredItem === item.to && (
                    <motion.div
                      initial={{ opacity: 0, x: 8, scale: 0.95 }}
                      animate={{ opacity: 1, x: 16, scale: 1 }}
                      exit={{ opacity: 0, x: 8, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#111827]/95 dark:bg-[#1E293B]/95 backdrop-blur-xl text-white text-[12px] font-bold rounded-xl shadow-xl whitespace-nowrap pointer-events-none z-50 border border-white/10"
                    >
                      {item.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </nav>

        {/* ── 3. Bottom Section: User Profile & Actions ────────────── */}
        <div className="p-3 border-t border-[var(--border-subtle)]/70 space-y-2">
          {/* User Profile Card */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredItem('profile')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link
              to="/student/profile"
              onClick={closeMobile}
              className={`
                flex items-center gap-3 p-1.5 rounded-[16px] hover:bg-black/5 dark:hover:bg-white/5
                transition-colors cursor-pointer group
                ${!isExpanded ? 'lg:justify-center lg:p-1' : ''}
              `}
              title="View Profile Settings"
            >
              <div className="relative shrink-0">
                <UserAvatar
                  src={user?.profilePicture || user?.profileImage}
                  name={user?.name || 'User'}
                  size="sm"
                  className="w-9 h-9 rounded-[13px] shadow-xs ring-2 ring-[var(--border-subtle)] group-hover:ring-[var(--accent)]"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0E1520]" />
              </div>

              <div className={`flex flex-col min-w-0 ${!isExpanded ? 'lg:hidden' : 'block'}`}>
                <span className="text-[12.5px] font-bold text-[var(--text-primary)] truncate">
                  {user?.name || 'My Profile'}
                </span>
                <span className="text-[10.5px] text-[var(--text-muted)] truncate">
                  {user?.email || 'Logged in'}
                </span>
              </div>
            </Link>

            {/* Tooltip for profile when collapsed */}
            <AnimatePresence>
              {!isExpanded && hoveredItem === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, x: 8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 16, scale: 1 }}
                  exit={{ opacity: 0, x: 8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#111827]/95 dark:bg-[#1E293B]/95 backdrop-blur-xl text-white text-[12px] font-bold rounded-xl shadow-xl whitespace-nowrap pointer-events-none z-50 border border-white/10"
                >
                  {user?.name || 'My Profile'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout Action Button */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button
              type="button"
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-[14px] text-[12.5px] font-semibold
                text-[var(--text-secondary)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10
                transition-colors cursor-pointer
                ${!isExpanded ? 'lg:justify-center lg:px-0 lg:h-9.5' : ''}
              `}
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.9} />
              <span className={!isExpanded ? 'lg:hidden' : 'block'}>Sign Out</span>
            </button>

            {/* Tooltip for logout when collapsed */}
            <AnimatePresence>
              {!isExpanded && hoveredItem === 'logout' && (
                <motion.div
                  initial={{ opacity: 0, x: 8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 16, scale: 1 }}
                  exit={{ opacity: 0, x: 8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#111827]/95 dark:bg-[#1E293B]/95 backdrop-blur-xl text-white text-[12px] font-bold rounded-xl shadow-xl whitespace-nowrap pointer-events-none z-50 border border-white/10"
                >
                  Sign Out
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </>
  )
}

export default AppSidebar
