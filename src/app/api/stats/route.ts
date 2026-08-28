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

  return NextResponse.json({
    stats: { policies, documents, comparisons, pendingAlerts: alerts, users },
    recentActivity,
    severityDistribution: severityDist.map(s => ({ name: s.severity, value: s._count.severity })),
  })
}
