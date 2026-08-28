'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, CheckCircle2, XCircle, Send, AlertTriangle, Shield, Users, ClipboardList, Search, Download } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  SENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400',
}

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <Bell className="h-4 w-4 text-slate-400" />,
  PENDING_REVIEW: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  APPROVED: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  REJECTED: <XCircle className="h-4 w-4 text-red-500" />,
  SENT: <Send className="h-4 w-4 text-teal-500" />,
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function AlertsView() {
  const user = useAppStore(s => s.user)
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
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

  const filtered = alerts.filter((alert: Record<string, unknown>) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (alert.title as string)?.toLowerCase().includes(q) ||
      (alert.summary as string)?.toLowerCase().includes(q) ||
      (alert.whatChanged as string)?.toLowerCase().includes(q)
    )
  })

  function exportCSV() {
    const headers = ['Title', 'Status', 'Severity', 'Created', 'Summary', 'What Changed', 'Who Is Affected']
    const rows = filtered.map((a: Record<string, unknown>) => [
      `"${(a.title as string || '').replace(/"/g, '\"')}"`,
      a.status as string,
      a.severity as string || '',
      a.createdAt ? format(new Date(a.createdAt as string), 'yyyy-MM-dd') : '',
      `"${(a.summary as string || '').replace(/"/g, '\"')}"`,
      `"${(a.whatChanged as string || '').replace(/"/g, '\"')}"`,
      `"${(a.whoIsAffected as string || '').replace(/"/g, '\"')}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `policypulse-alerts-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Alerts exported to CSV')
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">Policy change alerts and notifications</p>
        </div>
        {filtered.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-3.5 w-3.5" />Export CSV
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts by title, summary, or changes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SENT'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
              onClick={() => setStatusFilter(s)}>
              {s ? s.replace('_', ' ') : 'All'}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No alerts found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || statusFilter ? 'Try adjusting your search or filter.' : 'Alerts will appear when policy changes are detected.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} className="space-y-4">
          {filtered.map((alert: Record<string, unknown>) => (
            <motion.div key={alert.id as string} variants={item}>
              <Card className="hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedAlert(alert)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors mt-0.5">
                        {statusIcons[(alert.status as string) || 'DRAFT'] || statusIcons.DRAFT}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{alert.title as string}</p>
                        {alert.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.summary as string}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={statusColors[(alert.status as string) || 'DRAFT']}>
                            {(alert.status as string).replace('_', ' ')}
                          </Badge>
                          {alert.severity && (
                            <Badge variant="outline" className={
                              (alert.severity as string) === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                              (alert.severity as string) === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }>
                              {alert.severity as string}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {alert.createdAt ? format(new Date(alert.createdAt as string), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => { if (!open) setSelectedAlert(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />{selectedAlert?.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusColors[(selectedAlert?.status as string) || 'DRAFT']}>
                {(selectedAlert?.status as string)?.replace('_', ' ')}
              </Badge>
              {selectedAlert?.severity && (
                <Badge variant="outline">{selectedAlert.severity as string} severity</Badge>
              )}
            </div>
          </DialogHeader>

          {selectedAlert && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {selectedAlert.summary && (
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
                    <p className="text-sm leading-relaxed">{selectedAlert.summary as string}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-amber-400">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-semibold">What Changed</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.whatChanged as string || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold">Who Is Affected</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.whoIsAffected as string || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-emerald-400">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-semibold">What To Do</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.whatToDo as string || 'N/A'}</p>
                    </CardContent>
                  </Card>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t">
                    {(selectedAlert.status as string) === 'PENDING_REVIEW' && (
                      <>
                        <Button onClick={() => approveMutation.mutate(selectedAlert.id as string)} disabled={approveMutation.isPending}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                        </Button>
                        <Button variant="outline" onClick={() => setRejectDialog(selectedAlert.id as string)}>
                          <XCircle className="mr-2 h-4 w-4" />Reject
                        </Button>
                      </>
                    )}
                    {(selectedAlert.status as string) === 'APPROVED' && (
                      <Button onClick={() => sendMutation.mutate(selectedAlert.id as string)} disabled={sendMutation.isPending}>
                        <Send className="mr-2 h-4 w-4" />{sendMutation.isPending ? 'Sending...' : 'Send Notifications'}
                      </Button>
                    )}
                  </div>
                )}

                {selectedAlert.rejectionReason && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
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