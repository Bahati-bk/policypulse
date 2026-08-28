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
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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

  const stats = data?.stats || { policies: 0, documents: 0, comparisons: 0, pendingAlerts: 0, users: 0 }
  const recentActivity = data?.recentActivity || []
  const severityDist = data?.severityDistribution || []
  const recentAlerts = (alertsData?.alerts || []).slice(0, 3)

  const totalChanges = severityDist.reduce((sum: number, e: Record<string, number>) => sum + (e.value || 0), 0)

  const statCards = [
    { label: 'Policies', value: stats.policies, icon: <FileText className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500', trend: '+3 this week', up: true },
    { label: 'Documents', value: stats.documents, icon: <FileText className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400', border: 'border-l-teal-500', trend: '+2 this week', up: true },
    { label: 'Comparisons', value: stats.comparisons, icon: <GitCompare className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500', trend: '+1 this week', up: true },
    { label: 'Pending Alerts', value: stats.pendingAlerts, icon: <Bell className="h-4 w-4" />, color: 'text-rose-600 dark:text-rose-400', border: 'border-l-rose-500', trend: '-2 vs last week', up: false },
    { label: 'Users', value: stats.users, icon: <Users className="h-4 w-4" />, color: 'text-violet-600 dark:text-violet-400', border: 'border-l-violet-500', trend: '+1 this month', up: true },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome Banner */}
      <motion.div variants={item}>
        <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {user?.name || 'User'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with Uganda's policy landscape today. {'🇺🇬'}
          </p>
        </div>
      </motion.div>

      {/* Top Action Buttons */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setView('documents')}><Upload className="mr-2 h-3.5 w-3.5" />Upload Document</Button>
          <Button size="sm" variant="outline" onClick={() => setView('comparisons')}><Plus className="mr-2 h-3.5 w-3.5" />New Comparison</Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={container} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(s => (
          <motion.div key={s.label} variants={item}>
            <Card className={`hover:shadow-md transition-shadow border-l-4 ${s.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`${s.color}`}>{s.icon}</div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 rounded" />
                  ) : (
                    <span className="text-2xl font-bold tabular-nums">{s.value}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{s.label}</p>
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${s.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {s.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{s.trend}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main 3-column grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="max-h-96 overflow-y-auto scrollbar-thin space-y-3">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((log: Record<string, unknown>) => (
                    <div key={log.id as string} className="flex items-start gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.action as string}</span>
                          <Badge variant="outline" className="text-[10px]">{log.entityType as string}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(log.actor as Record<string, unknown>)?.name || 'System'} · {formatDistanceToNow(new Date(log.createdAt as string), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          {/* Severity Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {severityDist.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityDist} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                        {severityDist.map((entry: Record<string, string>) => (
                          <Cell key={entry.name} fill={getSeverityColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Donut hole label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold tabular-nums">{totalChanges}</p>
                      <p className="text-[10px] text-muted-foreground">changes</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
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
              <Button variant="outline" className="w-full justify-start" onClick={() => setView('documents')}>
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setView('comparisons')}>
                <Plus className="mr-2 h-4 w-4" /> New Comparison
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setView('alerts')}>
                <ArrowRight className="mr-2 h-4 w-4" /> View Alerts
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setView('policies')}>
                <BookOpen className="mr-2 h-4 w-4" /> Browse Policies
              </Button>
              {isAdmin && (
                <Button variant="outline" className="w-full justify-start" onClick={() => setView('audit-log')}>
                  <ScrollText className="mr-2 h-4 w-4" /> View Audit Log
                </Button>
              )}
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
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No alerts yet</p>
                </div>
              ) : (
                recentAlerts.map((alert: Record<string, unknown>) => (
                  <div key={alert.id as string} className="rounded-md border border-border/50 p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate flex-1">{alert.title as string}</p>
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
