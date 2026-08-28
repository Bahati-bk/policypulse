'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Bell, LogOut, User, Menu, Moon, Sun, ShieldCheck, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'

export function AppHeader() {
  const { user, setView, setSidebarOpen } = useAppStore()
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()



  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then(r => r.json()),
    refetchInterval: 30000,
    enabled: !!user,
  })

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    useAppStore.getState().setUser(null)
    useAppStore.getState().setView('auth')
    queryClient.clear()
  }

  async function markNotifRead(notifId: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: notifId }),
    })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    toast.success('All notifications marked as read')
  }

  const unreadCount = notifData?.unreadCount || 0
  const notifications = notifData?.notifications || []

  if (!user) return null

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60" role="banner">
      <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 font-semibold shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden sm:inline text-base">PolicyPulse</span>
        </div>

        {/* Mini search bar - clickable, opens command palette */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
              className="hidden md:flex ml-4 items-center gap-2 h-8 px-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all text-sm text-muted-foreground flex-1 max-w-xs group cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left text-xs">Search policies, documents...</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-hover:text-foreground/70">
                Ctrl+K
              </kbd>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Search policies, documents, and more (Ctrl+K)
          </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative h-8 w-8 rounded-lg transition-transform duration-200 hover:scale-110 active:scale-95',
                  unreadCount > 0 && 'pulse-ring'
                )}
                aria-label={`Notifications, ${unreadCount} unread`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold px-1 animate-[pulse-ring_1.5s_ease-out_infinite]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline font-normal">
                    Mark all read
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="max-h-64">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((n: Record<string, unknown>) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        'flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors',
                        (n.status as string) === 'UNREAD' ? 'bg-primary/5' : ''
                      )}
                      onClick={() => {
                        markNotifRead(n.id as string)
                        setView('notifications')
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {(n.status as string) === 'UNREAD' && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <span className={cn(
                          'text-sm truncate',
                          (n.status as string) === 'UNREAD' ? 'font-medium' : 'font-normal text-muted-foreground'
                        )}>{n.title as string}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground pl-4">
                        {n.sentAt
                          ? formatDistanceToNow(new Date(n.sentAt as string), { addSuffix: true })
                          : n.createdAt ? formatDistanceToNow(new Date(n.createdAt as string), { addSuffix: true })
                          : ''}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
              <div className="border-t p-1.5">
                <button
                  onClick={() => { setView('notifications') }}
                  className="w-full text-center text-xs text-primary hover:underline py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                >
                  View All Notifications
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-8 rounded-lg hover:bg-accent/60">
                <div className="relative">
                  <Avatar className="h-7 w-7 ring-1 ring-border/50">
                    <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                      {(user.name || user.email)?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Role dot */}
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
                      user.role === 'ADMIN' ? 'bg-emerald-500' : 'bg-amber-500'
                    )}
                    title={user.role || 'USER'}
                  />
                </div>
                <span className="hidden md:inline text-sm max-w-[120px] truncate font-medium">{user.name || user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView('profile')} className="gap-2">
                <User className="h-4 w-4" /> Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2 focus:text-destructive">
                <LogOut className="h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Animated gradient line under header */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </header>
  )
}
