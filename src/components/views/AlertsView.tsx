'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { safeArray } from '@/lib/safe-array'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell, CheckCircle2, XCircle, Send, AlertTriangle, Shield, Users,
  ClipboardList, Search, Download, Plus, FileText, Zap, Phone, MessageSquare,
  UserPlus, X, Check, Loader2, Contact, Smartphone,
} from 'lucide-react'
import { format } from 'date-fns'

// ── Constants ────────────────────────────────────────────────────────

const severityColors: Record<string, string> = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-amber-400',
  HIGH: 'bg-red-500',
  CRITICAL: 'bg-rose-500',
}

const severityBorder: Record<string, string> = {
  LOW: 'border-l-slate-400',
  MEDIUM: 'border-l-amber-400',
  HIGH: 'border-l-red-500',
  CRITICAL: 'border-l-rose-500',
}

const severityBadge: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
}

const changeTypeBadge: Record<string, string> = {
  NEW_POLICY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  AMENDMENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400',
  REPEAL: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  REVISION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  RESTRUCTURING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CLARIFICATION: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400',
}

const changeTypeLabel: Record<string, string> = {
  NEW_POLICY: 'New Policy',
  AMENDMENT: 'Amendment',
  REPEAL: 'Repeal',
  REVISION: 'Revision',
  RESTRUCTURING: 'Restructuring',
  CLARIFICATION: 'Clarification',
}

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

const severityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const changeTypeOptions = ['NEW_POLICY', 'AMENDMENT', 'REPEAL', 'REVISION', 'RESTRUCTURING', 'CLARIFICATION'] as const
const statusFilterOptions = ['', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SENT'] as const
const labelOptions = ['General', 'Stakeholder', 'Official', 'Media']

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ── Types ────────────────────────────────────────────────────────────

interface Alert {
  id: string
  title: string
  summary: string | null
  severity: string
  changeType: string
  whatChanged: string | null
  whoIsAffected: string | null
  whatToDo: string | null
  status: string
  createdAt: string
  rejectionReason: string | null
  [key: string]: unknown
}

interface PhoneContact {
  id: string
  name: string | null
  phoneNumber: string
  label: string
  active: boolean
  createdAt: string
}

interface FormData {
  title: string
  summary: string
  severity: string
  changeType: string
  whatChanged: string
  whoIsAffected: string
  whatToDo: string
}

const emptyForm: FormData = {
  title: '',
  summary: '',
  severity: 'MEDIUM',
  changeType: 'CLARIFICATION',
  whatChanged: '',
  whoIsAffected: '',
  whatToDo: '',
}

// ── Component ────────────────────────────────────────────────────────

export default function AlertsView() {
  const user = useAppStore(s => s.user)
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [rejectDialog, setRejectDialog] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [ussdDialog, setUssdDialog] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)

  // USSD send state - selected contacts + manual numbers
  const [ussdSelectedContacts, setUssdSelectedContacts] = useState<Set<string>>(new Set())
  const [ussdManualPhone, setUssdManualPhone] = useState('')
  const [ussdManualName, setUssdManualName] = useState('')

  // Contacts management dialog
  const [contactsDialog, setContactsDialog] = useState(false)
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [newContactLabel, setNewContactLabel] = useState('General')

  // ── Queries ──────────────────────────────────────────────────────

  const { data: alertsData, isLoading } = useQuery<Alert[]>({
    queryKey: ['alerts', statusFilter],
    queryFn: () => fetch(`/api/alerts${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.json()),
    enabled: !!user,
  })
  const alerts = safeArray<Alert>(alertsData)

  const { data: contactsData } = useQuery<PhoneContact[]>({
    queryKey: ['contacts'],
    queryFn: () => fetch('/api/contacts').then(r => r.json()),
    enabled: !!user,
  })
  const contacts = safeArray<PhoneContact>(contactsData)

  // ── Counts for filter badges ─────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { '': alerts.length }
    for (const a of alerts) {
      counts[a.status] = (counts[a.status] || 0) + 1
    }
    return counts
  }, [alerts])

  // ── Mutations ────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create alert') }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success(`Alert created successfully${data._smsQueued ? ' — SMS queued to contacts' : ''}`)
      setCreateOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => toast.error(e.message),
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success(`Alert approved${data._smsQueued ? ' — SMS queued to contacts' : ''}`)
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

  const ussdMutation = useMutation({
    mutationFn: async ({ alertId, phoneNumbers, message }: { alertId: string; phoneNumbers: string[]; message: string }) => {
      const res = await fetch('/api/ussd/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers, message, alertId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to send USSD') }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`USSD alert queued to ${data.messageCount} recipient(s) via *384*17818#`)
      setUssdDialog(null)
      setUssdSelectedContacts(new Set())
      setUssdManualPhone('')
      setUssdManualName('')
    },
    onError: (e) => toast.error(e.message),
  })

  // Contact management mutations
  const addContactMutation = useMutation({
    mutationFn: async ({ phoneNumber, name, label }: { phoneNumber: string; name?: string; label?: string }) => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, name, label }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to add contact') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setNewContactPhone('')
      setNewContactName('')
      setNewContactLabel('General')
      toast.success('Contact saved')
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact removed')
    },
    onError: () => toast.error('Failed to remove contact'),
  })

  // Quick add from USSD dialog
  const quickAddContactMutation = useMutation({
    mutationFn: async ({ phoneNumber, name }: { phoneNumber: string; name?: string }) => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, name }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      // Auto-select the newly added contact
      setUssdSelectedContacts(prev => new Set([...prev, data.id]))
      setUssdManualPhone('')
      setUssdManualName('')
      toast.success('Contact saved & selected')
    },
    onError: (e) => toast.error(e.message),
  })

  // ── Helpers ──────────────────────────────────────────────────────

  const isAdmin = user?.role === 'ADMIN'

  function handleUssdSend() {
    if (!selectedAlert) return

    // Collect phone numbers from selected contacts
    const phoneNumbers: string[] = []
    for (const contact of contacts) {
      if (ussdSelectedContacts.has(contact.id)) {
        phoneNumbers.push(contact.phoneNumber)
      }
    }

    // Add manual phone if entered
    if (ussdManualPhone.trim()) {
      const manualPhones = ussdManualPhone
        .split(/[,\n;]+/)
        .map(p => p.trim())
        .filter(p => p.length > 0)
      phoneNumbers.push(...manualPhones)
    }

    if (phoneNumbers.length === 0) {
      toast.error('Select at least one contact or enter a phone number')
      return
    }

    const message = `[PolicyPulse] ${selectedAlert.title}
${selectedAlert.summary || ''}
Severity: ${selectedAlert.severity}`.trim()
    ussdMutation.mutate({ alertId: selectedAlert.id, phoneNumbers, message })
  }

  function toggleContact(contactId: string) {
    setUssdSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(contactId)) {
        next.delete(contactId)
      } else {
        next.add(contactId)
      }
      return next
    })
  }

  function selectAllContacts() {
    if (ussdSelectedContacts.size === contacts.length) {
      setUssdSelectedContacts(new Set())
    } else {
      setUssdSelectedContacts(new Set(contacts.map(c => c.id)))
    }
  }

  const filtered = alerts.filter((alert) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      alert.title?.toLowerCase().includes(q) ||
      alert.summary?.toLowerCase().includes(q) ||
      alert.whatChanged?.toLowerCase().includes(q)
    )
  })

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || form.summary.trim().length < 10) return
    createMutation.mutate(form)
  }

  function exportCSV() {
    const headers = ['Title', 'Status', 'Severity', 'Change Type', 'Created', 'Summary', 'What Changed', 'Who Is Affected']
    const rows = filtered.map(a => [
      `"${(a.title || '').replace(/"/g, '\"')}"`,
      a.status,
      a.severity || '',
      a.changeType || '',
      a.createdAt ? format(new Date(a.createdAt), 'yyyy-MM-dd') : '',
      `"${(a.summary || '').replace(/"/g, '\"')}"`,
      `"${(a.whatChanged || '').replace(/"/g, '\"')}"`,
      `"${(a.whoIsAffected || '').replace(/"/g, '\"')}"`,
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

  // ── Render ───────────────────────────────────────────────────────

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">Policy change alerts and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-2 h-3.5 w-3.5" />Export CSV
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setContactsDialog(true)} className="gap-2">
            <Contact className="h-3.5 w-3.5" />
            Contacts
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{contacts.length}</Badge>
            )}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />Create Alert
          </Button>
        </div>
      </div>

      {/* ── Auto-SMS info banner ── */}
      {contacts.length > 0 && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 flex items-center gap-3">
          <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Auto-SMS active: {contacts.length} contact{contacts.length !== 1 ? 's' : ''} will receive SMS alerts when new alerts are created, approved, documents uploaded, or comparisons made.
          </p>
        </div>
      )}

      {/* ── Filters ── */}
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
          {statusFilterOptions.map(s => {
            const count = statusCounts[s] || 0
            return (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="gap-1.5"
              >
                {s ? s.replace(/_/g, ' ') : 'All'}
                {count > 0 && (
                  <span className={
                    statusFilter === s
                      ? 'bg-background/20 text-current text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center'
                      : 'bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center'
                  }>
                    {count}
                  </span>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* ── Alert List ── */}
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 px-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-muted-foreground text-lg">No alerts found</p>
            <p className="text-sm text-muted-foreground/70 mt-2 max-w-md mx-auto">
              {search || statusFilter
                ? 'Try adjusting your search or filter to find what you\'re looking for.'
                : 'Alerts will appear here when policy changes are detected or manually created. Get started by creating your first alert.'}
            </p>
            {!search && !statusFilter && (
              <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" />Create Alert
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} className="space-y-3">
          {filtered.map((alert) => (
            <motion.div key={alert.id} variants={item}>
              <Card
                className={`hover:shadow-md transition-all cursor-pointer group border-l-4 ${severityBorder[alert.severity] || 'border-l-slate-300'}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative shrink-0 mt-1">
                        <div className={`h-2.5 w-2.5 rounded-full ${severityColors[alert.severity] || 'bg-slate-400'}`} />
                        {alert.severity === 'CRITICAL' && (
                          <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{alert.title}</p>
                        {alert.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.summary}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className={statusColors[alert.status] || ''}>
                            {alert.status.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline" className={severityBadge[alert.severity] || ''}>
                            {alert.severity}
                          </Badge>
                          {alert.changeType && (
                            <Badge variant="outline" className={changeTypeBadge[alert.changeType] || ''}>
                              {changeTypeLabel[alert.changeType] || alert.changeType.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {alert.createdAt ? format(new Date(alert.createdAt), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Create Alert Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); resetForm() } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Create New Alert
            </DialogTitle>
            <DialogDescription>
              Fill in the details to create a new policy change alert. SMS will be sent to your {contacts.length} saved contact{contacts.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-5 pb-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="alert-title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="alert-title"
                    placeholder="e.g. NEW: Digital Service Tax Amendment"
                    value={form.title}
                    onChange={e => updateField('title', e.target.value)}
                    required
                  />
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-summary">Summary <span className="text-red-500">*</span></Label>
                    <span className={`text-xs ${form.summary.length >= 10 ? 'text-muted-foreground' : 'text-amber-500'}`}>
                      {form.summary.length}/10 min characters
                    </span>
                  </div>
                  <Textarea
                    id="alert-summary"
                    placeholder="Brief summary of the policy change..."
                    value={form.summary}
                    onChange={e => updateField('summary', e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                {/* Severity + Change Type row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={v => updateField('severity', v)}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${severityColors[form.severity]}`} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {severityOptions.map(s => (
                          <SelectItem key={s} value={s}>
                            <span className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${severityColors[s]}`} />
                              {s.charAt(0) + s.slice(1).toLowerCase()}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Change Type</Label>
                    <Select value={form.changeType} onValueChange={v => updateField('changeType', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {changeTypeOptions.map(ct => (
                          <SelectItem key={ct} value={ct}>
                            <span className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-sm ${changeTypeBadge[ct].split(' ')[0]}`} />
                              {changeTypeLabel[ct]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* What Changed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-what-changed" className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      What Changed
                    </Label>
                    <span className="text-xs text-muted-foreground">{form.whatChanged.length} chars</span>
                  </div>
                  <Textarea
                    id="alert-what-changed"
                    placeholder="Describe the specific changes..."
                    value={form.whatChanged}
                    onChange={e => updateField('whatChanged', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Who Is Affected */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-who" className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Who Is Affected
                    </Label>
                    <span className="text-xs text-muted-foreground">{form.whoIsAffected.length} chars</span>
                  </div>
                  <Textarea
                    id="alert-who"
                    placeholder="Describe affected groups..."
                    value={form.whoIsAffected}
                    onChange={e => updateField('whoIsAffected', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* What To Do */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-actions" className="flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
                      What To Do
                    </Label>
                    <span className="text-xs text-muted-foreground">{form.whatToDo.length} chars</span>
                  </div>
                  <Textarea
                    id="alert-actions"
                    placeholder="Recommended actions..."
                    value={form.whatToDo}
                    onChange={e => updateField('whatToDo', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* ── Preview ── */}
                {(form.title || form.summary) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        Alert Preview
                      </Label>
                      <Card className={`border-l-4 ${severityBorder[form.severity]}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0 mt-1">
                              <div className={`h-2.5 w-2.5 rounded-full ${severityColors[form.severity]}`} />
                              {form.severity === 'CRITICAL' && (
                                <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">
                                {form.title || 'Untitled Alert'}
                              </p>
                              {form.summary && (
                                <p className="text-xs text-muted-foreground mt-1">{form.summary}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className={statusColors['DRAFT']}>
                                  Draft
                                </Badge>
                                <Badge variant="outline" className={severityBadge[form.severity]}>
                                  {form.severity}
                                </Badge>
                                <Badge variant="outline" className={changeTypeBadge[form.changeType]}>
                                  {changeTypeLabel[form.changeType]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {(form.whatChanged || form.whoIsAffected || form.whatToDo) && (
                            <div className="grid sm:grid-cols-3 gap-3 mt-3">
                              {form.whatChanged && (
                                <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">What Changed</p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-3">{form.whatChanged}</p>
                                </div>
                              )}
                              {form.whoIsAffected && (
                                <div className="rounded-md border border-border/50 bg-muted/30 p-2.5">
                                  <p className="text-[11px] font-semibold mb-1">Who Is Affected</p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-3">{form.whoIsAffected}</p>
                                </div>
                              )}
                              {form.whatToDo && (
                                <div className="rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">What To Do</p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-3">{form.whatToDo}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <Separator />
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCreateOpen(false); resetForm() }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !form.title.trim() || form.summary.trim().length < 10}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Alert Detail Dialog ── */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => { if (!open) setSelectedAlert(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />{selectedAlert?.title}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {selectedAlert?.createdAt ? format(new Date(selectedAlert.createdAt), 'MMM d, yyyy h:mm a') : ''}
              </span>
              <Badge variant="outline" className={statusColors[selectedAlert?.status || 'DRAFT']}>
                {(selectedAlert?.status || '').replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline" className={severityBadge[selectedAlert?.severity || 'MEDIUM']}>
                {selectedAlert?.severity} severity
              </Badge>
              {selectedAlert?.changeType && (
                <Badge variant="outline" className={changeTypeBadge[selectedAlert.changeType]}>
                  {changeTypeLabel[selectedAlert.changeType] || selectedAlert.changeType.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedAlert && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {selectedAlert.summary && (
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
                    <p className="text-sm leading-relaxed">{selectedAlert.summary}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-amber-400">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-semibold">What Changed</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.whatChanged || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold">Who Is Affected</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.whoIsAffected || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-emerald-400">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-semibold">What To Do</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.whatToDo || 'N/A'}</p>
                    </CardContent>
                  </Card>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t flex-wrap">
                    {selectedAlert.status === 'PENDING_REVIEW' && (
                      <>
                        <Button onClick={() => approveMutation.mutate(selectedAlert.id)} disabled={approveMutation.isPending}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                        </Button>
                        <Button variant="outline" onClick={() => setRejectDialog(selectedAlert.id)}>
                          <XCircle className="mr-2 h-4 w-4" />Reject
                        </Button>
                      </>
                    )}
                    {selectedAlert.status === 'APPROVED' && (
                      <Button onClick={() => sendMutation.mutate(selectedAlert.id)} disabled={sendMutation.isPending}>
                        <Send className="mr-2 h-4 w-4" />{sendMutation.isPending ? 'Sending...' : 'Send Notifications'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => { setUssdDialog(selectedAlert.id); setUssdSelectedContacts(new Set(contacts.map(c => c.id))) }}
                      className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Phone className="h-4 w-4" />
                      Send via USSD
                    </Button>
                  </div>
                )}

                {/* Non-admin users can also send USSD */}
                {!isAdmin && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => { setUssdDialog(selectedAlert.id); setUssdSelectedContacts(new Set(contacts.map(c => c.id))) }}
                      className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 w-full sm:w-auto"
                    >
                      <Phone className="h-4 w-4" />
                      Send via USSD (*384*17818#)
                    </Button>
                  </div>
                )}

                {selectedAlert.rejectionReason && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">Rejection Reason</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedAlert.rejectionReason}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ── USSD Send Dialog ── */}
      <Dialog open={!!ussdDialog} onOpenChange={(open) => { if (!open) { setUssdDialog(null); setUssdSelectedContacts(new Set()); setUssdManualPhone(''); setUssdManualName('') } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-500" />
              Send Alert via USSD
            </DialogTitle>
            <DialogDescription>
              Send this alert via <span className="font-mono font-semibold text-foreground">*384*17818#</span> to phone numbers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Alert preview */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Alert Preview</p>
              </div>
              <p className="text-xs font-medium">{selectedAlert?.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{selectedAlert?.summary || 'No summary'}</p>
            </div>

            {/* Saved contacts */}
            {contacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Contact className="h-3.5 w-3.5" />
                    Saved Contacts
                  </Label>
                  <button
                    type="button"
                    onClick={selectAllContacts}
                    className="text-xs text-primary hover:underline"
                  >
                    {ussdSelectedContacts.size === contacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                  {contacts.map(contact => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleContact(contact.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                        ussdSelectedContacts.has(contact.id)
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {contact.name || contact.phoneNumber.slice(-4)}
                      <span className="text-[10px] opacity-60">{contact.phoneNumber}</span>
                      {ussdSelectedContacts.has(contact.id) && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
                {ussdSelectedContacts.size > 0 && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {ussdSelectedContacts.size} contact{ussdSelectedContacts.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            <Separator />\n
            {/* Manual phone entry */}
            <div className="space-y-2">
              <Label htmlFor="ussd-manual-phone" className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Add Numbers Manually
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ussd-manual-phone"
                  placeholder="256700000000"
                  value={ussdManualPhone}
                  onChange={e => setUssdManualPhone(e.target.value)}
                  className="font-mono text-sm"
                />
                <Input
                  placeholder="Name (optional)"
                  value={ussdManualName}
                  onChange={e => setUssdManualName(e.target.value)}
                  className="w-32 text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    if (ussdManualPhone.trim().length >= 10) {
                      quickAddContactMutation.mutate({
                        phoneNumber: ussdManualPhone.trim(),
                        name: ussdManualName.trim() || undefined,
                      })
                    } else {
                      toast.error('Enter a valid phone number')
                    }
                  }}
                  disabled={quickAddContactMutation.isPending || !ussdManualPhone.trim()}
                  title="Save as contact & select"
                >
                  {quickAddContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter a Uganda number (256..., +256..., or 07...). Click + to save as contact.
              </p>
            </div>

            {/* Recipient summary */}
            {(ussdSelectedContacts.size > 0 || ussdManualPhone.trim()) && (
              <div className="rounded-lg bg-muted/50 border p-2.5">
                <p className="text-[11px] font-semibold mb-1">Recipients</p>
                <p className="text-xs text-muted-foreground">
                  {ussdSelectedContacts.size} saved contact{ussdSelectedContacts.size !== 1 ? 's' : ''}
                  {ussdManualPhone.trim() ? ` + manual entry` : ''}
                  = {ussdSelectedContacts.size + (ussdManualPhone.trim() ? 1 : 0)} total
                </p>
              </div>
            )}
          </div>

          <Separator />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => { setUssdDialog(null); setUssdSelectedContacts(new Set()); setUssdManualPhone(''); setUssdManualName('') }}>Cancel</Button>
            <Button
              onClick={handleUssdSend}
              disabled={ussdMutation.isPending || (ussdSelectedContacts.size === 0 && !ussdManualPhone.trim())}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {ussdMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Phone className="mr-2 h-4 w-4" />Send USSD Alert</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Contacts Management Dialog ── */}
      <Dialog open={contactsDialog} onOpenChange={setContactsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Contact className="h-5 w-5 text-primary" />
              Phone Contacts
            </DialogTitle>
            <DialogDescription>
              Manage your alert recipients. New alerts, approvals, document uploads, and comparisons will auto-send SMS to these contacts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new contact */}
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-semibold">Add New Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="256700000000"
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  className="font-mono text-sm sm:col-span-1"
                />
                <Input
                  placeholder="Name (optional)"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Select value={newContactLabel} onValueChange={setNewContactLabel}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {labelOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => {
                      if (!newContactPhone.trim()) { toast.error('Enter a phone number'); return }
                      addContactMutation.mutate({
                        phoneNumber: newContactPhone.trim(),
                        name: newContactName.trim() || undefined,
                        label: newContactLabel,
                      })
                    }}
                    disabled={addContactMutation.isPending}
                  >
                    {addContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Uganda format: 256..., +256..., or 07...</p>
            </div>

            <Separator />

            {/* Contact list */}
            <div className="max-h-60 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Contact className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No contacts yet</p>
                  <p className="text-xs mt-1">Add phone numbers above to receive SMS alerts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-3 rounded-lg border p-3 group">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {(contact.name || contact.phoneNumber).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{contact.phoneNumber}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{contact.label}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        disabled={deleteContactMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
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
