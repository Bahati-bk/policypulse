import { create } from 'zustand'

type ViewType =
  | 'dashboard'
  | 'policies'
  | 'documents'
  | 'comparisons'
  | 'alerts'
  | 'notifications'
  | 'profile'
  | 'categories'
  | 'audit-log'
  | 'users'
  | 'auth'

interface AppState {
  currentView: ViewType
  user: {
    id: string
    email: string
    name: string | null
    role: string
  } | null
  sidebarOpen: boolean
  setView: (view: ViewType) => void
  setUser: (user: AppState['user']) => void
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  user: null,
  sidebarOpen: false,
  setView: (view) => set({ currentView: view }),
  setUser: (user) => set({ user }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

export type { ViewType }
