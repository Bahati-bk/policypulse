import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await params
  const alert = await db.alert.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: user.id,
      approvedAt: new Date(),
    },
  })

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'APPROVE', entityType: 'Alert', entityId: id, metadata: JSON.stringify({ title: alert.title }) },
  })

  return NextResponse.json(alert)
}