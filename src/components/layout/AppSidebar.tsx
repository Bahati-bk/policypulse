'use client'

import { useAppStore, ViewType } from '@/lib/store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, GitCompare, Bell, UserCog, Tags, ScrollText, ShieldCheck, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  view: ViewType
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  section: 'main' | 'admin'
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, section: 'main' },
  { view: 'policies', label: 'Policies', icon: <BookOpen className="h-4 w-4" />, section: 'main' },
  { view: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" />, section: 'main' },
  { view: 'comparisons', label: 'Comparisons', icon: <GitCompare className="h-4 w-4" />, section: 'main' },
  { view: 'alerts', label: 'Alerts', icon: <Bell className="h-4 w-4" />, section: 'main' },
  { view: 'profile', label: 'Profile', icon: <UserCog className="h-4 w-4" />, section: 'main' },
  { view: 'categories', label: 'Categories', icon: <Tags className="h-4 w-4" />, adminOnly: true, section: 'admin' },
  { view: 'audit-log', label: 'Audit Log', icon: <ScrollText className="h-4 w-4" />, adminOnly: true, section: 'admin' },
]

function NavContent() {
  const { currentView, setView, user, setSidebarOpen } = useAppStore()
  const isAdmin = user?.role === 'ADMIN'
  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin)

  function handleNav(view: ViewType) {
    setView(view)
    setSidebarOpen(false)
  }

  const mainItems = filteredItems.filter(i => i.section === 'main')
  const adminItems = filteredItems.filter(i => i.section === 'admin')

  const initials = (user?.name || 'U').slice(0, 2).toUpperCase()

  return (
    <>
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-3">
          {/* Section label: MAIN */}
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Main</p>
          {mainItems.map(item => (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-left transition-all duration-150',
                currentView === item.view
                  ? 'border-l-2 border-primary bg-primary/5 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              aria-current={currentView === item.view ? 'page' : undefined}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {/* Section label: ADMIN */}
          {isAdmin && adminItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Admin</p>
              {adminItems.map(item => (
                <button
                  key={item.view}
                  onClick={() => handleNav(item.view)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-left transition-all duration-150',
                    currentView === item.view
                      ? 'border-l-2 border-primary bg-primary/5 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                  aria-current={currentView === item.view ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* User section at bottom */}
      <Separator />
      <div className="p-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{user?.role || 'USER'}</Badge>
        </div>
      </div>
    </>
  )
}

export function AppSidebar({ className }: { className?: string }) {
  const { user, sidebarOpen, setSidebarOpen } = useAppStore()

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
        <NavContent />
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
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
