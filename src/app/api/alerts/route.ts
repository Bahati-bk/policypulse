import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { autoSendSmsAlert } from '@/lib/sms'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const alerts = await db.alert.findMany({
    where,
    include: {
      change: {
        include: {
          comparison: {
            include: { oldDocument: { include: { policy: true } }, newDocument: { include: { policy: true } } },
          },
          references: true,
        },
      },
      approver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(alerts)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, summary, severity, changeType, whatChanged, whoIsAffected, whatToDo } = body

  if (!title || !summary) {
    return NextResponse.json({ error: 'Title and summary required' }, { status: 400 })
  }

  const alert = await db.alert.create({
    data: {
      title,
      summary: summary || null,
      severity: severity || 'MEDIUM',
      changeType: changeType || 'CLARIFICATION',
      whatChanged: whatChanged || null,
      whoIsAffected: whoIsAffected || null,
      whatToDo: whatToDo || null,
      status: 'DRAFT',
    },
  })

  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'CREATE',
      entityType: 'Alert',
      entityId: alert.id,
      metadata: JSON.stringify({ title, severity }),
    },
  })

  // Auto-send SMS to all saved contacts
  try {
    const smsResult = await autoSendSmsAlert({
      userId: user.id,
      alertId: alert.id,
      title,
      summary: summary || undefined,
      source: 'New Alert',
    })
    if (smsResult.queued > 0) {
      console.log(`Auto-queued ${smsResult.queued} SMS for new alert ${alert.id}`)
    }
  } catch (smsErr) {
    console.error('Auto-SMS failed for new alert:', smsErr)
  }

  return NextResponse.json({ ...alert, _smsQueued: true }, { status: 201 })
}