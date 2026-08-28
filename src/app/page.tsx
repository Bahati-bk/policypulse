'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore, ViewType } from '@/lib/store'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import AppFooter from '@/components/layout/AppFooter'
import AuthView from '@/components/auth/AuthView'
import DashboardView from '@/components/views/DashboardView'
import PoliciesView from '@/components/views/PoliciesView'
import DocumentsView from '@/components/views/DocumentsView'
import ComparisonsView from '@/components/views/ComparisonsView'
import AlertsView from '@/components/views/AlertsView'
import NotificationsView from '@/components/views/NotificationsView'
import ProfileView from '@/components/views/ProfileView'
import CategoriesView from '@/components/views/CategoriesView'
import AuditLogView from '@/components/views/AuditLogView'
import UsersView from '@/components/views/UsersView'
import SettingsView from '@/components/views/SettingsView'
import CommandPalette from '@/components/CommandPalette'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import GPrefixHint from '@/components/GPrefixHint'

function AppContent() {
  const currentView = useAppStore(s => s.currentView)
  const user = useAppStore(s => s.user)

  const views: Record<ViewType, React.ReactNode> = {
    auth: <AuthView />,
    dashboard: <DashboardView />,
    policies: <PoliciesView />,
    documents: <DocumentsView />,
    comparisons: <ComparisonsView />,
    alerts: <AlertsView />,
    notifications: <NotificationsView />,
    profile: <ProfileView />,
    categories: user?.role === 'ADMIN' ? <CategoriesView /> : <DashboardView />,
    'audit-log': user?.role === 'ADMIN' ? <AuditLogView /> : <DashboardView />,
    users: user?.role === 'ADMIN' ? <UsersView /> : <DashboardView />,
    settings: <SettingsView />,
  }

  return (
    <div className="p-4 lg:p-6" role="main">
      <AnimatePresence mode="wait">
        <motion.div
          key={user ? currentView : 'auth'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {user ? (views[currentView] || <DashboardView />) : <AuthView />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function Home() {
  const { gHintVisible, hints } = useKeyboardShortcuts()
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <AppContent />
              <CommandPalette />
              <KeyboardShortcutsHelp />
              <GPrefixHint visible={gHintVisible} hints={hints} />
            </div>
            <AppFooter />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  )
}
