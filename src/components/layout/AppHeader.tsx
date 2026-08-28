'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Bell, LogOut, User, Menu, Moon, Sun, ShieldCheck } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

export function AppHeader() {
  const { user, setView, setSidebarOpen } = useAppStore()
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) {
      fetch('/api/auth/me').then(r => r.json()).then(data => {
        if (data.id) {
          useAppStore.getState().setUser(data)
        } else {
          useAppStore.getState().setView('auth')
        }
      }).catch(() => {
        useAppStore.getState().setView('auth')
      })
    }
  }, [])

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
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md" role="banner">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">PolicyPulse</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unreadCount} unread`}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="max-h-64">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                ) : (
                  notifications.map((n: Record<string, unknown>) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      onClick={() => {
                        markNotifRead(n.id as string)
                        setView('notifications')
                      }}
                    >
                      <span className="font-medium text-sm">{n.title as string}</span>
                      <span className="text-xs text-muted-foreground">
                        {n.sentAt
                          ? formatDistanceToNow(new Date(n.sentAt as string), { addSuffix: true })
                          : n.createdAt ? formatDistanceToNow(new Date(n.createdAt as string), { addSuffix: true })
                          : ''}
                      </span>
                      {(n.status as string) === 'UNREAD' && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
              <div className="border-t p-2">
                <button
                  onClick={() => { setView('notifications') }}
                  className="w-full text-center text-xs text-primary hover:underline py-1"
                >
                  View All Notifications
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(user.name || user.email)?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm max-w-[120px] truncate">{user.name || user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.name || user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView('profile')}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}