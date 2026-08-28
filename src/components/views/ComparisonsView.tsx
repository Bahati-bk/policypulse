'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { GitCompare, Plus, Sparkles, ArrowRight, Eye, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  COMPARING: <Loader2 className="h-4 w-4 text-teal-500 animate-spin" />,
  ANALYZING: <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
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

export default function ComparisonsView() {
  const queryClient = useQueryClient()
  const [selectedComparison, setSelectedComparison] = useState<Record<string, unknown> | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [oldDocId, setOldDocId] = useState('')
  const [newDocId, setNewDocId] = useState('')

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
  const docsByPolicy: Record<string, Record<string, unknown>[]> = {}
  documents.forEach((d: Record<string, unknown>) => {
    const pid = d.policyId as string
    if (!docsByPolicy[pid]) docsByPolicy[pid] = []
    docsByPolicy[pid].push(d)
  })

  const changes = (selectedComparison?.changes as Record<string, unknown>[]) || []

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comparisons</h1>
          <p className="text-muted-foreground text-sm">Compare policy document versions and analyze changes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Comparison</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Comparison</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Old Document</label>
                <Select value={oldDocId} onValueChange={setOldDocId}>
                  <SelectTrigger><SelectValue placeholder="Select old version" /></SelectTrigger>
                  <SelectContent>
                    {documents.map((d: Record<string, unknown>) => (
                      <SelectItem key={d.id} value={d.id as string}>
                        {(d.policy as Record<string, unknown>)?.title} - {d.version as string || d.fileName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Document</label>
                <Select value={newDocId} onValueChange={setNewDocId}>
                  <SelectTrigger><SelectValue placeholder="Select new version" /></SelectTrigger>
                  <SelectContent>
                    {documents.map((d: Record<string, unknown>) => (
                      <SelectItem key={d.id} value={d.id as string} disabled={d.id === oldDocId}>
                        {(d.policy as Record<string, unknown>)?.title} - {d.version as string || d.fileName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!oldDocId || !newDocId || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Comparison'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
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
          {comparisons.map((comp: Record<string, unknown>) => (
            <motion.div key={comp.id as string} variants={item}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedComparison(comp)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitCompare className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {(comp.oldDocument as Record<string, unknown>)?.policy?.title || 'Comparison'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(comp.oldDocument as Record<string, unknown>)?.version} → {(comp.newDocument as Record<string, unknown>)?.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {statusIcon[(comp.status as string) || 'PENDING']}
                      <Badge variant="outline" className="text-[10px]">{comp.status as string}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span>{(comp._count as Record<string, number>)?.changes || 0} changes</span>
                    <span>·</span>
                    <span>{comp.createdAt ? format(new Date(comp.createdAt as string), 'MMM d, yyyy') : ''}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Comparison Detail Dialog */}
      <Dialog open={!!selectedComparison} onOpenChange={() => setSelectedComparison(null)}>
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

          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              onClick={() => analyzeMutation.mutate(selectedComparison!.id as string)}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Analyzing...</> : <><Sparkles className="mr-2 h-3.5 w-3.5" />Analyze with AI</>}
            </Button>
            <Badge variant="outline">{changes.length} changes detected</Badge>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {changes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>No changes detected yet. Click "Analyze with AI" to detect changes.</p>
                </div>
              ) : (
                changes.map((change: Record<string, unknown>) => {
                  const assessment = change.assessment as Record<string, unknown> | null
                  let affectedGroups: Array<Record<string, unknown>> = []
                  let actions: Array<Record<string, unknown>> = []
                  try {
                    affectedGroups = assessment?.affectedGroups ? JSON.parse(assessment.affectedGroups as string) : []
                    actions = assessment?.actions ? JSON.parse(assessment.actions as string) : []
                  } catch {}

                  return (
                    <Card key={change.id as string}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={changeTypeColors[(change.changeType as string) || 'MODIFIED']}>
                              {change.changeType as string}
                            </Badge>
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
                          <p className="text-sm text-muted-foreground">{change.description as string}</p>
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
                        {affectedGroups.length > 0 && (
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
                        {actions.length > 0 && (
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
                        {assessment?.rationale && (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">Impact Assessment</p>
                            <p className="text-xs text-muted-foreground">{assessment.rationale as string}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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