'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, FolderOpen, Tags, Layers, FileText, Users } from 'lucide-react'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const mi = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function CategoriesView() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<'category' | 'sector'>('category')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
  })

  const categories: Record<string, unknown>[] = data?.categories || []
  const sectors: Record<string, unknown>[] = data?.sectors || []

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: createType, name: newName, description: newDesc }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-admin'] })
      toast.success(`${createType === 'sector' ? 'Sector' : 'Category'} created`)
      setCreateOpen(false)
      setNewName('')
      setNewDesc('')
    },
    onError: () => toast.error('Failed to create'),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, type, active }: { id: string; type: string; active: boolean }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, active }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-admin'] })
    },
  })

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories &amp; Sectors</h1>
          <p className="text-muted-foreground text-sm">Organize policies by category and sector</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create {createType === 'sector' ? 'Sector' : 'Category'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" variant={createType === 'category' ? 'default' : 'outline'} onClick={() => setCreateType('category')}>
                  <Tags className="mr-1.5 h-3.5 w-3.5" />Category
                </Button>
                <Button size="sm" variant={createType === 'sector' ? 'default' : 'outline'} onClick={() => setCreateType('sector')}>
                  <Layers className="mr-1.5 h-3.5 w-3.5" />Sector
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={createType === 'sector' ? 'e.g. Agriculture' : 'e.g. Tax Policy'} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description..." />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!newName || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-32 rounded-lg" /><Skeleton className="h-32 rounded-lg" /></div>
      ) : (
        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories" className="gap-1.5">
              <Tags className="h-3.5 w-3.5" />Categories ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="sectors" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />Sectors ({sectors.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="space-y-3 mt-4">
            {categories.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground"><FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No categories yet</p><p className="text-xs mt-1 text-muted-foreground/70">Create your first category to organize policies.</p></CardContent></Card>
            ) : categories.map((cat: Record<string, unknown>) => (
              <motion.div key={cat.id} variants={mi}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Tags className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{cat.name as string}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{(cat._count as Record<string, number>)?.policies || 0} policies</span>
                          {(cat.description as string) && <span>· {(cat.description as string).slice(0, 40)}{(cat.description as string).length > 40 ? '...' : ''}</span>}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={cat.active as boolean}
                      onCheckedChange={(active) => toggleMutation.mutate({ id: cat.id as string, type: 'category', active })}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
          <TabsContent value="sectors" className="space-y-3 mt-4">
            {sectors.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground"><FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No sectors yet</p></CardContent></Card>
            ) : sectors.map((sector: Record<string, unknown>) => (
              <motion.div key={sector.id} variants={mi}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                        <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{sector.name as string}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{(sector._count as Record<string, number>)?.users || 0} subscribers</span>
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={sector.active as boolean}
                      onCheckedChange={(active) => toggleMutation.mutate({ id: sector.id as string, type: 'sector', active })}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  )
}
