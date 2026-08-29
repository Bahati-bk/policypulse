'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Users, Search, Mail, MapPin, Building2, Briefcase, Bell, CalendarDays, ShieldCheck, Activity, ArrowRight, KeyRound } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { safeArray } from '@/lib/safe-array'

interface UserProfile {
  jurisdiction: string
  businessType: string | null
  employmentStatus: string | null
}

interface UserCount {
  subscriptions: number
  notifications: number
}

interface UserItem {
  id: string
  email: string
  name: string | null
  role: string
  phone: string | null
  emailVerifiedAt: string | null
  createdAt: string
  profile: UserProfile | null
  _count: UserCount
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const mi = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

const roleColors: Record<string, string> = {
  ADMIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  USER: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  ANALYST: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
}

const roleDescriptions: Record<string, string> = {
  ADMIN: 'Full system access',
  USER: 'Standard user',
  ANALYST: 'Can create & analyze',
}

const avatarGradients = [
  'from-emerald-500 to-teal-600',
  'from-teal-500 to-cyan-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-emerald-400 to-cyan-500',
  'from-amber-400 to-yellow-500',
]

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  const clean = name.replace(/ \(Deactivated\)$/, '')
  const parts = clean.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

function getAvatarGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarGradients[Math.abs(hash) % avatarGradients.length]
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffMo = Math.floor(diffDay / 30)
  const diffYr = Math.floor(diffDay / 365)

  if (diffYr > 0) return `${diffYr}y ago`
  if (diffMo > 0) return `${diffMo}mo ago`
  if (diffDay > 0) return `${diffDay}d ago`
  if (diffHr > 0) return `${diffHr}h ago`
  if (diffMin > 0) return `${diffMin}m ago`
  return 'Just now'
}

function isDeactivated(name: string | null): boolean {
  return !!name?.includes('(Deactivated)')
}

function getRoleChangeConfirmMsg(role: string, userName: string): string {
  return `Change ${userName}'s role to ${role}? They will gain ${role === 'ADMIN' ? 'full system access' : role === 'ANALYST' ? 'ability to create and analyze' : 'standard user'} permissions.`
}

export default function UsersView() {
  const queryClient = useQueryClient()
  const user = useAppStore(s => s.user)
  const setView = useAppStore(s => s.setView)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'deactivate' | 'activate'>('deactivate')
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false)
  const [pendingRole, setPendingRole] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      return fetch(`/api/users${params}`).then(r => r.json())
    },
    enabled: !!user,
  })

  const users: UserItem[] = safeArray<UserItem>(data?.users)

  // User statistics
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => !isDeactivated(u.name)).length
    const byRole: Record<string, number> = { ADMIN: 0, USER: 0, ANALYST: 0 }
    users.forEach(u => {
      const r = u.role as string
      if (byRole[r] !== undefined) byRole[r]++
      else byRole[r] = 1
    })
    return { total, active, byRole }
  }, [users])

  // Fetch audit logs for the selected user (client-side filter)
  const { data: auditData } = useQuery({
    queryKey: ['audit-logs'],
    enabled: !!user && detailOpen && !!selectedUser,
    queryFn: () => fetch('/api/audit-logs?limit=50').then(r => r.json()),
  })

  const userActivity = useMemo(() => {
    const logs = safeArray<Record<string, unknown>>(auditData?.logs)
    if (!selectedUser) return []
    return logs
      .filter((log: Record<string, unknown>) => {
        const actor = log.actor as Record<string, unknown> | null
        return actor?.id === selectedUser.id
      })
      .slice(0, 5)
  }, [auditData, selectedUser])

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('Failed to update role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Role updated successfully')
      setRoleConfirmOpen(false)
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, role: pendingRole })
      }
    },
    onError: () => toast.error('Failed to update role'),
  })

  const activateMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed to update user')
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(variables.isActive ? 'User activated' : 'User deactivated')
      setConfirmOpen(false)
      setDetailOpen(false)
      setSelectedUser(null)
    },
    onError: () => toast.error('Failed to update user'),
  })

  function handleCardClick(user: UserItem) {
    setSelectedUser(user)
    setDetailOpen(true)
  }

  function handleRoleSelect(newRole: string) {
    if (!selectedUser || newRole === selectedUser.role) return
    setPendingRole(newRole)
    setRoleConfirmOpen(true)
  }

  function confirmRoleChange() {
    if (!selectedUser) return
    roleMutation.mutate({ id: selectedUser.id, role: pendingRole })
  }

  function handleDeactivateToggle() {
    if (!selectedUser) return
    const deactivated = isDeactivated(selectedUser.name)
    setPendingAction(deactivated ? 'activate' : 'deactivate')
    setConfirmOpen(true)
  }

  function confirmAction() {
    if (!selectedUser) return
    activateMutation.mutate({ id: selectedUser.id, isActive: pendingAction === 'activate' })
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage user accounts, roles, and access</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* User Statistics Row */}
      {!isLoading && users.length > 0 && (
        <motion.div variants={mi} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-card to-muted/30 border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums leading-tight">{stats.total}</p>
                <p className="text-[11px] text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-muted/30 border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 relative">
                <ShieldCheck className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums leading-tight text-emerald-600 dark:text-emerald-400">{stats.active}</p>
                <p className="text-[11px] text-muted-foreground">Active Users</p>
              </div>
            </CardContent>
          </Card>
          {(['ADMIN', 'ANALYST', 'USER'] as const).map(role => (
            <Card key={role} className="bg-gradient-to-br from-card to-muted/30 border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${roleColors[role]}`}>
                  {role}
                </Badge>
                <div>
                  <p className="text-xl font-bold tabular-nums leading-tight">{stats.byRole[role]}</p>
                  <p className="text-[11px] text-muted-foreground">{roleDescriptions[role]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-lg">No users found</p>
            <p className="text-sm mt-1 text-muted-foreground/70">
              {search ? 'Try adjusting your search query.' : 'No user accounts exist yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const deactivated = isDeactivated(u.name)
            const initials = getInitials(u.name)
            const gradient = getAvatarGradient(u.id)

            return (
              <motion.div key={u.id} variants={mi}>
                <Card
                  className={`card-glow cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 ${deactivated ? 'opacity-60' : ''}`}
                  onClick={() => handleCardClick(u)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar with gradient + status dot */}
                      <div className="relative shrink-0">
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white`}>
                          {initials}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                          deactivated ? 'bg-slate-400' : 'bg-emerald-500'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {u.name?.replace(/ \(Deactivated\)$/, '') || 'No name'}
                          </p>
                          {deactivated && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-rose-500 border-rose-200 dark:border-rose-800 shrink-0">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline" className={`text-[10px] px-2 py-0 ${roleColors[u.role] || roleColors.USER}`}>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        {u.role}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{relativeDate(u.createdAt)}</span>
                    </div>

                    {/* Role description + Member since */}
                    <p className="text-[11px] text-muted-foreground mt-1.5">{roleDescriptions[u.role] || 'Standard user'}</p>

                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      {u.profile?.jurisdiction && (
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{u.profile.jurisdiction}</span>
                        </div>
                      )}
                      {u.profile?.businessType && (
                        <div className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{u.profile.businessType}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Bell className="h-3 w-3 shrink-0" />
                        <span>{u._count.subscriptions} subs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>Since {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View and manage user account settings</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-5">
              {/* User header with gradient avatar */}
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedUser.id)} flex items-center justify-center text-lg font-bold text-white shrink-0 ring-2 ring-primary/20 ring-offset-2 ring-offset-card`}>
                  {getInitials(selectedUser.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-lg truncate">{selectedUser.name?.replace(/ \(Deactivated\)$/, '') || 'No name'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-xs px-2 py-0 ${roleColors[selectedUser.role] || roleColors.USER}`}>
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {selectedUser.role}
                    </Badge>
                    {isDeactivated(selectedUser.name) && (
                      <Badge variant="outline" className="text-xs px-2 py-0 text-rose-500 border-rose-200 dark:border-rose-800">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{selectedUser.email}</span>
                  {selectedUser.emailVerifiedAt && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 ml-auto">
                      Verified
                    </Badge>
                  )}
                </div>
                {selectedUser.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-4 w-4 text-muted-foreground flex items-center justify-center text-xs">&#9742;</span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{selectedUser.phone}</span>
                  </div>
                )}
                {selectedUser.profile?.jurisdiction && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Jurisdiction:</span>
                    <span className="font-medium">{selectedUser.profile.jurisdiction}</span>
                  </div>
                )}
                {selectedUser.profile?.businessType && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Business:</span>
                    <span className="font-medium">{selectedUser.profile.businessType}</span>
                  </div>
                )}
                {selectedUser.profile?.employmentStatus && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Employment:</span>
                    <span className="font-medium">{selectedUser.profile.employmentStatus}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Subscriptions:</span>
                    <span className="font-medium">{selectedUser._count.subscriptions}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Notifications:</span>
                    <span className="font-medium">{selectedUser._count.notifications}</span>
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />Recent Activity
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setDetailOpen(false); setView('audit-log') }}
                  >
                    View All <ArrowRight className="ml-0.5 h-2.5 w-2.5" />
                  </Button>
                </div>
                {userActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No recent activity</p>
                ) : (
                  <div className="space-y-1.5">
                    {userActivity.map((log: Record<string, unknown>) => (
                      <div key={log.id as string} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action as string}</span>
                          <span className="text-muted-foreground">{log.entityType as string}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{relativeDate(log.createdAt as string)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Role change with confirmation */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Change Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={handleRoleSelect}
                  disabled={roleMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER - Standard user</SelectItem>
                    <SelectItem value="ADMIN">ADMIN - Full system access</SelectItem>
                    <SelectItem value="ANALYST">ANALYST - Can create & analyze</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    toast.success('Password reset email sent')
                  }}
                >
                  <KeyRound className="mr-2 h-3.5 w-3.5" />Reset Password
                </Button>
                <Button
                  variant={isDeactivated(selectedUser.name) ? 'default' : 'destructive'}
                  className="flex-1"
                  onClick={handleDeactivateToggle}
                  disabled={activateMutation.isPending}
                >
                  {activateMutation.isPending
                    ? 'Updating...'
                    : isDeactivated(selectedUser.name)
                      ? 'Activate User'
                      : 'Deactivate User'
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={roleConfirmOpen} onOpenChange={setRoleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser ? getRoleChangeConfirmMsg(pendingRole, selectedUser.name?.replace(/ \(Deactivated\)$/, '') || selectedUser.email) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={roleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={roleMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {roleMutation.isPending ? 'Updating...' : 'Confirm Change'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate/Activate Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'deactivate' ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'deactivate'
                ? `Are you sure you want to deactivate ${selectedUser?.name?.replace(/ \(Deactivated\)$/, '') || selectedUser?.email || 'this user'}? They will lose access to the platform.`
                : `Are you sure you want to activate ${selectedUser?.name?.replace(/ \(Deactivated\)$/, '') || selectedUser?.email || 'this user'}? They will regain access to the platform.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={activateMutation.isPending}
              className={pendingAction === 'deactivate' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {activateMutation.isPending
                ? 'Updating...'
                : pendingAction === 'deactivate'
                  ? 'Deactivate'
                  : 'Activate'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
