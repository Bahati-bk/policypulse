'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, GitCompare, Bell, Users, Upload, Plus, ArrowRight, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'hsl(210 20% 50%)',
  MEDIUM: 'hsl(38 92% 50%)',
  HIGH: 'hsl(0 84% 60%)',
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export default function DashboardView() {
  const setView = useAppStore(s => s.setView)
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then(r => r.json()),
  })

  const stats = data?.stats || { policies: 0, documents: 0, comparisons: 0, pendingAlerts: 0, users: 0 }
  const recentActivity = data?.recentActivity || []
  const severityDist = data?.severityDistribution || []

  const statCards = [
    { label: 'Policies', value: stats.policies, icon: <FileText className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Documents', value: stats.documents, icon: <FileText className="h-4 w-4" />, color: 'text-teal-600 dark:text-teal-400' },
    { label: 'Comparisons', value: stats.comparisons, icon: <GitCompare className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Pending Alerts', value: stats.pendingAlerts, icon: <Bell className="h-4 w-4" />, color: 'text-rose-600 dark:text-rose-400' },
    { label: 'Users', value: stats.users, icon: <Users className="h-4 w-4" />, color: 'text-violet-600 dark:text-violet-400' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of policy change intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setView('documents')}><Upload className="mr-2 h-3.5 w-3.5" />Upload Document</Button>
          <Button size="sm" variant="outline" onClick={() => setView('comparisons')}><Plus className="mr-2 h-3.5 w-3.5" />New Comparison</Button>
        </div>
      </div>

      <motion.div variants={container} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(s => (
          <motion.div key={s.label} variants={item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`${s.color}`}>{s.icon}</div>
                  {isLoading ? <Skeleton className="h-8 w-8 rounded" /> : <span className="text-2xl font-bold">{s.value}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {severityDist.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                        {severityDist.map((entry: Record<string, string>) => (
                          <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#888'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {severityDist.map((entry: Record<string, string>) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[entry.name] }} />
                        {entry.name} ({entry.value})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
