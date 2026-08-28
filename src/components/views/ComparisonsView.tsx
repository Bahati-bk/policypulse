'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GitCompare, Plus, Sparkles, ArrowRight, Eye, CheckCircle2, Clock, XCircle, Loader2, ChevronDown, ChevronUp, FileText, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  COMPARING: <Loader2 className="h-4 w-4 text-teal-500 animate-spin" />,
  ANALYZING: <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
}

const statusProgress: Record<string, number> = {
  PENDING: 10,
  COMPARING: 35,
  ANALYZING: 65,
  COMPLETED: 100,
  FAILED: 0,
}

const statusProgressColor: Record<string, string> = {
  PENDING: 'bg-amber-500',
  COMPARING: 'bg-teal-500',
  ANALYZING: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
}

const changeTypeColors: Record<string, string> = {
  ADDED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  REMOVED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  MODIFIED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
}

const severityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

const stepTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: 'easeInOut' },
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getAvatarGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  const gradients = [
    'from-emerald-500 to-teal-600',
    'from-teal-500 to-cyan-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-emerald-400 to-cyan-500',
  ]
  return gradients[Math.abs(hash) % gradients.length]
}

const docTypeIcons: Record<string, string> = {
  PDF: 'text-red-500',
  DOCX: 'text-teal-500',
  TXT: 'text-slate-500',
}

const processingStatusColors: Record<string, string> = {
  UPLOADED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  VALIDATING: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  PROCESSING: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
  READY: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}

export default function ComparisonsView() {
  const queryClient = useQueryClient()
  const [selectedComparison, setSelectedComparison] = useState<Record<string, unknown> | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [oldDocId, setOldDocId] = useState('')
  const [newDocId, setNewDocId] = useState('')
  const [comparisonTitle, setComparisonTitle] = useState('')
  const [allExpanded, setAllExpanded] = useState(false)

  const { data: comparisons = [], isLoading } = useQuery({
    queryKey: ['comparisons'],
    queryFn: () => fetch('/api/comparisons').then(r => r.json()),
  })

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => fetch('/api/documents').then(r => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldDocumentId: oldDocId, newDocumentId: newDocId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons'] })
      toast.success('Comparison created')
      setCreateOpen(false)
      setOldDocId('')
      setNewDocId('')
      setComparisonTitle('')
      setStep(1)
    },
    onError: (e) => toast.error(e.message),
  })

  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/comparisons/${id}/analyze`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Analysis failed') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons'] })
      toast.success('AI analysis complete!')
      if (selectedComparison) {
        fetch(`/api/comparisons/${selectedComparison.id}`).then(r => r.json()).then(setSelectedComparison)
      }
    },
    onError: (e) => toast.error(e.message),
  })

  // Group docs by policy
  const docsByPolicy = useMemo(() => {
    const map: Record<string, Record<string, unknown>[]> = {}
    documents.forEach((d: Record<string, unknown>) => {
      const pid = d.policyId as string
      if (!map[pid]) map[pid] = []
      map[pid].push(d)
    })
    return map
  }, [documents])

  // Get policy titles map
  const policyTitles = useMemo(() => {
    const map: Record<string, string> = {}
    documents.forEach((d: Record<string, unknown>) => {
      const pid = d.policyId as string
      const policy = d.policy as Record<string, unknown>
      if (pid && policy?.title && !map[pid]) map[pid] = policy.title as string
    })
    return map
  }, [documents])

  // Selected document objects
  const oldDoc = useMemo(() => documents.find((d: Record<string, unknown>) => d.id === oldDocId), [documents, oldDocId])
  const newDoc = useMemo(() => documents.find((d: Record<string, unknown>) => d.id === newDocId), [documents, newDocId])

  // Auto-generate title
  const autoTitle = useMemo(() => {
    if (oldDoc && newDoc) {
      const policyTitle = (oldDoc.policy as Record<string, unknown>)?.title || 'Document'
      return `${policyTitle}: ${(oldDoc.version || 'v1')} → ${(newDoc.version || 'v2')}`
    }
    return ''
  }, [oldDoc, newDoc])

  // Validation
  const validationError = useMemo(() => {
    if (oldDocId && newDocId && oldDocId === newDocId) return 'Cannot select the same document'
    if (oldDoc && newDoc && (oldDoc.policyId as string) !== (newDoc.policyId as string)) return 'Documents must be from the same policy'
    return ''
  }, [oldDocId, newDocId, oldDoc, newDoc])

  const canCreate = oldDocId && newDocId && !validationError && !createMutation.isPending

  function handleOpenCreate() {
    setStep(1)
    setOldDocId('')
    setNewDocId('')
    setComparisonTitle('')
    setCreateOpen(true)
  }

  function handleOldDocSelect(val: string) {
    setOldDocId(val)
    if (val === newDocId) setNewDocId('')
    if (step === 1 && val) setStep(2)
  }

  function handleNewDocSelect(val: string) {
    setNewDocId(val)
    if (!comparisonTitle && autoTitle) setComparisonTitle(autoTitle)
    if (step === 2 && val && !validationError) setStep(3)
  }

  function handleCreate() {
    createMutation.mutate()
  }

  const changes = (selectedComparison?.changes as Record<string, unknown>[]) || []

  // Detail dialog: group changes by type
  const groupedChanges = useMemo(() => {
    const groups: Record<string, Record<string, unknown>[]> = { ADDED: [], MODIFIED: [], REMOVED: [] }
    changes.forEach(c => {
      const t = (c.changeType as string) || 'MODIFIED'
      if (!groups[t]) groups[t] = []
      groups[t].push(c)
    })
    return groups
  }, [changes])

  // Severity distribution for detail dialog
  const severityDist = useMemo(() => {
    const dist: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
    changes.forEach(c => {
      const s = (c.severity as string) || 'MEDIUM'
      dist[s] = (dist[s] || 0) + 1
    })
    return dist
  }, [changes])

  const avgConfidence = useMemo(() => {
    if (changes.length === 0) return 0
    const sum = changes.reduce((acc, c) => acc + ((c.confidenceScore as number) || 0), 0)
    return (sum / changes.length * 100)
  }, [changes])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comparisons</h1>
          <p className="text-muted-foreground text-sm">Compare policy document versions and analyze changes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) { setStep(1); setOldDocId(''); setNewDocId(''); setComparisonTitle('') }
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}><Plus className="mr-2 h-4 w-4" />New Comparison</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create Comparison</DialogTitle></DialogHeader>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 transition-all duration-300 ${
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
                  </div>
                  <span className={`text-xs font-medium truncate transition-colors ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s === 1 ? 'Old Document' : s === 2 ? 'New Document' : 'Review'}
                  </span>
                  {s < 3 && (
                    <div className={`flex-1 h-px mx-1 transition-colors ${step > s ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" {...stepTransition} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Select Old Document</Label>
                    <Select value={oldDocId} onValueChange={handleOldDocSelect}>
                      <SelectTrigger><SelectValue placeholder="Select old version..." /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {Object.entries(docsByPolicy).map(([pid, docs]) => (
                          <SelectGroup key={pid}>
                            <SelectLabel className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                              {policyTitles[pid] || 'Unknown Policy'}
                            </SelectLabel>
                            {docs.map((d: Record<string, unknown>) => (
                              <SelectItem key={d.id} value={d.id as string}>
                                <div className="flex items-center gap-2">
                                  <FileText className={`h-3.5 w-3.5 ${docTypeIcons[(d.documentType as string) || 'PDF'] || 'text-slate-500'}`} />
                                  <span className="truncate">{d.version || d.fileName || 'Untitled'}</span>
                                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ml-1 shrink-0 ${processingStatusColors[(d.processingStatus as string) || 'UPLOADED'] || ''}`}>
                                    {d.processingStatus as string}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Document Details Preview */}
                  {oldDoc && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected Document</span>
                        <Badge variant="outline" className={`text-[10px] ${processingStatusColors[(oldDoc.processingStatus as string) || 'UPLOADED'] || ''}`}>
                          {oldDoc.processingStatus as string}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{(oldDoc.policy as Record<string, unknown>)?.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><FileText className={`h-3 w-3 ${docTypeIcons[(oldDoc.documentType as string) || 'PDF'] || ''}`} />{oldDoc.documentType as string}</span>
                        <span>Version: {oldDoc.version || 'N/A'}</span>
                      </div>
                    </motion.div>
                  )}

                  <Button className="w-full" disabled={!oldDocId} onClick={() => setStep(2)}>
                    Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" {...stepTransition} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Select New Document</Label>
                    <Select value={newDocId} onValueChange={handleNewDocSelect}>
                      <SelectTrigger><SelectValue placeholder="Select new version..." /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {Object.entries(docsByPolicy).map(([pid, docs]) => (
                          <SelectGroup key={pid}>
                            <SelectLabel className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                              {policyTitles[pid] || 'Unknown Policy'}
                            </SelectLabel>
                            {docs.map((d: Record<string, unknown>) => (
                              <SelectItem key={d.id} value={d.id as string} disabled={d.id === oldDocId}>
                                <div className="flex items-center gap-2">
                                  <FileText className={`h-3.5 w-3.5 ${docTypeIcons[(d.documentType as string) || 'PDF'] || 'text-slate-500'}`} />
                                  <span className="truncate">{d.version || d.fileName || 'Untitled'}</span>
                                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ml-1 shrink-0 ${processingStatusColors[(d.processingStatus as string) || 'UPLOADED'] || ''}`}>
                                    {d.processingStatus as string}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {validationError && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {/* New Document Details */}
                  {newDoc && !validationError && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected Document</span>
                        <Badge variant="outline" className={`text-[10px] ${processingStatusColors[(newDoc.processingStatus as string) || 'UPLOADED'] || ''}`}>
                          {newDoc.processingStatus as string}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{(newDoc.policy as Record<string, unknown>)?.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><FileText className={`h-3 w-3 ${docTypeIcons[(newDoc.documentType as string) || 'PDF'] || ''}`} />{newDoc.documentType as string}</span>
                        <span>Version: {newDoc.version || 'N/A'}</span>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      <ChevronRight className="mr-1 h-4 w-4 rotate-180" />Back
                    </Button>
                    <Button className="flex-1" disabled={!newDocId || !!validationError} onClick={() => { if (!comparisonTitle && autoTitle) setComparisonTitle(autoTitle); setStep(3) }}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" {...stepTransition} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Comparison Title</Label>
                    <Input
                      value={comparisonTitle}
                      onChange={(e) => setComparisonTitle(e.target.value)}
                      placeholder="Enter comparison title..."
                    />
                  </div>

                  {/* Side-by-side preview */}
                  {oldDoc && newDoc && (
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Old Version</p>
                        <p className="font-medium text-sm truncate">{oldDoc.version || oldDoc.fileName || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground truncate">{(oldDoc.policy as Record<string, unknown>)?.title}</p>
                        <Badge variant="outline" className={`text-[9px] mt-1 ${processingStatusColors[(oldDoc.processingStatus as string) || 'UPLOADED'] || ''}`}>
                          {oldDoc.documentType as string} · {oldDoc.processingStatus as string}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">New Version</p>
                        <p className="font-medium text-sm truncate">{newDoc.version || newDoc.fileName || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground truncate">{(newDoc.policy as Record<string, unknown>)?.title}</p>
                        <Badge variant="outline" className={`text-[9px] mt-1 ${processingStatusColors[(newDoc.processingStatus as string) || 'UPLOADED'] || ''}`}>
                          {newDoc.documentType as string} · {newDoc.processingStatus as string}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                      <ChevronRight className="mr-1 h-4 w-4 rotate-180" />Back
                    </Button>
                    <Button className="flex-1" disabled={!canCreate} onClick={handleCreate}>
                      {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><Sparkles className="mr-2 h-4 w-4" />Create Comparison</>}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : comparisons.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GitCompare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No comparisons yet. Create your first comparison.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} className="grid gap-4 md:grid-cols-2">
          {comparisons.map((comp: Record<string, unknown>) => {
            const creator = comp.creator as Record<string, unknown> | null
            const changeCount = (comp._count as Record<string, number>)?.changes || 0
            const status = (comp.status as string) || 'PENDING'
            return (
              <motion.div key={comp.id as string} variants={item}>
                <Card className="card-shine hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-primary/30" onClick={() => setSelectedComparison(comp)}>
                  <CardContent className="p-4">
                    {/* Status progress bar */}
                    <div className="h-1 w-full bg-muted rounded-full mb-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${statusProgress[status]}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${statusProgressColor[status]}`}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GitCompare className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {(comp.oldDocument as Record<string, unknown>)?.policy?.title || 'Comparison'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {(comp.oldDocument as Record<string, unknown>)?.version || 'v1'}
                            <ArrowRight className="h-3 w-3" />
                            {(comp.newDocument as Record<string, unknown>)?.version || 'v2'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {statusIcon[status]}
                        <Badge variant="outline" className="text-[10px]">{status}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {/* Changes dot indicator */}
                        <span className="flex items-center gap-1.5">
                          <span className="flex -space-x-1">
                            {Array.from({ length: Math.min(changeCount, 5) }).map((_, i) => (
                              <span key={i} className={`h-1.5 w-1.5 rounded-full ${
                                i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                            ))}
                          </span>
                          <span>{changeCount} changes</span>
                        </span>
                        <span>·</span>
                        <span>{comp.createdAt ? formatDistanceToNow(new Date(comp.createdAt as string), { addSuffix: true }) : ''}</span>
                      </div>
                    </div>

                    {/* Creator info */}
                    {creator && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                        <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${getAvatarGradient(comp.id as string)} flex items-center justify-center text-[9px] font-bold text-white`}>
                          {getInitials(creator.name as string)}
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate">{creator.name || creator.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Comparison Detail Dialog */}
      <Dialog open={!!selectedComparison} onOpenChange={() => { setSelectedComparison(null); setAllExpanded(false) }}>
        <DialogContent className="max-w-4xl max-h-[85vh] pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              {(selectedComparison?.oldDocument as Record<string, unknown>)?.policy?.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {(selectedComparison?.oldDocument as Record<string, unknown>)?.version} → {(selectedComparison?.newDocument as Record<string, unknown>)?.version}
            </p>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">{changes.length}</p>
              <p className="text-[11px] text-muted-foreground">Total Changes</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Severity Distribution</p>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                {changes.length > 0 && (
                  <>
                    <div className="bg-emerald-500 rounded-l-full" style={{ width: `${(severityDist.LOW / changes.length) * 100}%` }} />
                    <div className="bg-amber-500" style={{ width: `${(severityDist.MEDIUM / changes.length) * 100}%` }} />
                    <div className="bg-red-500 rounded-r-full" style={{ width: `${(severityDist.HIGH / changes.length) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{severityDist.LOW} Low</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">{severityDist.MEDIUM} Med</span>
                <span className="text-[10px] text-red-600 dark:text-red-400">{severityDist.HIGH} High</span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{avgConfidence.toFixed(0)}%</p>
              <p className="text-[11px] text-muted-foreground">Avg. Confidence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => analyzeMutation.mutate(selectedComparison!.id as string)}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Analyzing...</> : <><Sparkles className="mr-2 h-3.5 w-3.5" />Analyze with AI</>}
            </Button>
            {changes.length > 0 && (
              <Button
                size="sm" variant="outline" className="ml-auto"
                onClick={() => setAllExpanded(!allExpanded)}
              >
                {allExpanded ? <><ChevronUp className="mr-1 h-3.5 w-3.5" />Collapse All</> : <><ChevronDown className="mr-1 h-3.5 w-3.5" />Expand All</>}
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-4 pr-4">
              {changes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>No changes detected yet. Click "Analyze with AI" to detect changes.</p>
                </div>
              ) : (
                // Group by changeType
                (['ADDED', 'MODIFIED', 'REMOVED'] as const).map((type) => {
                  const typeChanges = groupedChanges[type]
                  if (!typeChanges || typeChanges.length === 0) return null
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${changeTypeColors[type]} text-xs`}>{type}</Badge>
                        <span className="text-xs text-muted-foreground">{typeChanges.length} change{typeChanges.length > 1 ? 's' : ''}</span>
                        <div className="flex-1 h-px bg-border/60" />
                      </div>
                      <div className="space-y-3">
                        {typeChanges.map((change: Record<string, unknown>) => {
                          const assessment = change.assessment as Record<string, unknown> | null
                          let affectedGroups: Array<Record<string, unknown>> = []
                          let actions: Array<Record<string, unknown>> = []
                          try {
                            affectedGroups = assessment?.affectedGroups ? JSON.parse(assessment.affectedGroups as string) : []
                            actions = assessment?.actions ? JSON.parse(assessment.actions as string) : []
                          } catch { /* empty */ }

                          return (
                            <Card key={change.id as string}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={severityColors[(change.severity as string) || 'MEDIUM']}>
                                      {change.severity as string}
                                    </Badge>
                                    {change.confidenceScore && (
                                      <span className="text-xs text-muted-foreground">
                                        {(change.confidenceScore as number * 100).toFixed(0)}% confidence
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <h3 className="font-semibold text-sm">{change.title as string}</h3>
                                {change.description && (
                                  <p className={`text-sm text-muted-foreground ${!allExpanded ? 'line-clamp-2' : ''}`}>{change.description as string}</p>
                                )}

                                {/* Diff view */}
                                {(change.oldText || change.newText) && (
                                  <div className="grid md:grid-cols-2 gap-3">
                                    {change.oldText && (
                                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
                                        <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-1">OLD</p>
                                        <p className="text-xs font-mono line-through opacity-75">{change.oldText as string}</p>
                                      </div>
                                    )}
                                    {change.newText && (
                                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3">
                                        <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">NEW</p>
                                        <p className="text-xs font-mono">{change.newText as string}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Affected Groups */}
                                {allExpanded && affectedGroups.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium mb-2">Affected Groups</p>
                                    <div className="space-y-2">
                                      {affectedGroups.map((g, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <span className="text-xs flex-1">{g.group as string}</span>
                                          <div className="w-24">
                                            <Progress value={(g.confidence as number) * 100} className="h-1.5" />
                                          </div>
                                          <span className="text-[10px] text-muted-foreground w-8 text-right">{(g.confidence as number * 100).toFixed(0)}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                {allExpanded && actions.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium mb-2">Recommended Actions</p>
                                    <ul className="space-y-1.5">
                                      {actions.map((a, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs">
                                          <ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                          <span>{a.action as string}</span>
                                          {a.deadline && <Badge variant="outline" className="text-[9px] ml-auto shrink-0">By {a.deadline as string}</Badge>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Assessment rationale */}
                                {allExpanded && assessment?.rationale && (
                                  <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Impact Assessment</p>
                                    <p className="text-xs text-muted-foreground">{assessment.rationale as string}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
