'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Upload, Play, FolderOpen, Search, File, FileSpreadsheet, Loader2, LayoutGrid, List, X } from 'lucide-react'
import { format } from 'date-fns'
import { useAppStore } from '@/lib/store'
import { safeArray } from '@/lib/safe-array'

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

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt']
const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']

function getFileIcon(fileName: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <File className="h-4 w-4 text-rose-500" />
  if (ext === 'docx' || ext === 'doc') return <FileSpreadsheet className="h-4 w-4 text-teal-500" />
  if (ext === 'txt') return <FileText className="h-4 w-4 text-slate-500" />
  return <FileText className="h-4 w-4 text-muted-foreground" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

interface PolicyOption {
  id: string
  title: string
}

export default function DocumentsView() {
  const queryClient = useQueryClient()
  const user = useAppStore((s) => s.user)
  const [selectedDoc, setSelectedDoc] = useState<Record<string, unknown> | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formPolicyId, setFormPolicyId] = useState('')
  const [formVersion, setFormVersion] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetUploadForm = useCallback(() => {
    setSelectedFile(null)
    setFormTitle('')
    setFormPolicyId('')
    setFormVersion('')
    setFormDescription('')
    setFormDate('')
  }, [])

  const { data: docsData, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => fetch('/api/documents').then(r => r.json()),
    enabled: !!user,
  })
  const docs = safeArray(docsData)

  const { data: policiesData } = useQuery<PolicyOption[]>({
    queryKey: ['policies-list'],
    queryFn: () => fetch('/api/policies').then(r => r.json()),
    enabled: !!user,
  })
  const policies = safeArray<PolicyOption>(policiesData)

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document uploaded successfully')
      setUploadOpen(false)
      resetUploadForm()
    },
    onError: (err: Error) => toast.error(err.message),
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

  const validateFile = useCallback((file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.')
      return false
    }
    return true
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return
    setSelectedFile(file)
    // Auto-fill title from filename if empty
    if (!formTitle) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
      setFormTitle(nameWithoutExt)
    }
  }, [validateFile, formTitle])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }
    if (!formPolicyId) {
      toast.error('Please select a policy')
      return
    }
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', formTitle)
    formData.append('policyId', formPolicyId)
    if (formVersion) formData.append('version', formVersion)
    if (formDescription) formData.append('description', formDescription)
    if (formDate) formData.append('documentDate', formDate)
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

  // Status counts - computed from docs
  const statusCounts = (() => {
    const counts: Record<string, number> = { '': docs.length }
    for (const doc of docs as Record<string, unknown>[]) {
      const s = (doc.processingStatus as string) || 'UPLOADED'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  })()

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm">Manage policy documents and versions</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={uploadOpen} onOpenChange={(open) => {
            setUploadOpen(open)
            if (!open) resetUploadForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
                <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
                  {docs.length}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Document
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh] pr-4">
                <form onSubmit={handleUpload} className="space-y-4">
                  {/* Drag and Drop Zone */}
                  <div className="space-y-2">
                    <Label>File <span className="text-destructive">*</span></Label>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        relative flex flex-col items-center justify-center min-h-[200px] rounded-lg border-2 border-dashed p-6
                        transition-colors cursor-pointer
                        ${isDragOver
                          ? 'border-primary bg-primary/10'
                          : selectedFile
                            ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20'
                            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
                        }
                      `
                      }
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        className="hidden"
                        onChange={handleFileInput}
                      />

                      {selectedFile ? (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            {getFileIcon(selectedFile.name)}
                          </div>
                          <div className="text-left min-w-0">
                            <p className="font-medium truncate max-w-[280px]">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFile(null)
                              if (fileInputRef.current) fileInputRef.current.value = ''
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${isDragOver ? 'bg-primary/20' : 'bg-muted'}`}>
                            <Upload className={`h-6 w-6 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {isDragOver ? 'Drop your file here' : 'Drag & drop a file here'}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Supports PDF, DOCX, DOC, TXT
                          </p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        or browse files
                      </button>
                    </p>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-title">Title <span className="text-destructive">*</span></Label>
                    <Input
                      id="doc-title"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="Document title"
                      required
                    />
                  </div>

                  {/* Policy */}
                  <div className="space-y-2">
                    <Label>Policy <span className="text-destructive">*</span></Label>
                    <Select value={formPolicyId} onValueChange={setFormPolicyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a policy" />
                      </SelectTrigger>
                      <SelectContent>
                        {policies.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Version */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-version">Version</Label>
                    <Input
                      id="doc-version"
                      value={formVersion}
                      onChange={e => setFormVersion(e.target.value)}
                      placeholder="e.g. 2024-Amendment"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-desc">Description</Label>
                    <Textarea
                      id="doc-desc"
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      placeholder="Optional description..."
                      rows={2}
                    />
                  </div>

                  {/* Document Date */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-date">Document Date</Label>
                    <Input
                      id="doc-date"
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                    />
                  </div>

                  {/* Submit */}
                  <Button type="submit" className="w-full" disabled={uploadMutation.isPending || !selectedFile}>
                    {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
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
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {['', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED'].map(s => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="gap-1.5"
              >
                {s || 'All'}
                <Badge variant={statusFilter === s ? 'secondary' : 'outline'} className="h-4 min-w-[16px] px-1 text-[10px]">
                  {statusCounts[s] || 0}
                </Badge>
              </Button>
            ))}
          </div>
          <div className="hidden sm:flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
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
      ) : viewMode === 'grid' ? (
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
      ) : (
        <motion.div variants={container} className="space-y-2">
          {filteredDocs.map((doc: Record<string, unknown>) => (
            <motion.div key={doc.id as string} variants={item}>
              <Card
                className="hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedDoc(doc)}
              >
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    {(doc.processingStatus as string) === 'PROCESSING'
                      ? statusIcons.PROCESSING
                      : (doc.processingStatus as string) === 'FAILED'
                        ? statusIcons.FAILED
                        : getFileIcon(doc.fileName as string || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{(doc.policy as Record<string, unknown>)?.title || 'Untitled'}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{doc.fileName as string || 'No file'}</span>
                      <span>·</span>
                      <span>v{doc.version as string || 'N/A'}</span>
                      <span>·</span>
                      <span>{doc.createdAt ? format(new Date(doc.createdAt as string), 'MMM d, yyyy') : ''}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusColors[(doc.processingStatus as string) || 'UPLOADED']}>
                    {(doc.processingStatus as string) || 'UPLOADED'}
                  </Badge>
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