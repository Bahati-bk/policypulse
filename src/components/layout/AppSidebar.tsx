'use client'

import { useAppStore, ViewType } from '@/lib/store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, GitCompare, Bell, UserCog, Tags, ScrollText, ShieldCheck, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  view: ViewType
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { view: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { view: 'comparisons', label: 'Comparisons', icon: <GitCompare className="h-4 w-4" /> },
  { view: 'alerts', label: 'Alerts', icon: <Bell className="h-4 w-4" /> },
  { view: 'profile', label: 'Profile', icon: <UserCog className="h-4 w-4" /> },
  { view: 'categories', label: 'Categories', icon: <Tags className="h-4 w-4" />, adminOnly: true },
  { view: 'audit-log', label: 'Audit Log', icon: <ScrollText className="h-4 w-4" />, adminOnly: true },
]

export function AppSidebar({ className }: { className?: string }) {
  const { currentView, setView, user, sidebarOpen, setSidebarOpen } = useAppStore()

  function handleNav(view: ViewType) {
    setView(view)
    setSidebarOpen(false)
  }

  const filteredItems = navItems.filter(item => !item.adminOnly || user?.role === 'ADMIN')

  if (!user) return null

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn('hidden lg:flex flex-col w-60 border-r border-border/50 bg-sidebar h-full', className)} role="navigation" aria-label="Main navigation">
        <div className="p-4 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">PolicyPulse</span>
        </div>
        <Separator />
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-3">
            {filteredItems.map(item => (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                  currentView === item.view
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
                aria-current={currentView === item.view ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full w-72 bg-sidebar border-r border-border/50 lg:hidden"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">PolicyPulse</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Separator />
              <ScrollArea className="flex-1 py-2">
                <nav className="space-y-1 px-3">
                  {filteredItems.map(item => (
                    <button
                      key={item.view}
                      onClick={() => handleNav(item.view)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                        currentView === item.view
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}