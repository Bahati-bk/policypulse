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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Upload, Play, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  UPLOADED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  VALIDATING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function DocumentsView() {
  const setView = useAppStore(s => s.setView)
  const queryClient = useQueryClient()
  const [selectedDoc, setSelectedDoc] = useState<Record<string, unknown> | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

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
      toast.success('Document uploaded')
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
      toast.success('Document processed')
    },
    onError: () => toast.error('Processing failed'),
  })

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    uploadMutation.mutate(formData)
  }

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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No documents yet. Upload your first document.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} className="grid gap-4 md:grid-cols-2">
          {docs.map((doc: Record<string, unknown>) => (
            <motion.div key={doc.id as string} variants={item}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
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
                    <span>{doc.fileName as string || 'No file'}</span>
                    <span>·</span>
                    <span>{doc.createdAt ? format(new Date(doc.createdAt as string), 'MMM d, yyyy') : ''}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
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
                </div>
                {(selectedDoc.processingStatus as string) === 'UPLOADED' && (
                  <Button onClick={() => processMutation.mutate(selectedDoc.id as string)} disabled={processMutation.isPending}>
                    <Play className="mr-2 h-4 w-4" />{processMutation.isPending ? 'Processing...' : 'Process Document'}
                  </Button>
                )}
                {selectedDoc.extractedText && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Extracted Text</p>
                    <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-thin font-mono">
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