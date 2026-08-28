'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search, Download } from 'lucide-react'
import { format } from 'date-fns'

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  ANALYZE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
  APPROVE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400',
  REJECT: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  SEND: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400',
  LOGIN: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  VIEW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SEED: 'bg-primary/10 text-primary',
  PROCESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
}

export default function AuditLogView() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [search, setSearch] = useState('')

  const debouncedSearch = search

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, entityFilter, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (actionFilter) params.set('action', actionFilter)
      if (entityFilter) params.set('entityType', entityFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      return fetch(`/api/audit-logs?${params}`).then(r => r.json())
    },
  })

  const logs = data?.logs || []
  const totalPages = data?.totalPages || 1

  function exportCSV() {
    const esc = (s: string) => s.replace(/"/g, '""')
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor', 'Details']
    const rows = logs.map((log: Record<string, unknown>) => [
      log.createdAt ? format(new Date(log.createdAt as string), 'yyyy-MM-dd HH:mm') : '',
      log.action as string,
      log.entityType as string,
      log.entityId as string,
      (log.actor as Record<string, unknown>)?.name || 'System',
      log.metadata ? JSON.stringify(JSON.parse(log.metadata as string)).slice(0, 100) : '',
    ])
    const csvLines = [headers.join(','), ...rows.map(r => r.map(c => `"${esc(String(c))}"`).join(','))]
    const csv = csvLines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `policypulse-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit log exported to CSV')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground text-sm">Track all system activities</p>
        </div>
        {logs.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-3.5 w-3.5" />Export CSV
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            {['CREATE', 'UPDATE', 'DELETE', 'ANALYZE', 'APPROVE', 'REJECT', 'SEND', 'LOGIN', 'VIEW', 'SEED', 'PROCESS'].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={v => { setEntityFilter(v); setPage(1) }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Entity Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Entity Types</SelectItem>
            {['PolicyDocument', 'DocumentComparison', 'PolicyChange', 'Alert', 'User', 'UserProfile', 'Sector', 'PolicyCategory', 'Notification', 'System'].map(e => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Timestamp</TableHead>
                    <TableHead className="w-28">Action</TableHead>
                    <TableHead className="w-36">Entity</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No audit logs found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: Record<string, unknown>) => (
                        <TableRow key={log.id as string} className="hover:bg-muted/30">
                          <TableCell className="text-xs whitespace-nowrap">
                            {log.createdAt ? format(new Date(log.createdAt as string), 'MMM d, HH:mm') : ''}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={actionColors[(log.action as string)] || ''}>
                              {log.action as string}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium">{log.entityType as string}</span>
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">{log.entityId as string}</p>
                          </TableCell>
                          <TableCell className="text-xs">
                            {(log.actor as Record<string, unknown>)?.name || 'System'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {log.metadata ? JSON.stringify(JSON.parse(log.metadata as string)).slice(0, 60) : '-'}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
