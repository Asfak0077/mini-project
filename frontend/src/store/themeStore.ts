import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  isDarkMode: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

/** Apply theme attributes to <html> and <body> seamlessly */
function applyThemeToDom(isDark: boolean) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  const body = document.body

  if (isDark) {
    html.classList.add('dark')
    html.classList.remove('light')
    html.setAttribute('data-theme', 'dark')
    body.classList.add('dark-theme')
    body.classList.remove('light-theme')
  } else {
    html.classList.remove('dark')
    html.classList.add('light')
    html.setAttribute('data-theme', 'light')
    body.classList.remove('dark-theme')
    body.classList.add('light-theme')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,

      toggleTheme: () => {
        const nextDark = !get().isDarkMode
        applyThemeToDom(nextDark)
        set({ isDarkMode: nextDark })
      },

      setTheme: (isDark: boolean) => {
        applyThemeToDom(isDark)
        set({ isDarkMode: isDark })
      },
    }),
    {
      name: 'sdcfrs-theme',
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDom(state.isDarkMode)
        } else if (typeof window !== 'undefined' && window.matchMedia) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          applyThemeToDom(prefersDark)
        }
      },
    }
  )
)

export type Point = { x: number; y: number }

