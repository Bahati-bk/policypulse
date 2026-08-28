import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    policies,
    documents,
    comparisons,
    alerts,
    users,
    recentActivity,
    severityDist,
  ] = await Promise.all([
    db.policy.count(),
    db.policyDocument.count(),
    db.documentComparison.count(),
    db.alert.count({ where: { status: { in: ['DRAFT', 'PENDING_REVIEW'] } } }),
    db.user.count(),
    db.auditLog.findMany({
      take: 10,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.policyChange.groupBy({
      by: ['severity'],
      _count: { severity: true },
    }),
  ])

  // Activity trend: last 14 days
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const activityLogs = await db.auditLog.findMany({
    where: { createdAt: { gte: fourteenDaysAgo } },
    select: { createdAt: true, action: true },
    orderBy: { createdAt: 'asc' },
  })

  // Group by date
  const trendMap = new Map<string, { date: string; total: number; creates: number; updates: number; analyses: number }>()
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    trendMap.set(key, { date: key, total: 0, creates: 0, updates: 0, analyses: 0 })
  }
  for (const log of activityLogs) {
    const key = log.createdAt.toISOString().slice(0, 10)
    const entry = trendMap.get(key)
    if (entry) {
      entry.total++
      if (log.action === 'CREATE' || log.action === 'SEED') entry.creates++
      else if (log.action === 'UPDATE' || log.action === 'APPROVE' || log.action === 'REJECT') entry.updates++
      else if (log.action === 'ANALYZE' || log.action === 'PROCESS') entry.analyses++
    }
  }
  const activityTrend = Array.from(trendMap.values())

  return NextResponse.json({
    stats: { policies, documents, comparisons, pendingAlerts: alerts, users },
    recentActivity,
    severityDistribution: severityDist.map(s => ({ name: s.severity, value: s._count.severity })),
    activityTrend,
  })
}
