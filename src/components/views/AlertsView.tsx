'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, CheckCircle2, XCircle, Send, AlertTriangle, Eye, Shield, Users, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  SENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400',
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function AlertsView() {
  const user = useAppStore(s => s.user)
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<Record<string, unknown> | null>(null)
  const [rejectDialog, setRejectDialog] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () => fetch(`/api/alerts${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.json()),
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert approved')
      setSelectedAlert(null)
    },
    onError: () => toast.error('Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/alerts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert rejected')
      setRejectDialog(null)
      setSelectedAlert(null)
    },
    onError: () => toast.error('Failed to reject'),
  })

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}/send`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success(`Notifications sent to ${data.sentTo} users`)
      setSelectedAlert(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const isAdmin = user?.role === 'ADMIN'
  const filtered = statusFilter ? alerts : alerts

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground text-sm">Policy change alerts and notifications</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SENT'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No alerts found.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} className="space-y-4">
          {filtered.map((alert: Record<string, unknown>) => (
            <motion.div key={alert.id as string} variants={item}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAlert(alert)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                        (alert.status as string) === 'APPROVED' || (alert.status as string) === 'SENT' ? 'text-emerald-500' :
                        (alert.status as string) === 'REJECTED' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{alert.title as string}</p>
                        {alert.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.summary as string}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[(alert.status as string) || 'DRAFT']}>
                      {(alert.status as string).replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {alert.createdAt ? format(new Date(alert.createdAt as string), 'MMM d, yyyy') : ''}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />{selectedAlert?.title}
            </DialogTitle>
            <Badge variant="outline" className={statusColors[(selectedAlert?.status as string) || 'DRAFT']}>
              {(selectedAlert?.status as string)?.replace('_', ' ')}
            </Badge>
          </DialogHeader>

          {selectedAlert && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {selectedAlert.summary && (
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm">{selectedAlert.summary as string}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-medium">What Changed</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedAlert.whatChanged as string || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-primary" />
                        <p className="text-xs font-medium">Who Is Affected</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedAlert.whoIsAffected as string || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-medium">What To Do</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedAlert.whatToDo as string || 'N/A'}</p>
                    </CardContent>
                  </Card>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t">
                    {(selectedAlert.status as string) === 'PENDING_REVIEW' && (
                      <Button onClick={() => approveMutation.mutate(selectedAlert.id as string)} disabled={approveMutation.isPending}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                      </Button>
                    )}
                    {(selectedAlert.status as string) === 'PENDING_REVIEW' && (
                      <Button variant="outline" onClick={() => setRejectDialog(selectedAlert.id as string)}>
                        <XCircle className="mr-2 h-4 w-4" />Reject
                      </Button>
                    )}
                    {(selectedAlert.status as string) === 'APPROVED' && (
                      <Button onClick={() => sendMutation.mutate(selectedAlert.id as string)} disabled={sendMutation.isPending}>
                        <Send className="mr-2 h-4 w-4" />{sendMutation.isPending ? 'Sending...' : 'Send Notifications'}
                      </Button>
                    )}
                  </div>
                )}

                {selectedAlert.rejectionReason && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">Rejection Reason</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedAlert.rejectionReason as string}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Alert</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <Button
            variant="destructive"
            onClick={() => rejectMutation.mutate({ id: rejectDialog!, reason: rejectReason })}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}