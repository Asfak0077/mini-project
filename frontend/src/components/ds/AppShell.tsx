import React from 'react'
import AppSidebar from './AppSidebar'
import AppTopbar from './AppTopbar'
import AmbientBackground from '../shared/AmbientBackground'
import { NotificationProvider } from '../../contexts/NotificationContext'
import { useSidebarStore } from '../../store/sidebarStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

interface AppShellProps {
  children: React.ReactNode
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const isExpanded = useSidebarStore((s) => s.isExpanded)
  const location = useLocation()

  return (
    <NotificationProvider>
      <div className="relative min-h-screen bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200 antialiased selection:bg-emerald-500/20">
        {/* Layered Animated Ambient Background */}
        <AmbientBackground />

        {/* Responsive Sliding Sidebar Navigation */}
        <AppSidebar />

        {/* Main Content Canvas with dynamic padding for sidebar offset on Desktop */}
        <div
          className={`
            flex flex-col min-h-screen min-w-0 transition-[padding-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isExpanded ? 'lg:pl-[272px]' : 'lg:pl-[104px]'}
          `}
        >
          {/* Topbar Header */}
          <AppTopbar />

          {/* Page Content Container */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </NotificationProvider>
  )
}

export default AppShell
