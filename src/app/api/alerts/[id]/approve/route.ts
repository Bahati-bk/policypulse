import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { autoSendSmsAlert } from '@/lib/sms'

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

  // Auto-send SMS to all saved contacts on approval
  try {
    const smsResult = await autoSendSmsAlert({
      userId: user.id,
      alertId: alert.id,
      title: `[APPROVED] ${alert.title}`,
      summary: alert.summary || undefined,
      source: 'Alert Approved',
    })
    if (smsResult.queued > 0) {
      console.log(`Auto-queued ${smsResult.queued} SMS for approved alert ${alert.id}`)
    }
  } catch (smsErr) {
    console.error('Auto-SMS failed for approved alert:', smsErr)
  }

  return NextResponse.json({ ...alert, _smsQueued: true })
}