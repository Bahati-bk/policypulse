'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { safeArray } from '@/lib/safe-array'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, CheckCheck, ShieldAlert, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

export default function NotificationsView() {
  const user = useAppStore(s => s.user)
  const setView = useAppStore(s => s.setView)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: () => fetch('/api/notifications').then(r => r.json()),
    enabled: !!user,
  })

  const notifications = safeArray<Record<string, unknown>>(data?.notifications)
  const unreadCount = data?.unreadCount || 0

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
    onError: () => toast.error('Failed to mark all as read'),
  })

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">{unreadCount} new</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">Stay updated with policy changes and system activity</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            <CheckCheck className="mr-2 h-3.5 w-3.5" />Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <BellOff className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-muted-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Notifications will appear here when alerts are sent to you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} className="space-y-3">
          {notifications.map((notif) => {
            const alert = notif.alert as Record<string, unknown> | null
            const isUnread = (notif.status as string) === 'UNREAD'
            return (
              <motion.div key={notif.id as string} variants={item}>
                <Card
                  className={`transition-all cursor-pointer hover:shadow-sm ${isUnread ? 'border-l-4 border-l-primary bg-primary/[0.02]' : 'border-l-4 border-l-transparent opacity-70 hover:opacity-100'}`}
                  onClick={() => {
                    if (isUnread) markReadMutation.mutate(notif.id as string)
                    if (alert) setView('alerts')
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isUnread ? 'bg-primary/10' : 'bg-muted'}`}>
                        {isUnread ? <ShieldAlert className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>{alert?.title as string || 'Notification'}</p>
                          {isUnread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        {alert?.summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.summary as string}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(notif.createdAt as string), { addSuffix: true })}</span>
                          {alert?.severity && (
                            <Badge variant="outline" className="text-[9px]">{alert.severity as string}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
