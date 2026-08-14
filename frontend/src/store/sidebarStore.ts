import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isExpanded: boolean
  isMobileOpen: boolean
  toggleExpanded: () => void
  setExpanded: (expanded: boolean) => void
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isExpanded: false,
      isMobileOpen: false,
      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
      setExpanded: (isExpanded) => set({ isExpanded }),
      openMobile: () => set({ isMobileOpen: true }),
      closeMobile: () => set({ isMobileOpen: false }),
      toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
    }),
    {
      name: 'campusresolve-sidebar-state',
      partialize: (state) => ({ isExpanded: state.isExpanded }),
    }
  )
)
