import React from 'react'
import { Menu, PanelLeft, ChevronRight } from 'lucide-react'
import NotificationBell from '../shared/NotificationBell'
import ThemeToggle from '../shared/ThemeToggle'
import { Link, useLocation } from 'react-router-dom'
import { UserAvatar } from '../ui/Avatar'
import { useAuthStore } from '../../store/authStore'
import { useSidebarStore } from '../../store/sidebarStore'
import ActionSearchBar from '../search/ActionSearchBar'

const getBreadcrumbTitle = (pathname: string): { category: string; section: string } => {
  if (pathname.startsWith('/admin/teachers')) return { category: 'Faculty', section: 'Directory' }
  if (pathname.startsWith('/admin/feedback')) return { category: 'Reviews', section: 'Inbox' }
  if (pathname.startsWith('/admin/analytics')) return { category: 'Insights', section: 'Analytics' }
  if (pathname.startsWith('/admin')) return { category: 'Management', section: 'Console' }
  if (pathname.startsWith('/teacher')) return { category: 'Faculty', section: 'Queue' }
  if (pathname.startsWith('/student/history')) return { category: 'Grievances', section: 'History' }
  if (pathname.startsWith('/student/feedback')) return { category: 'Grievances', section: 'Feedback' }
  if (pathname.startsWith('/student/profile')) return { category: 'Account', section: 'Settings' }
  if (pathname.startsWith('/student')) return { category: 'Portal', section: 'Dashboard' }
  if (pathname.startsWith('/about')) return { category: 'Help', section: 'Terms & Policies' }
  return { category: 'CampusResolve', section: 'Portal' }
}

const AppTopbar: React.FC = () => {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const location = useLocation()
  const { openMobile, toggleExpanded, isExpanded } = useSidebarStore()
  const { category, section } = getBreadcrumbTitle(location.pathname)

  const roleBadge = role === 'admin' ? 'Admin' : role === 'teacher' ? 'Faculty' : 'Student'

  return (
    <div className="sticky top-3.5 z-30 w-full px-4 sm:px-6 lg:px-8 mb-6 sm:mb-7">
      <header
        className="
          h-[58px] sm:h-[62px] w-full max-w-7xl mx-auto px-3.5 sm:px-5
          rounded-[22px] bg-white/85 dark:bg-[#0E1520]/85 backdrop-blur-2xl
          border border-[rgba(220,218,209,0.85)] dark:border-white/[0.08]
          shadow-[0_10px_35px_rgba(15,23,42,0.06),0_2px_8px_rgba(15,23,42,0.03)]
          dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)]
          flex items-center justify-between transition-all duration-300
        "
      >
        {/* ── Left: Sidebar Trigger & Sleek Breadcrumb ─────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Drawer Button */}
          <button
            onClick={openMobile}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            aria-label="Open sidebar menu"
            title="Open Menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={toggleExpanded}
            className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle sidebar expansion"
            title={isExpanded ? 'Collapse menu bar' : 'Expand menu bar'}
          >
            <PanelLeft className="w-4.5 h-4.5" />
          </button>

          {/* Clean Micro-Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 min-w-0 text-xs select-none" aria-label="Breadcrumb">
            <span className="font-semibold text-[var(--text-muted)] tracking-wide">
              {category}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-40 shrink-0" />
            <span className="font-bold text-[var(--text-primary)] tracking-tight truncate">
              {section}
            </span>
          </nav>
        </div>

        {/* ── Center: Spotlight Command Search Bar ─────────────────── */}
        <div className="flex items-center flex-1 max-w-[200px] sm:max-w-xs md:max-w-sm mx-2 sm:mx-4 justify-center">
          <ActionSearchBar />
        </div>

        {/* ── Right: Controls, Notifications & Profile Badge ───────── */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Live Node Pill (Hidden on mobile) */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SLA Live</span>
          </div>

          <ThemeToggle />
          <NotificationBell />

          <div className="w-[1px] h-5 bg-[var(--border-subtle)] hidden sm:block mx-0.5" />

          {/* User Profile Pill */}
          <Link
            to="/student/profile"
            className="flex items-center gap-2 py-1 px-1.5 sm:pl-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 border border-transparent hover:border-[var(--border-subtle)] cursor-pointer group"
            title="View Profile Settings"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[12.5px] font-bold text-[var(--text-primary)] leading-tight max-w-[110px] truncate group-hover:text-[var(--accent)] transition-colors">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <span className="text-[9.5px] font-bold text-[var(--text-muted)] leading-tight uppercase tracking-wider mt-0.5">
                {roleBadge}
              </span>
            </div>
            <UserAvatar
              src={user?.profilePicture || user?.profileImage}
              name={user?.name}
              size="sm"
              className="w-8 h-8 rounded-full ring-2 ring-black/5 dark:ring-white/15 group-hover:ring-[var(--accent)] transition-all"
            />
          </Link>
        </div>
      </header>
    </div>
  )
}

export default AppTopbar
