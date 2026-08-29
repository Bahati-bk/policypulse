import { create } from 'zustand'

type ViewType =
  | 'dashboard'
  | 'ai-insights'
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
  | 'settings'

interface AppState {
  currentView: ViewType
  user: {
    id: string
    email: string
    name: string | null
    role: string
  } | null
  sidebarOpen: boolean
  isCheckingSession: boolean
  setView: (view: ViewType) => void
  setUser: (user: AppState['user']) => void
  setSidebarOpen: (open: boolean) => void
  setCheckingSession: (checking: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  user: null,
  sidebarOpen: false,
  isCheckingSession: true,
  setView: (view) => set({ currentView: view }),
  setUser: (user) => set({ user, isCheckingSession: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCheckingSession: (checking) => set({ isCheckingSession: checking }),
}))

export type { ViewType }
