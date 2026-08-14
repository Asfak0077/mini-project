import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full bg-white dark:bg-[#101722] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all shadow-[var(--shadow-sm)] flex items-center justify-center cursor-pointer active:scale-95"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Light mode' : 'Dark mode'}
    >
      {isDarkMode ? (
        <Sun className="w-4.5 h-4.5 text-amber-400" />
      ) : (
        <Moon className="w-4.5 h-4.5 text-slate-700" />
      )}
    </button>
  )
}

export default ThemeToggle
