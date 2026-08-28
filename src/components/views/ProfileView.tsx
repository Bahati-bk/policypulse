'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Mail, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function ProfileView() {
  const user = useAppStore(s => s.user)
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => fetch('/api/profile').then(r => r.json()),
  })

  const { data: subsData } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => fetch('/api/subscriptions').then(r => r.json()),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
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
      toast.success('Profile updated')
    },
    onError: () => toast.error('Update failed'),
  })

  const sectors = (subsData?.sectors || [])
  const categories = (categoriesData?.categories || [])
  const userSectorIds = sectors.map((s: Record<string, unknown>) => (s.sector as Record<string, unknown>)?.id)
  const userSubIds = ((subsData?.subscriptions || []) as Array<Record<string, unknown>>).map(s => s.referenceId)

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

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-64 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div>

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account and subscriptions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Email (read-only)</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {user?.email}
                  <Badge variant="outline" className="text-[10px]">{user?.role}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input id="profile-name" value={localForm.name} onChange={e => setLocalForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input id="profile-phone" value={localForm.phone} onChange={e => setLocalForm(p => ({ ...p, phone: e.target.value }))} placeholder="+256 700 000 000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-jurisdiction">Jurisdiction</Label>
                  <Input id="profile-jurisdiction" value={localForm.jurisdiction} onChange={e => setLocalForm(p => ({ ...p, jurisdiction: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-business">Business Type</Label>
                  <Input id="profile-business" value={localForm.businessType} onChange={e => setLocalForm(p => ({ ...p, businessType: e.target.value }))} placeholder="e.g. SME" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-employment">Employment Status</Label>
                <Input id="profile-employment" value={localForm.employmentStatus} onChange={e => setLocalForm(p => ({ ...p, employmentStatus: e.target.value }))} placeholder="e.g. Employed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-interests">Interests (comma-separated)</Label>
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
              <CardTitle className="text-base">Sector Subscriptions</CardTitle>
              <CardDescription>Subscribe to sectors to receive relevant alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-2">
                {categoriesData?.sectors?.map((sector: Record<string, unknown>) => {
                  const isSubbed = userSectorIds.includes(sector.id as string)
                  return (
                    <label key={sector.id as string} className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <Checkbox checked={isSubbed} onCheckedChange={() => toggleSector(sector.id as string)} />
                      <span className="text-sm">{sector.name as string}</span>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Subscriptions</CardTitle>
              <CardDescription>Follow specific policy categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-2">
                {categories.map((cat: Record<string, unknown>) => {
                  const isSubbed = userSubIds.includes(cat.id as string)
                  return (
                    <label key={cat.id as string} className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <Checkbox checked={isSubbed} onCheckedChange={() => toggleCategory(cat.id as string)} />
                      <span className="text-sm">{cat.name as string}</span>
                      <span className="text-xs text-muted-foreground">({(cat._count as Record<string, number>)?.policies || 0})</span>
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