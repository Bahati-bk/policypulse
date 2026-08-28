'use client'

import { useAppStore, ViewType } from '@/lib/store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, GitCompare, Bell, UserCog, Tags, ScrollText, ShieldCheck, X, Inbox, Users, Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'

interface NavItem {
  view: ViewType
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  badge?: string
  section: 'main' | 'admin'
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, section: 'main' },
  { view: 'policies', label: 'Policies', icon: <BookOpen className="h-4 w-4" />, section: 'main' },
  { view: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" />, section: 'main' },
  { view: 'comparisons', label: 'Comparisons', icon: <GitCompare className="h-4 w-4" />, section: 'main' },
  { view: 'alerts', label: 'Alerts', icon: <Bell className="h-4 w-4" />, section: 'main' },
  { view: 'notifications', label: 'Notifications', icon: <Inbox className="h-4 w-4" />, section: 'main', badge: 'unread' },
  { view: 'profile', label: 'Profile', icon: <UserCog className="h-4 w-4" />, section: 'main' },
  { view: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, adminOnly: true, section: 'admin' },
  { view: 'categories', label: 'Categories', icon: <Tags className="h-4 w-4" />, adminOnly: true, section: 'admin' },
  { view: 'audit-log', label: 'Audit Log', icon: <ScrollText className="h-4 w-4" />, adminOnly: true, section: 'admin' },
]

function NavContent() {
  const { currentView, setView, user, setSidebarOpen } = useAppStore()
  const isAdmin = user?.role === 'ADMIN'

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then(r => r.json()),
    refetchInterval: 30000,
    enabled: !!user,
  })
  const unreadCount = notifData?.unreadCount || 0

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
      <ScrollArea className="flex-1 py-1">
        <nav className="space-y-0.5 px-3">
          <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Menu</p>
          {mainItems.map(item => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-left transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={cn('transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/70')}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge === 'unread' && unreadCount > 0 && (
                  <span className="ml-auto h-5 min-w-5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5 shadow-sm shadow-primary/25">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )
          })}

          {isAdmin && adminItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Administration</p>
              {adminItems.map(item => {
                const isActive = currentView === item.view
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNav(item.view)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-left transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className={cn('transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/70')}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                  </button>
                )
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* User section at bottom */}
      <div className="border-t border-border/40">
        <div className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm shadow-primary/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{user?.name || 'User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-semibold">{user?.role || 'USER'}</Badge>
            </div>
          </div>
        </div>
        {/* Shortcuts hint */}
        <button
          onClick={() => window.dispatchEvent(new Event('open-keyboard-shortcuts-help'))}
          className="mx-3 mb-2 w-[calc(100%-24px)] flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          <Keyboard className="h-3 w-3" />
          <span>Keyboard shortcuts</span>
          <kbd className="ml-auto text-[9px] rounded border bg-muted/50 px-1 font-mono">?</kbd>
        </button>
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
      <aside className={cn('hidden lg:flex flex-col w-60 border-r border-border/40 bg-sidebar/80 backdrop-blur-sm h-full', className)} role="navigation" aria-label="Main navigation">
        <div className="p-4 pb-3 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/25">
            <ShieldCheck className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight">PolicyPulse</span>
            <p className="text-[10px] text-muted-foreground leading-none -mt-0.5">Policy Intelligence</p>
          </div>
        </div>
        <Separator className="opacity-60" />
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
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 z-50 h-full w-72 bg-sidebar border-r border-border/40 shadow-2xl lg:hidden"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/25">
                    <ShieldCheck className="h-4.5 w-4.5 text-primary-foreground" />
                  </div>
                  <div>
                    <span className="font-bold text-base tracking-tight">PolicyPulse</span>
                    <p className="text-[10px] text-muted-foreground leading-none -mt-0.5">Policy Intelligence</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Separator className="opacity-60" />
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
