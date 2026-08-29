'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { GitCompare, Plus, Sparkles, Eye, CheckCircle2, Clock, XCircle, Loader2, ChevronDown, ChevronUp, FileText, Upload, Brain, X, Trash2, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAppStore } from '@/lib/store'
import { safeArray } from '@/lib/safe-array'

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  PENDING: { icon: <Clock className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Pending' },
  COMPARING: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'bg-teal-500/10 text-teal-600', label: 'Comparing' },
  ANALYZING: { icon: <Sparkles className="h-4 w-4 animate-pulse" />, color: 'bg-amber-500/10 text-amber-600', label: 'AI Analyzing' },
  COMPLETED: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-emerald-500/10 text-emerald-600', label: 'Completed' },
  FAILED: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-500/10 text-red-600', label: 'Failed' },
}

const severityColors: Record<string, string> = {
  HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
}

const changeTypeColors: Record<string, string> = {
  ADDED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  MODIFIED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  REMOVED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  RESTRUCTURED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ComparisonsView() {
  const user = useAppStore(s => s.user)
  const queryClient = useQueryClient()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ['comparisons'],
    queryFn: () => fetch('/api/comparisons').then(r => r.json()),
    enabled: !!user,
  })

  const list = safeArray<Record<string, unknown>>(comparisons)

  const selectedComparison = useMemo(() => {
    if (!selectedId || !list.length) return null
    return list.find((c: Record<string, unknown>) => c.id === selectedId) || null
  }, [selectedId, list])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comparisons</h1>
          <p className="text-sm text-muted-foreground">Compare policy document versions with AI analysis</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Brain className="h-4 w-4" />
          New AI Comparison
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4"><Skeleton className="h-32 w-full rounded-lg" /></Card>
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center">
          <GitCompare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-1">No comparisons yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload old and new policy documents to compare them with AI</p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create First Comparison
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {list.map((comp: Record<string, unknown>, idx: number) => {
              const status = (comp.status as string) || 'PENDING'
              const cfg = statusConfig[status] || statusConfig.PENDING
              const changeCount = (comp as Record<string, Record<string, number>>)._count?.changes || 0
              const oldDoc = comp.oldDocument as Record<string, unknown> | null
              const newDoc = comp.newDocument as Record<string, unknown> | null
              const creator = comp.creator as Record<string, unknown> | null
              const compTitle = comp.title as string | null
              const createdAt = comp.createdAt as string

              return (
                <motion.div
                  key={comp.id as string}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30"
                    onClick={() => setSelectedId(comp.id as string)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={cfg.color}>{status}</Badge>
                          {changeCount > 0 && (
                            <span className="text-xs text-muted-foreground">{changeCount as number} change{changeCount as number !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {creator && (
                          <span className="text-[10px] text-muted-foreground">{creator.name as string}</span>
                        )}
                      </div>

                      {compTitle && (
                        <p className="font-medium text-sm">{compTitle}</p>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{oldDoc?.fileName || 'Original'}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{newDoc?.fileName || 'Amended'}</span>
                        </div>
                        {oldDoc && (
                          <p className="text-xs text-muted-foreground">{(oldDoc.policy as Record<string, unknown>)?.title || 'Policy'}</p>
                        )}
                      </div>

                      {createdAt && (
                        <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <CreateComparisonDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(id) => {
          setShowCreateDialog(false)
          setSelectedId(id)
          queryClient.invalidateQueries({ queryKey: ['comparisons'] })
        }}
      />

      {/* Detail Dialog */}
      {selectedComparison && (
        <ComparisonDetail
          comparison={selectedComparison}
          open={!!selectedId}
          onOpenChange={(open) => { if (!open) setSelectedId(null) }}
        />
      )}
    </div>
  )
}

/* ==================== Create Dialog ==================== */
function CreateComparisonDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const user = useAppStore(s => s.user)
  const [page, setPage] = useState<'upload' | 'select'>('upload')
  const [policyId, setPolicyId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [oldFile, setOldFile] = useState<File | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const oldInputRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  // For selecting existing documents
  const [oldDocId, setOldDocId] = useState('')
  const [newDocId, setNewDocId] = useState('')

  const { data: policies } = useQuery({
    queryKey: ['policies-select'],
    queryFn: () => fetch('/api/policies').then(r => r.json()),
    enabled: open && !!user,
  })

  const { data: documents } = useQuery({
    queryKey: ['documents-select', policyId],
    queryFn: () => fetch(`/api/documents${policyId ? `?policyId=${policyId}` : ''}`).then(r => r.json()),
    enabled: open && !!user && page === 'select',
  })

  const policyList = safeArray<Record<string, unknown>>(policies)
  const docList = safeArray<Record<string, unknown>>(documents)

  const reset = useCallback(() => {
    setPage('upload')
    setPolicyId('')
    setTitle('')
    setDescription('')
    setOldFile(null)
    setNewFile(null)
    setOldDocId('')
    setNewDocId('')
    setError('')
    setSubmitting(false)
  }, [])

  const handleClose = useCallback((v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }, [onOpenChange, reset])

  // Submit using uploaded files
  const handleUploadSubmit = async () => {
    if (!oldFile || !newFile || !policyId || !user) return
    setSubmitting(true)
    setError('')
    try {
      const oldBase64 = await readFileAsBase64(oldFile)
      const newBase64 = await readFileAsBase64(newFile)
      const res = await fetch('/api/comparisons/ai-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `Comparison of ${oldFile.name}`,
          description,
          policyId,
          oldFile: oldBase64,
          newFile: newBase64,
          oldFilename: oldFile.name,
          newFilename: newFile.name,
        }),
      })
      if (!res.ok) {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('text/html')) throw new Error('Server is starting up, please try again in a moment.')
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Comparison failed')
      }
      const data = await res.json()
      const compId = data.comparison?.id || ''
      toast.success(`AI comparison complete! Found ${data.changesCount || 0} changes.`)
      if (data._smsQueued) toast.info('SMS alerts queued to your contacts')
      onCreated(compId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Comparison failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Submit using existing documents
  const handleSelectSubmit = async () => {
    if (!oldDocId || !newDocId || !policyId || !user) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'AI Comparison',
          description,
          policyId,
          oldDocumentId: oldDocId,
          newDocumentId: newDocId,
        }),
      })
      if (!res.ok) {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('text/html')) throw new Error('Server is starting up, please try again in a moment.')
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Comparison creation failed')
      }
      const data = await res.json()
      toast.success('Comparison created and sent for AI analysis!')
      onCreated(data.id || '')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Comparison failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const isUploadReady = !!policyId && !!oldFile && !!newFile && !submitting
  const isSelectReady = !!policyId && !!oldDocId && !!newDocId && !submitting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Policy Comparison
          </DialogTitle>
          <DialogDescription>
            Compare two versions of a policy document using AI analysis
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${page === 'upload' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setPage('upload')}
          >
            <Upload className="h-3.5 w-3.5 inline mr-1.5" />
            Upload Files
          </button>
          <button
            className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${page === 'select' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setPage('select')}
          >
            <FileText className="h-3.5 w-3.5 inline mr-1.5" />
            Select Existing
          </button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Policy selection */}
            <div className="space-y-2">
              <Label>Select Policy <span className="text-red-500">*</span></Label>
              <Select value={policyId} onValueChange={(v) => { setPolicyId(v); setOldDocId(''); setNewDocId('') }}>
                <SelectTrigger><SelectValue placeholder="Choose a policy..." /></SelectTrigger>
                <SelectContent className="max-h-60">{policyList.map((p: Record<string, unknown>) => (
                  <SelectItem key={p.id as string} value={p.id as string}>{p.title as string}</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input placeholder="e.g., Tax Act 2023 vs 2024" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea placeholder="Context for the comparison..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            <Separator />

            {page === 'upload' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Old file upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Original Document <span className="text-red-500">*</span>
                  </Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors min-h-[120px] flex flex-col items-center justify-center"
                    onClick={() => oldInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) setOldFile(f) }}
                  >
                    <input ref={oldInputRef} type="file" className="hidden" accept=".txt, .pdf, .doc, .docx, .md" onChange={e => { const f = e.target.files?.[0]; if (f) setOldFile(f) }} />
                    {oldFile ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-red-500 shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="font-medium text-sm truncate">{oldFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(oldFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setOldFile(null) }}
                          className="ml-auto p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 shrink-0"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">Click or drag to upload</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">TXT, PDF, DOCX, MD</p>
                      </>
                    )}
                  </div>
                </div>

                {/* New file upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    Amended Document <span className="text-red-500">*</span>
                  </Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors min-h-[120px] flex flex-col items-center justify-center"
                    onClick={() => newInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) setNewFile(f) }}
                  >
                    <input ref={newInputRef} type="file" className="hidden" accept=".txt, .pdf, .doc, .docx, .md" onChange={e => { const f = e.target.files?.[0]; if (f) setNewFile(f) }} />
                    {newFile ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-emerald-500 shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="font-medium text-sm truncate">{newFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(newFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setNewFile(null) }}
                          className="ml-auto p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shrink-0"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">Click or drag to upload</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">TXT, PDF, DOCX, MD</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {page === 'select' && (
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Old document select */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Original Document <span className="text-red-500">*</span>
                  </Label>
                  <Select value={oldDocId} onValueChange={setOldDocId}>
                    <SelectTrigger><SelectValue placeholder={docList.length > 0 ? 'Select original...' : 'Upload documents first'} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {docList.filter((d: Record<string, unknown>) => d.id !== newDocId).map((d: Record<string, unknown>) => (
                        <SelectItem key={d.id as string} value={d.id as string}>
                          <span className="truncate">{d.fileName as string || 'Untitled'} {d.version ? `(${d.version as string})` : ''}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* New document select */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    Amended Document <span className="text-red-500">*</span>
                  </Label>
                  <Select value={newDocId} onValueChange={setNewDocId}>
                    <SelectTrigger><SelectValue placeholder={docList.length > 0 ? 'Select amended...' : 'Upload documents first'} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {docList.filter((d: Record<string, unknown>) => d.id !== oldDocId).map((d: Record<string, unknown>) => (
                        <SelectItem key={d.id as string} value={d.id as string}>
                          <span className="truncate">{d.fileName as string || 'Untitled'} {d.version ? `(${d.version as string})` : ''}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>AI will analyze both documents and identify all changes with severity ratings and recommendations.</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator />
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={page === 'upload' ? handleUploadSubmit : handleSelectSubmit}
            disabled={page === 'upload' ? !isUploadReady : !isSelectReady}
            className="gap-2"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {page === 'upload' ? 'Comparing with AI...' : 'Creating...'}</> : <><Sparkles className="h-4 w-4" /> {page === 'upload' ? 'Compare with AI' : 'Create Comparison'}</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ==================== Detail Dialog ==================== */
function ComparisonDetail({ comparison, open, onOpenChange }: { comparison: Record<string, unknown>; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [allExpanded, setAllExpanded] = useState(false)

  const changes = useMemo(() => {
    const raw = comparison.changes as Record<string, unknown>[] | undefined
    return safeArray(raw)
  }, [comparison])

  const status = (comparison.status as string) || 'PENDING'
  const cfg = statusConfig[status] || statusConfig.PENDING
  const oldDoc = comparison.oldDocument as Record<string, unknown> | null
  const newDoc = comparison.newDocument as Record<string, unknown> | null
  const compTitle = comparison.title as string | null

  const highCount = changes.filter(c => c.severity === 'HIGH').length
  const medCount = changes.filter(c => c.severity === 'MEDIUM').length
  const lowCount = changes.filter(c => c.severity === 'LOW').length

  const grouped = useMemo(() => {
    const g: Record<string, Record<string, unknown>[]> = {}
    for (const c of changes) {
      const t = (c.changeType as string) || 'MODIFIED'
      if (!g[t]) g[t] = []
      g[t].push(c)
    }
    return g
  }, [changes])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            {compTitle || 'Comparison Details'}
            <Badge className={cfg.color}>{cfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{changes.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{highCount}</p>
            <p className="text-xs text-muted-foreground">High</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{medCount}</p>
            <p className="text-xs text-muted-foreground">Medium</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{lowCount}</p>
            <p className="text-xs text-muted-foreground">Low</p>
          </div>
        </div>

        {/* Files info */}
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{oldDoc?.fileName || 'Original'}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{newDoc?.fileName || 'Amended'}</span>
        </div>

        {status === 'ANALYZING' && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
            <div>
              <p className="font-medium">AI is analyzing your documents...</p>
              <p className="text-sm text-muted-foreground">This may take 10-30 seconds</p>
            </div>
          </div>
        )}

        {changes.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <Button size="sm" variant="ghost" onClick={() => setAllExpanded(!allExpanded)} className="ml-auto">
              {allExpanded ? <><ChevronUp className="mr-1 h-3 w-3" />Collapse</> : <><ChevronDown className="mr-1 h-3 w-3" />Expand</>}
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pr-4 pb-4">
            {changes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No changes detected.</p>
                {status === 'COMPLETED' && <p className="text-sm mt-1">The documents appear to be identical.</p>}
              </div>
            ) : (
              (['ADDED', 'MODIFIED', 'REMOVED', 'RESTRUCTURED'] as const).map(type => {
                const group = grouped[type]
                if (!group || group.length === 0) return null
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={changeTypeColors[type]}>{type}</Badge>
                      <span className="text-xs text-muted-foreground">{group.length}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-3">
                      {group.map((change, idx) => {
                        const sev = (change.severity as string) || 'MEDIUM'
                        const assessment = change.assessment as Record<string, unknown> | null
                        let recommendation = ''
                        try {
                          const actions = assessment?.actions ? JSON.parse(assessment.actions as string) : []
                          if (Array.isArray(actions) && actions[0]?.action) recommendation = actions[0].action as string
                        } catch { /* empty */ }
                        const references = safeArray<Record<string, unknown>>(change.references)

                        return (
                          <Card key={(change.id as string) || idx}>
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={severityColors[sev] || severityColors.MEDIUM}>{sev}</Badge>
                                {change.confidenceScore != null && (
                                  <span className="text-xs text-muted-foreground">{(change.confidenceScore as number * 100).toFixed(0)}% confidence</span>
                                )}
                                {references.length > 0 && references[0].sectionTitle && (
                                  <Badge variant="outline" className="text-[10px]">{references[0].sectionTitle as string}</Badge>
                                )}
                              </div>

                              <h3 className="font-semibold text-sm">{change.title as string}</h3>
                              <p className={`text-sm text-muted-foreground ${!allExpanded ? 'line-clamp-3' : ''}`}>{change.description as string}</p>

                              {/* Diff view */}
                              {allExpanded && (change.oldText || change.newText) && (
                                <div className="grid md:grid-cols-2 gap-3">
                                  {change.oldText && (
                                    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/50 p-3">
                                      <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-1">OLD</p>
                                      <p className="text-xs font-mono line-through opacity-70 whitespace-pre-wrap">{change.oldText as string}</p>
                                    </div>
                                  )}
                                  {change.newText && (
                                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 p-3">
                                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">NEW</p>
                                      <p className="text-xs font-mono whitespace-pre-wrap">{change.newText as string}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AI Recommendation */}
                              {recommendation && (
                                <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Recommendation</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{recommendation}</p>
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
  )
}
