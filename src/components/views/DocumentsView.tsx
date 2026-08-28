'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Upload, Play, FolderOpen, Search, File, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  UPLOADED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  VALIDATING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PROCESSING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
}

const statusIcons: Record<string, React.ReactNode> = {
  UPLOADED: <FileText className="h-4 w-4 text-slate-400" />,
  VALIDATING: <FileText className="h-4 w-4 text-amber-400" />,
  PROCESSING: <Play className="h-4 w-4 text-amber-500 animate-pulse" />,
  READY: <FileText className="h-4 w-4 text-emerald-500" />,
  FAILED: <FileText className="h-4 w-4 text-red-500" />,
}

function getFileIcon(fileName: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <File className="h-4 w-4 text-rose-500" />
  if (ext === 'docx' || ext === 'doc') return <FileSpreadsheet className="h-4 w-4 text-teal-500" />
  if (ext === 'txt') return <FileText className="h-4 w-4 text-slate-500" />
  return <FileText className="h-4 w-4 text-muted-foreground" />
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function DocumentsView() {
  const queryClient = useQueryClient()
  const [selectedDoc, setSelectedDoc] = useState<Record<string, unknown> | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => fetch('/api/documents').then(r => r.json()),
  })

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded successfully')
      setUploadOpen(false)
    },
    onError: () => toast.error('Upload failed'),
  })

  const processMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}/process`, { method: 'POST' })
      if (!res.ok) throw new Error('Processing failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document processed successfully')
    },
    onError: () => toast.error('Processing failed'),
  })

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    uploadMutation.mutate(formData)
  }

  const filteredDocs = docs
    .filter((doc: Record<string, unknown>) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        ((doc.policy as Record<string, unknown>)?.title as string)?.toLowerCase().includes(q) ||
        (doc.version as string)?.toLowerCase().includes(q) ||
        (doc.fileName as string)?.toLowerCase().includes(q)
      )
    })
    .filter((doc: Record<string, unknown>) => !statusFilter || (doc.processingStatus as string) === statusFilter)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm">Manage policy documents and versions</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="mr-2 h-4 w-4" />Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input id="doc-title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-policy">Policy ID</Label>
                <Input id="doc-policy" name="policyId" required placeholder="e.g. policy-income-tax" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-version">Version</Label>
                <Input id="doc-version" name="version" placeholder="e.g. 2024-Amendment" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-file">File (PDF, DOCX, or TXT)</Label>
                <Input id="doc-file" name="file" type="file" accept=".pdf,.docx,.txt" />
              </div>
              <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, version, or filename..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
              onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No documents found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || statusFilter ? 'Try adjusting your search or filter criteria.' : 'Upload your first document to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} className="grid gap-4 md:grid-cols-2">
          {filteredDocs.map((doc: Record<string, unknown>) => (
            <motion.div key={doc.id as string} variants={item}>
              <Card className="hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedDoc(doc)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        {(doc.processingStatus as string) === 'PROCESSING'
                          ? statusIcons.PROCESSING
                          : (doc.processingStatus as string) === 'FAILED'
                            ? statusIcons.FAILED
                            : getFileIcon(doc.fileName as string || '')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{(doc.policy as Record<string, unknown>)?.title || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground">Version: {doc.version as string || 'N/A'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[(doc.processingStatus as string) || 'UPLOADED']}>
                      {(doc.processingStatus as string) || 'UPLOADED'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="truncate">{doc.fileName as string || 'No file'}</span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">{doc.createdAt ? format(new Date(doc.createdAt as string), 'MMM d, yyyy') : ''}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] pointer-events-auto">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Policy</p><p className="font-medium text-sm">{(selectedDoc.policy as Record<string, unknown>)?.title}</p></div>
                  <div><p className="text-xs text-muted-foreground">Version</p><p className="font-medium text-sm">{selectedDoc.version as string || 'N/A'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Type</p><Badge variant="outline">{selectedDoc.documentType as string}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={statusColors[(selectedDoc.processingStatus as string) || 'UPLOADED']}>{selectedDoc.processingStatus as string}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">File Name</p><p className="font-medium text-sm">{selectedDoc.fileName as string || 'N/A'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium text-sm">{selectedDoc.createdAt ? format(new Date(selectedDoc.createdAt as string), 'MMM d, yyyy') : 'N/A'}</p></div>
                </div>
                {(selectedDoc.processingStatus as string) === 'UPLOADED' && (
                  <Button onClick={() => processMutation.mutate(selectedDoc.id as string)} disabled={processMutation.isPending}>
                    <Play className="mr-2 h-4 w-4" />{processMutation.isPending ? 'Processing...' : 'Process Document'}
                  </Button>
                )}
                {selectedDoc.extractedText && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Extracted Text</p>
                    <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-thin font-mono border border-border/50">
                      {selectedDoc.extractedText as string}
                    </div>
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