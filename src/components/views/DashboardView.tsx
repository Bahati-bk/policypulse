'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import OnboardingBanner from '@/components/OnboardingBanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText, GitCompare, Bell, Users, Upload, Plus, ArrowRight,
  Activity, BookOpen, ScrollText, TrendingUp,
  Zap, Clock, CheckCircle2, ShieldCheck, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, ArrowUpRight,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }

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

function getActivityIcon(action: string) {
  if (action === 'CREATE' || action === 'SEED') return '✨'
  if (action === 'UPDATE' || action === 'APPROVE') return '🔄'
  if (action === 'ANALYZE' || action === 'PROCESS') return '🧠'
  if (action === 'LOGIN') return '🔑'
  if (action === 'SEND') return '📤'
  if (action === 'VIEW') return '👁'
  if (action === 'DELETE' || action === 'REJECT') return '❌'
  return '📌'
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
  const activityTrend = data?.activityTrend || []
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

  // Format trend data for display
  const trendChartData = activityTrend.map((d: Record<string, number>) => ({
    ...d,
    label: format(new Date(d.date + 'T00:00:00'), 'MMM d'),
  }))

  const overviewMetrics = [
    { label: 'Changes This Month', value: String(totalChanges), icon: <Zap className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Avg. Confidence', value: '87%', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Response Time', value: '< 2hrs', icon: <Clock className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
  ]

  const statCards = [
    { label: 'Policies', value: stats.policies, icon: <FileText className="h-5 w-5" />, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500', bg: 'from-emerald-500/5 to-transparent', trend: '+2 this week' },
    { label: 'Documents', value: stats.documents, icon: <BookOpen className="h-5 w-5" />, color: 'text-teal-600 dark:text-teal-400', border: 'border-l-teal-500', bg: 'from-teal-500/5 to-transparent', trend: '+1 today' },
    { label: 'Comparisons', value: stats.comparisons, icon: <GitCompare className="h-5 w-5" />, color: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500', bg: 'from-amber-500/5 to-transparent', trend: 'All complete' },
    { label: 'Pending Alerts', value: stats.pendingAlerts, icon: <Bell className="h-5 w-5" />, color: 'text-rose-600 dark:text-rose-400', border: 'border-l-rose-500', bg: 'from-rose-500/5 to-transparent', trend: stats.pendingAlerts > 0 ? 'Needs review' : 'All clear' },
    { label: 'Users', value: stats.users, icon: <Users className="h-5 w-5" />, color: 'text-violet-600 dark:text-violet-400', border: 'border-l-violet-500', bg: 'from-violet-500/5 to-transparent', trend: '2 admins' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Onboarding Banner for first-time users */}
      <OnboardingBanner />

      {/* Welcome Banner */}
      <motion.div variants={item}>
        <div className="relative rounded-2xl overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-teal-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative border border-primary/20 bg-gradient-to-r from-primary/[0.06] via-primary/[0.1] to-teal-500/[0.06] px-6 py-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary/20">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {getGreeting()}, {user?.name || 'User'}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Here is what is happening with Uganda&apos;s policy landscape today.
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button size="sm" onClick={() => setView('documents')} className="gap-2">
                  <Upload className="h-3.5 w-3.5" />Upload Document
                </Button>
                <Button size="sm" variant="outline" onClick={() => setView('comparisons')} className="gap-2">
                  <Plus className="h-3.5 w-3.5" />Compare
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overview Metrics + Mobile Actions */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        {overviewMetrics.map(m => (
          <Card key={m.label} className="bg-gradient-to-br from-card to-muted/30 border-border/40 hover:border-border/70 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${m.bg} flex items-center justify-center ${m.color} shrink-0`}>
                {m.icon}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold tabular-nums leading-tight">{m.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={container} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map(s => (
          <motion.div key={s.label} variants={item}>
            <Card className={`hover:shadow-lg hover:shadow-black/5 transition-all duration-300 border-l-4 ${s.border} bg-gradient-to-br ${s.bg} group cursor-default`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`transition-transform duration-300 group-hover:scale-110 ${s.color}`}>{s.icon}</div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 rounded" />
                  ) : (
                    <span className="text-2xl font-bold tabular-nums">{s.value}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">{s.label}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{s.trend}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Activity Trend Line Chart - NEW */}
        <motion.div variants={item}>
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-primary" /> Activity Trend
                <Badge variant="outline" className="text-[10px] ml-auto font-normal">Last 14 days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {trendChartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No activity data</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Area type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} fill="url(#trendGradient)" dot={false} activeDot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--card)', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Policy Type Distribution */}
        <motion.div variants={item}>
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" /> Policy Types
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {policyTypeChartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={policyTypeChartData} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {policyTypeChartData.map((entry) => (
                          <Cell key={entry.name} fill={policyTypeColors[entry.name] || 'var(--chart-4)'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">{totalPolicies}</p>
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
      </div>

      {/* Category Bar Chart + Severity Row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Category Bar Chart - 2 cols */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
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
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar dataKey="policies" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Severity Distribution - 1 col */}
        <motion.div variants={item}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {severityDist.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="h-52 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityDist} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={4} dataKey="value">
                        {severityDist.map((entry: Record<string, string>) => (
                          <Cell key={entry.name} fill={getSeverityColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">{totalChanges}</p>
                      <p className="text-[10px] text-muted-foreground">changes</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-center gap-4 mt-2">
                {severityDist.map((entry: Record<string, string>) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getSeverityColor(entry.name) }} />
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-muted-foreground">({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity Timeline + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Activity Timeline */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Recent Activity
                </CardTitle>
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setView('audit-log')}>
                    View All <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg mb-2" />)
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Activity className="h-7 w-7 opacity-40" />
                    </div>
                    <p className="font-medium text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Activity will appear here as you use the platform.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />
                    <div className="space-y-1">
                      {recentActivity.map((log: Record<string, unknown>, i: number) => (
                        <motion.div
                          key={log.id as string}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.25 }}
                          className="flex items-start gap-3 text-sm relative group"
                        >
                          <div className="relative mt-1 shrink-0">
                            <div className={`h-[30px] w-[30px] rounded-full border-2 border-background flex items-center justify-center z-10 ${getActivityColor(log.action as string)}`}>
                              <span className="text-[10px]">{getActivityIcon(log.action as string)}</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 pb-3 group-hover:bg-accent/30 -mx-1 px-1 rounded-md transition-colors">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{log.action as string}</span>
                              <Badge variant="outline" className="text-[10px] font-normal">{log.entityType as string}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(log.actor as Record<string, unknown>)?.name || 'System'} &middot; {formatDistanceToNow(new Date(log.createdAt as string), { addSuffix: true })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={item} className="space-y-5">
          {/* Quick Actions */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {[
                { icon: <Upload className="h-4 w-4" />, label: 'Upload Document', view: 'documents' as const, desc: 'Add a new policy document' },
                { icon: <Plus className="h-4 w-4" />, label: 'New Comparison', view: 'comparisons' as const, desc: 'Compare document versions' },
                { icon: <ArrowRight className="h-4 w-4" />, label: 'View Alerts', view: 'alerts' as const, desc: 'Review pending alerts' },
                { icon: <BookOpen className="h-4 w-4" />, label: 'Browse Policies', view: 'policies' as const, desc: 'Explore policy registry' },
                ...(isAdmin ? [{ icon: <ScrollText className="h-4 w-4" />, label: 'View Audit Log', view: 'audit-log' as const, desc: 'Track system activity' }] : []),
              ].map(action => (
                <Button
                  key={action.view}
                  variant="outline"
                  className="w-full justify-start hover:bg-accent/80 hover:border-primary/30 transition-all duration-200 h-auto py-3 group"
                  onClick={() => setView(action.view)}
                >
                  <span className={`${action.view === 'alerts' ? 'text-rose-500' : 'text-primary'} group-hover:scale-110 transition-transform`}>{action.icon}</span>
                  <span className="ml-2 flex flex-col items-start">
                    <span className="text-sm font-medium">{action.label}</span>
                    <span className="text-[11px] text-muted-foreground font-normal">{action.desc}</span>
                  </span>
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
                </Button>
              ))}
              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground text-center">
                  Press <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border bg-muted/50 px-1 font-mono text-[9px] font-medium">?</kbd> for all shortcuts
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Alerts Section */}
      <motion.div variants={item}>
        <Card className="border-border/40">
          <CardHeader className="pb-2">
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
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Bell className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="font-medium text-sm">No alerts yet</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">Alerts will appear when policy changes are detected and reviewed.</p>
                </div>
              ) : (
                recentAlerts.map((alert: Record<string, unknown>) => (
                  <motion.div
                    key={alert.id as string}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="rounded-xl border border-border/50 p-4 hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-card to-muted/20"
                    onClick={() => setView('alerts')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate flex-1 group-hover:text-primary transition-colors leading-snug">{alert.title as string}</p>
                      <Badge className={`shrink-0 text-[10px] ${getAlertStatusColor(alert.status as string)}`}>
                        {(alert.status as string).replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {alert.summary && (
                      <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{alert.summary as string}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.createdAt as string), { addSuffix: true })}
                      </p>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary transition-all" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
