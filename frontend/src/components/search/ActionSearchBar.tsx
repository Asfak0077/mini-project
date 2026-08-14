import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  Search, LayoutDashboard, History, MessageSquare, User,
  FilePlus, Clock, CheckCircle2, Settings, ShieldCheck,
  Users, BarChart3, CornerDownLeft, ArrowDown, ArrowUp, X, Sparkles,
  QrCode, Moon, Sun, ArrowRight, Layers
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { DSStatusBadge } from '../ds/Display'

export interface SearchItem {
  id: string
  title: string
  description: string
  category?: string
  status?: string
  icon: React.ComponentType<{ className?: string }>
  type: 'action' | 'navigation' | 'complaint'
  action: () => void
  keywords?: string
}

export const ActionSearchBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const { isDarkMode, toggleTheme } = useThemeStore()

  // Detect OS for shortcut display
  const isMac = useMemo(() => typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0, [])
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K'

  // Global shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Fetch complaints from query cache for authenticated user
  const cachedComplaints = useMemo(() => {
    const studentId = user?.studentId || user?.email || ''
    const teacherId = user?.id || user?.email || ''
    
    let items: any[] = []
    if (role === 'student') {
      items = queryClient.getQueryData(['complaints', 'student', studentId]) || queryClient.getQueryData(['complaints']) || []
    } else if (role === 'teacher') {
      items = queryClient.getQueryData(['complaints', 'teacher', teacherId]) || queryClient.getQueryData(['complaints']) || []
    } else {
      items = queryClient.getQueryData(['complaints']) || []
    }
    return Array.isArray(items) ? items : []
  }, [queryClient, user, role, isOpen])

  // Build role-specific navigation actions
  const roleActions = useMemo<SearchItem[]>(() => {
    const commonActions: SearchItem[] = [
      {
        id: 'act-theme',
        title: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        description: 'Toggle interface visual theme',
        icon: isDarkMode ? Sun : Moon,
        type: 'action',
        action: () => toggleTheme(),
        keywords: 'theme dark light mode appearance style'
      },
      {
        id: 'act-profile',
        title: 'Profile & Settings',
        description: 'Manage credentials & preferences',
        icon: User,
        type: 'navigation',
        action: () => navigate('/student/profile'),
        keywords: 'profile settings account password credentials'
      }
    ]

    if (role === 'admin') {
      return [
        {
          id: 'act-admin-dash',
          title: 'Admin Dashboard',
          description: 'Control center & department metrics',
          icon: LayoutDashboard,
          type: 'navigation',
          action: () => navigate('/admin'),
          keywords: 'admin dashboard overview control'
        },
        {
          id: 'act-admin-teachers',
          title: 'Faculty Directory',
          description: 'Manage faculty assignments and routing',
          icon: Users,
          type: 'navigation',
          action: () => navigate('/admin/teachers'),
          keywords: 'teachers faculty professors directory'
        },
        {
          id: 'act-admin-feedback',
          title: 'Feedback Inbox',
          description: 'Review student evaluation submissions',
          icon: MessageSquare,
          type: 'navigation',
          action: () => navigate('/admin/feedback'),
          keywords: 'feedback student reviews ratings'
        },
        {
          id: 'act-admin-analytics',
          title: 'Service Analytics',
          description: 'SLA turnaround and satisfaction breakdown',
          icon: BarChart3,
          type: 'navigation',
          action: () => navigate('/admin/analytics'),
          keywords: 'analytics stats reports metrics'
        },
        ...commonActions
      ]
    }

    if (role === 'teacher') {
      return [
        {
          id: 'act-teacher-dash',
          title: 'Faculty Workspace',
          description: 'Assigned complaints & resolution queue',
          icon: LayoutDashboard,
          type: 'navigation',
          action: () => navigate('/teacher'),
          keywords: 'teacher faculty dashboard workspace'
        },
        ...commonActions
      ]
    }

    // Default: Student
    return [
      {
        id: 'act-student-dash',
        title: 'Student Dashboard',
        description: 'Overview, stats & recent activity',
        icon: LayoutDashboard,
        type: 'navigation',
        action: () => navigate('/student'),
        keywords: 'student dashboard overview home'
      },
      {
        id: 'act-submit-complaint',
        title: 'Submit Grievance',
        description: 'File a new campus resolution request',
        icon: FilePlus,
        type: 'action',
        action: () => {
          navigate('/student')
          setTimeout(() => {
            const btn = document.querySelector('[data-trigger-submit-modal]') as HTMLButtonElement
            if (btn) btn.click()
          }, 200)
        },
        keywords: 'submit complaint new grievance report file issue'
      },
      {
        id: 'act-history',
        title: 'Complaint History',
        description: 'View all submitted complaints and timeline',
        icon: History,
        type: 'navigation',
        action: () => navigate('/student/history'),
        keywords: 'history complaints status track'
      },
      {
        id: 'act-feedback',
        title: 'Resolution Feedback',
        description: 'Rate resolution quality and faculty service',
        icon: MessageSquare,
        type: 'navigation',
        action: () => navigate('/student/feedback'),
        keywords: 'feedback rate review satisfaction'
      },
      ...commonActions
    ]
  }, [role, isDarkMode, toggleTheme, navigate])

  // Map cached complaints to SearchItem
  const complaintItems = useMemo<SearchItem[]>(() => {
    return cachedComplaints.map((c: any) => ({
      id: `complaint-${c.id || c._id}`,
      title: c.title || c.category || 'Untitled Complaint',
      description: `${c.department || 'General'} · ID: ${(c.id || c._id || '').slice(0, 8)}`,
      category: c.category,
      status: c.status,
      icon: Clock,
      type: 'complaint',
      action: () => {
        if (role === 'student') navigate('/student/history')
        else if (role === 'teacher') navigate('/teacher')
        else navigate('/admin')
      },
      keywords: `${c.title} ${c.category} ${c.department} ${c.status} ${c.description || ''}`
    }))
  }, [cachedComplaints, role, navigate])

  // Filtered search results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return [...roleActions, ...complaintItems.slice(0, 4)]
    }

    const matchedActions = roleActions.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    )

    const matchedComplaints = complaintItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    )

    return [...matchedActions, ...matchedComplaints]
  }, [query, roleActions, complaintItems])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredResults[selectedIndex]) {
        handleSelectItem(filteredResults[selectedIndex])
      }
    }
  }

  const handleSelectItem = (item: SearchItem) => {
    item.action()
    setIsOpen(false)
  }

  return (
    <>
      {/* ── Topbar Search Trigger Pill ──────────────────────────── */}
      <div className="relative w-full max-w-[280px] sm:max-w-xs">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full h-10 pl-3.5 pr-2.5 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center justify-between shadow-[var(--shadow-sm)] cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
            <span className="text-xs font-semibold truncate text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
              Search complaints, actions...
            </span>
          </div>

          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] shadow-2xs shrink-0">
            {shortcutKey}
          </kbd>
        </button>
      </div>

      {/* ── Spotlight Command Palette Modal (Centered) ─────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-[12vh] sm:pt-[15vh]">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-xl rounded-[26px] bg-[var(--card)] border border-[var(--border)] shadow-2xl shadow-black/20 overflow-hidden relative z-10 flex flex-col max-h-[75vh]"
            >
              {/* Search Bar Header */}
              <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center gap-3 relative">
                <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0 ml-1" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search complaints..."
                  className="w-full bg-transparent text-sm sm:text-base font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />
                {query ? (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)]">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[var(--border-subtle)]">
                {filteredResults.length > 0 ? (
                  filteredResults.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    const Icon = item.icon

                    return (
                      <motion.div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between gap-3 p-3 rounded-[16px] cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[var(--surface-hover)] text-[var(--text-primary)] shadow-2xs'
                            : 'text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 border border-[var(--border)] transition-colors ${
                              isSelected
                                ? 'bg-[#111827] dark:bg-white text-white dark:text-[#111827]'
                                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-[13px] font-bold truncate leading-tight">
                              {item.title}
                            </p>
                            <p className="text-[11px] font-medium text-[var(--text-muted)] truncate leading-tight mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {item.status ? (
                          <DSStatusBadge status={item.status} />
                        ) : isSelected ? (
                          <div className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--text-muted)] shrink-0">
                            <span>Open</span>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </div>
                        ) : null}
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="py-12 px-6 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-2 border border-[var(--border)]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">No matching results found</p>
                    <p className="text-xs font-medium text-[var(--text-muted)] max-w-xs mx-auto">
                      Try searching by complaint ID, category, department name, or platform action.
                    </p>
                  </div>
                )}
              </div>

              {/* Spotlight Footer */}
              <div className="p-3 px-4 bg-[var(--surface-secondary)] border-t border-[var(--border)] flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[9px] font-mono shadow-2xs">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[9px] font-mono shadow-2xs">
                      ↓
                    </kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[9px] font-mono shadow-2xs">
                      ↵
                    </kbd>
                    <span>Select</span>
                  </span>
                </div>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[9px] font-mono shadow-2xs">
                    ESC
                  </kbd>
                  <span>Close</span>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ActionSearchBar
