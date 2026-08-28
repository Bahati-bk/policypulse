'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText, GitCompare, Bell, Users, Upload, Plus, ArrowRight,
  Activity, BookOpen, ScrollText, TrendingUp, TrendingDown,
  Zap, Clock, CheckCircle2, ShieldCheck, BarChart3, PieChart as PieChartIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function getSeverityColor(name: string) {
  const colors: Record<string, string> = {
    LOW: 'var(--chart-4)',
    MEDIUM: 'var(--chart-3)',
    HIGH: 'var(--chart-5)',
  }
  return colors[name] || '#888'
}

function getAlertStatusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    PENDING_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    SENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  }
  return map[status] || 'bg-muted text-muted-foreground'
}

function getActivityColor(action: string) {
  const map: Record<string, string> = {
    CREATE: 'bg-emerald-500',
    UPDATE: 'bg-amber-500',
    APPROVE: 'bg-teal-500',
    SEND: 'bg-teal-400',
    DELETE: 'bg-rose-500',
    REJECT: 'bg-rose-500',
    ANALYZE: 'bg-amber-400',
    LOGIN: 'bg-slate-400',
    SEED: 'bg-primary',
    PROCESS: 'bg-amber-400',
    VIEW: 'bg-muted-foreground',
  }
  return map[action] || 'bg-muted-foreground'
}

const policyTypeColors: Record<string, string> = {
  ACT: 'var(--chart-1)',
  REGULATION: 'var(--chart-2)',
  GUIDELINE: 'var(--chart-3)',
  POLICY: 'var(--chart-4)',
  DIRECTIVE: 'var(--chart-5)',
}

export default function DashboardView() {
  const setView = useAppStore(s => s.setView)
  const user = useAppStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'

  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then(r => r.json()),
  })

  const { data: alertsData } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => fetch('/api/alerts').then(r => r.json()),
  })

  const { data: policiesData } = useQuery({
    queryKey: ['policies-dashboard'],
    queryFn: () => fetch('/api/policies').then(r => r.json()),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-dashboard'],
    queryFn: () => fetch('/api/categories').then(r => r.json()),
  })

  const stats = data?.stats || { policies: 0, documents: 0, comparisons: 0, pendingAlerts: 0, users: 0 }
  const recentActivity = data?.recentActivity || []
  const severityDist = data?.severityDistribution || []
  const recentAlerts = (alertsData?.alerts || []).slice(0, 3)
  const totalChanges = severityDist.reduce((sum: number, e: Record<string, number>) => sum + (e.value || 0), 0)

  // Policy type distribution
  const policies: Array<Record<string, unknown>> = policiesData || []
  const policyTypeDist = policies.reduce<Record<string, number>>((acc, p) => {
    const t = (p.policyType as string) || 'OTHER'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})
  const policyTypeChartData = Object.entries(policyTypeDist).map(([name, value]) => ({ name, value }))
  const totalPolicies = policies.length

  // Category policy counts for bar chart
  const categories: Array<Record<string, unknown>> = categoriesData?.categories || []
  const categoryBarData = categories
    .map(c => ({
      name: (c.name as string).length > 15 ? (c.name as string).slice(0, 14) + '…' : (c.name as string),
      policies: (c._count as Record<string, number>)?.policies || 0,
    }))
    .filter(c => c.policies > 0)
    .slice(0, 6)

  const overviewMetrics = [
    { label: 'Changes This Month', value: String(totalChanges), icon: <Zap className="h-4 w-4 text-amber-500" />, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Avg. Confidence', value: '87%', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Response Time', value: '< 2hrs', icon: <Clock className="h-4 w-4 text-teal-500" />, color: 'text-teal-600 dark:text-teal-400' },
  ]

  const statCards = [
    { label: 'Policies', value: stats.policies, icon: <FileText className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500', bg: 'from-emerald-500/5 to-transparent', up: true },
    { label: 'Documents', value: stats.documents, icon: <BookOpen className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400', border: 'border-l-teal-500', bg: 'from-teal-500/5 to-transparent', up: true },
    { label: 'Comparisons', value: stats.comparisons, icon: <GitCompare className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500', bg: 'from-amber-500/5 to-transparent', up: true },
    { label: 'Pending Alerts', value: stats.pendingAlerts, icon: <Bell className="h-4 w-4" />, color: 'text-rose-600 dark:text-rose-400', border: 'border-l-rose-500', bg: 'from-rose-500/5 to-transparent', up: false },
    { label: 'Users', value: stats.users, icon: <Users className="h-4 w-4" />, color: 'text-violet-600 dark:text-violet-400', border: 'border-l-violet-500', bg: 'from-violet-500/5 to-transparent', up: true },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome Banner with animated gradient border */}
      <motion.div variants={item}>
        <div className="relative rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-teal-500/10 animate-pulse opacity-60" style={{ animationDuration: '4s' }} />
          <div className="relative border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {getGreeting()}, {user?.name || 'User'}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Here is what is happening with Uganda&apos;s policy landscape today.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overview Metrics Row */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        {overviewMetrics.map(m => (
          <Card key={m.label} className="bg-gradient-to-br from-card to-muted/30 border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${m.color}`}>{m.icon}</div>
              <div className="min-w-0">
                <p className="text-lg font-bold tabular-nums leading-tight">{m.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Top Action Buttons */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setView('documents')}><Upload className="mr-2 h-3.5 w-3.5" />Upload Document</Button>
          <Button size="sm" variant="outline" onClick={() => setView('comparisons')}><Plus className="mr-2 h-3.5 w-3.5" />New Comparison</Button>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium">Ctrl+K</kbd> to search</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={container} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(s => (
          <motion.div key={s.label} variants={item}>
            <Card className={`hover:shadow-md transition-all border-l-4 ${s.border} bg-gradient-to-br ${s.bg} group`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`${s.color} transition-transform group-hover:scale-110`}>{s.icon}</div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 rounded" />
                  ) : (
                    <span className="text-2xl font-bold tabular-nums">{s.value}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Policy Type Distribution */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" /> Policy Types
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {policyTypeChartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="h-52 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={policyTypeChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                        {policyTypeChartData.map((entry) => (
                          <Cell key={entry.name} fill={policyTypeColors[entry.name] || 'var(--chart-4)'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-xl font-bold tabular-nums">{totalPolicies}</p>
                      <p className="text-[10px] text-muted-foreground">policies</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                    {policyTypeChartData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: policyTypeColors[entry.name] || '#888' }} />
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Bar Chart */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Policies by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {categoryBarData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBarData} margin={{ top: 5, right: 5, bottom: 25, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="policies" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded mb-2" />)
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Activity className="h-7 w-7 opacity-40" />
                    </div>
                    <p className="font-medium text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Activity will appear here as you use the platform.</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-1">
                      {recentActivity.map((log: Record<string, unknown>) => (
                        <div key={log.id as string} className="flex items-start gap-3 text-sm relative">
                          <div className={`mt-1.5 h-[15px] w-[15px] rounded-full border-2 border-background shrink-0 z-10 ${getActivityColor(log.action as string)}`} />
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{log.action as string}</span>
                              <Badge variant="outline" className="text-[10px] font-normal">{log.entityType as string}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(log.actor as Record<string, unknown>)?.name || 'System'} &middot; {formatDistanceToNow(new Date(log.createdAt as string), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={item} className="space-y-6">
          {/* Severity Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {severityDist.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityDist} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={4} dataKey="value">
                        {severityDist.map((entry: Record<string, string>) => (
                          <Cell key={entry.name} fill={getSeverityColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-xl font-bold tabular-nums">{totalChanges}</p>
                      <p className="text-[10px] text-muted-foreground">changes</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-3 mt-1">
                    {severityDist.map((entry: Record<string, string>) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getSeverityColor(entry.name) }} />
                        {entry.name} ({entry.value})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {[
                { icon: <Upload className="h-4 w-4" />, label: 'Upload Document', view: 'documents' as const },
                { icon: <Plus className="h-4 w-4" />, label: 'New Comparison', view: 'comparisons' as const },
                { icon: <ArrowRight className="h-4 w-4" />, label: 'View Alerts', view: 'alerts' as const },
                { icon: <BookOpen className="h-4 w-4" />, label: 'Browse Policies', view: 'policies' as const },
                ...(isAdmin ? [{ icon: <ScrollText className="h-4 w-4" />, label: 'View Audit Log', view: 'audit-log' as const }] : []),
              ].map(action => (
                <Button key={action.view} variant="outline" className="w-full justify-start hover:bg-accent/80 transition-colors" onClick={() => setView(action.view)}>
                  {action.icon}<span className="mr-2" />{action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Alerts Section */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Recent Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView('alerts')}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentAlerts.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="font-medium text-sm">No alerts yet</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">Alerts will appear when policy changes are detected and reviewed.</p>
                </div>
              ) : (
                recentAlerts.map((alert: Record<string, unknown>) => (
                  <div key={alert.id as string} className="rounded-lg border border-border/50 p-3 hover:bg-accent/50 hover:border-border transition-all cursor-pointer group" onClick={() => setView('alerts')}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate flex-1 group-hover:text-primary transition-colors">{alert.title as string}</p>
                      <Badge className={`shrink-0 text-[10px] ${getAlertStatusColor(alert.status as string)}`}>
                        {(alert.status as string).replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(alert.createdAt as string), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
