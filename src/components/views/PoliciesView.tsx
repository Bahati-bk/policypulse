'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, Search, Filter, FileText, Calendar, Building2, Tag, Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const policyTypeColors: Record<string, string> = {
  ACT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  REGULATION: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400',
  GUIDELINE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  POLICY: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  DIRECTIVE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
}

const jurisdictionColors: Record<string, string> = {
  Uganda: 'bg-primary/10 text-primary dark:bg-primary/20',
}

interface PolicyDocument {
  id: string
  fileName: string | null
  version: string | null
  documentType: string
  processingStatus: string
  createdAt: string
}

interface Policy {
  id: string
  title: string
  description: string | null
  policyType: string
  jurisdiction: string
  issuingAuthority: string | null
  createdAt: string
  updatedAt: string
  category: { id: string; name: string } | null
  _count: { documents: number }
  documents?: PolicyDocument[]
}

interface Category {
  id: string
  name: string
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

const POLICY_TYPES = ['ACT', 'REGULATION', 'GUIDELINE', 'POLICY', 'DIRECTIVE']

export default function PoliciesView() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all')
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Form state for new policy
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPolicyType, setFormPolicyType] = useState('POLICY')
  const [formJurisdiction, setFormJurisdiction] = useState('Uganda')
  const [formAuthority, setFormAuthority] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formEffectiveDate, setFormEffectiveDate] = useState('')
  const [formSourceUrl, setFormSourceUrl] = useState('')

  const resetForm = useCallback(() => {
    setFormTitle('')
    setFormDescription('')
    setFormPolicyType('POLICY')
    setFormJurisdiction('Uganda')
    setFormAuthority('')
    setFormCategoryId('')
    setFormEffectiveDate('')
    setFormSourceUrl('')
  }, [])

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => fetch('/api/policies').then(r => r.json()),
  })

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
  })

  const categories = categoriesData?.categories ?? []

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string
      description: string
      policyType: string
      jurisdiction: string
      issuingAuthority: string
      categoryId: string
      effectiveDate: string
      sourceUrl: string
    }) => {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create policy')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      toast.success('Policy created successfully')
      setCreateOpen(false)
      resetForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      title: formTitle,
      description: formDescription,
      policyType: formPolicyType,
      jurisdiction: formJurisdiction,
      issuingAuthority: formAuthority,
      categoryId: formCategoryId,
      effectiveDate: formEffectiveDate,
      sourceUrl: formSourceUrl,
    })
  }

  const jurisdictions = useMemo(
    () => [...new Set(policies.map(p => p.jurisdiction))].sort(),
    [policies]
  )

  const filtered = useMemo(() => {
    return policies.filter(p => {
      const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || p.policyType === typeFilter
      const matchesJurisdiction = jurisdictionFilter === 'all' || p.jurisdiction === jurisdictionFilter
      return matchesSearch && matchesType && matchesJurisdiction
    })
  }, [policies, search, typeFilter, jurisdictionFilter])

  const { data: policyDetail } = useQuery<Policy & { documents: PolicyDocument[] }>({
    queryKey: ['policy-detail', selectedPolicy?.id],
    queryFn: () =>
      fetch(`/api/policies/${selectedPolicy!.id}`).then(r => r.json()),
    enabled: !!selectedPolicy,
  })

  const displayPolicy = selectedPolicy && policyDetail ? policyDetail : selectedPolicy

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground text-sm">Browse and manage the policy registry</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create New Policy
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh] pr-4">
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="policy-title">Title <span className="text-destructive">*</span></Label>
                  <Input
                    id="policy-title"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Income Tax Amendment Act 2024"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="policy-desc">Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="policy-desc"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Describe the policy in at least 10 characters..."
                    required
                    minLength={10}
                    rows={3}
                  />
                </div>

                {/* Type + Jurisdiction - 2 column grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Policy Type</Label>
                    <Select value={formPolicyType} onValueChange={setFormPolicyType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {POLICY_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policy-jurisdiction">Jurisdiction</Label>
                    <Input
                      id="policy-jurisdiction"
                      value={formJurisdiction}
                      onChange={e => setFormJurisdiction(e.target.value)}
                      defaultValue="Uganda"
                    />
                  </div>
                </div>

                {/* Authority + Category - 2 column grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="policy-authority">Issuing Authority</Label>
                    <Input
                      id="policy-authority"
                      value={formAuthority}
                      onChange={e => setFormAuthority(e.target.value)}
                      placeholder="e.g. Parliament of Uganda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Effective Date + Source URL */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="policy-date">Effective Date</Label>
                    <Input
                      id="policy-date"
                      type="date"
                      value={formEffectiveDate}
                      onChange={e => setFormEffectiveDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policy-url">Source URL</Label>
                    <Input
                      id="policy-url"
                      type="url"
                      value={formSourceUrl}
                      onChange={e => setFormSourceUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Policy
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Bar */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policies by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {POLICY_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jurisdictions</SelectItem>
              {jurisdictions.map(j => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={item}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No policies found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {search || typeFilter !== 'all' || jurisdictionFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Policies will appear here once they are added.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((policy) => (
            <motion.div key={policy.id} variants={item}>
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
                onClick={() => setSelectedPolicy(policy)}
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                      {policy.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={policyTypeColors[policy.policyType] || policyTypeColors.POLICY}>
                      {policy.policyType}
                    </Badge>
                    <Badge variant="outline" className={jurisdictionColors[policy.jurisdiction] || 'bg-muted text-muted-foreground'}>
                      {policy.jurisdiction}
                    </Badge>
                  </div>
                  {policy.category && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{policy.category.name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{policy._count.documents} {policy._count.documents === 1 ? 'document' : 'documents'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(policy.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Policy Detail Dialog */}
      <Dialog open={!!selectedPolicy} onOpenChange={(open) => { if (!open) setSelectedPolicy(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <span>{displayPolicy?.title}</span>
            </DialogTitle>
          </DialogHeader>

          {displayPolicy && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={policyTypeColors[displayPolicy.policyType] || policyTypeColors.POLICY}>
                    {displayPolicy.policyType}
                  </Badge>
                  <Badge variant="outline" className={jurisdictionColors[displayPolicy.jurisdiction] || 'bg-muted text-muted-foreground'}>
                    {displayPolicy.jurisdiction}
                  </Badge>
                  {displayPolicy.category && (
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {displayPolicy.category.name}
                    </Badge>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {displayPolicy.issuingAuthority && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Issuing Authority</p>
                      <p className="text-sm">{displayPolicy.issuingAuthority}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Documents</p>
                    <p className="text-sm">{displayPolicy._count.documents}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                    <p className="text-sm">{format(new Date(displayPolicy.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Last Updated</p>
                    <p className="text-sm">{format(new Date(displayPolicy.updatedAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Description */}
                {displayPolicy.description && (
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{displayPolicy.description}</p>
                  </div>
                )}

                {/* Documents List */}
                {policyDetail?.documents && policyDetail.documents.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Documents ({policyDetail.documents.length})</p>
                    <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-2">
                      {policyDetail.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.fileName || `Document ${doc.version || '—'}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.documentType}{doc.version ? ` · v${doc.version}` : ''}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {doc.processingStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!policyDetail?.documents && (
                  <div className="flex justify-center py-4">
                    <Skeleton className="h-8 w-32" />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
