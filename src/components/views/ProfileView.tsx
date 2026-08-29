'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { safeArray } from '@/lib/safe-array'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Save, ShieldCheck, Building2, Briefcase, Phone, UserCircle, Bell, Tag, Layers } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export default function ProfileView() {
  const user = useAppStore(s => s.user)
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => fetch('/api/profile').then(r => r.json()),
    enabled: !!user,
  })

  const { data: subsData } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => fetch('/api/subscriptions').then(r => r.json()),
    enabled: !!user,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
    enabled: !!user,
  })

  const formData = useMemo(() => {
    if (!profile) return { name: '', phone: '', jurisdiction: 'Uganda', businessType: '', employmentStatus: '', interests: '' }
    return {
      name: profile.user?.name || '',
      phone: profile.user?.phone || '',
      jurisdiction: profile.jurisdiction || 'Uganda',
      businessType: profile.businessType || '',
      employmentStatus: profile.employmentStatus || '',
      interests: Array.isArray(profile.interests) ? profile.interests.join(', ') : profile.interests || '',
    }
  }, [profile])

  const [localForm, setLocalForm] = useState(formData)

  useEffect(() => {
    setLocalForm(formData)
  }, [formData])

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, interests: data.interests.split(',').map(s => s.trim()).filter(Boolean) }),
      })
      if (!res.ok) throw new Error('Update failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profile updated successfully')
    },
    onError: () => toast.error('Update failed'),
  })

  const sectors = safeArray<Record<string, unknown>>(subsData?.sectors)
  const categories = safeArray<Record<string, unknown>>(categoriesData?.categories)
  const userSectorIds = sectors.map((s: Record<string, unknown>) => (s.sector as Record<string, unknown>)?.id)
  const userSubIds = safeArray<Record<string, unknown>>(subsData?.subscriptions).map(s => s.referenceId)

  function toggleSector(sectorId: string) {
    const isActive = userSectorIds.includes(sectorId)
    fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionType: 'SECTOR', referenceId: sectorId, active: !isActive }),
    }).then(() => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }))
  }

  function toggleCategory(catId: string) {
    const isActive = userSubIds.includes(catId)
    fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionType: 'CATEGORY', referenceId: catId, active: !isActive }),
    }).then(() => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }))
  }

  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-64 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div>

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account and subscriptions</p>
      </div>

      {/* Profile Header Card */}
      <motion.div variants={item}>
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-teal-500/20" />
          <CardContent className="p-6 -mt-10 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground border-4 border-background shadow-lg">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{user?.name || 'User'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">{user?.email}</span>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto border-primary/30 text-primary gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />{user?.role}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><UserCircle className="h-4 w-4 text-primary" /> Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-xs">Full Name</Label>
                <Input id="profile-name" value={localForm.name} onChange={e => setLocalForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone" className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                <Input id="profile-phone" value={localForm.phone} onChange={e => setLocalForm(p => ({ ...p, phone: e.target.value }))} placeholder="+256 700 000 000" />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-jurisdiction" className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Jurisdiction</Label>
                  <Input id="profile-jurisdiction" value={localForm.jurisdiction} onChange={e => setLocalForm(p => ({ ...p, jurisdiction: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-business" className="text-xs flex items-center gap-1"><Briefcase className="h-3 w-3" /> Business Type</Label>
                  <Input id="profile-business" value={localForm.businessType} onChange={e => setLocalForm(p => ({ ...p, businessType: e.target.value }))} placeholder="e.g. SME" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-employment" className="text-xs">Employment Status</Label>
                <Input id="profile-employment" value={localForm.employmentStatus} onChange={e => setLocalForm(p => ({ ...p, employmentStatus: e.target.value }))} placeholder="e.g. Employed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-interests" className="text-xs">Interests (comma-separated)</Label>
                <Input id="profile-interests" value={localForm.interests} onChange={e => setLocalForm(p => ({ ...p, interests: e.target.value }))} placeholder="tax-policy, data-protection" />
              </div>
              <Button onClick={() => updateMutation.mutate(localForm)} disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />{updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Sector Subscriptions</CardTitle>
              <CardDescription>Subscribe to sectors to receive relevant alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-52 overflow-y-auto scrollbar-thin space-y-1">
                {safeArray<Record<string, unknown>>(categoriesData?.sectors).map((sector: Record<string, unknown>) => {
                  const isSubbed = userSectorIds.includes(sector.id as string)
                  return (
                    <label key={sector.id as string} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                      <Checkbox checked={isSubbed} onCheckedChange={() => toggleSector(sector.id as string)} />
                      <span className="text-sm flex-1">{sector.name as string}</span>
                      {isSubbed && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Category Subscriptions</CardTitle>
              <CardDescription>Follow specific policy categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-52 overflow-y-auto scrollbar-thin space-y-1">
                {categories.map((cat: Record<string, unknown>) => {
                  const isSubbed = userSubIds.includes(cat.id as string)
                  return (
                    <label key={cat.id as string} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                      <Checkbox checked={isSubbed} onCheckedChange={() => toggleCategory(cat.id as string)} />
                      <span className="text-sm flex-1">{cat.name as string}</span>
                      <span className="text-xs text-muted-foreground">{(cat._count as Record<string, number>)?.policies || 0}</span>
                      {isSubbed && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
