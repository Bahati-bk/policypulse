import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await params
  const alert = await db.alert.findUnique({
    where: { id },
    include: { change: { include: { comparison: true } } },
  })

  if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (alert.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Alert must be approved first' }, { status: 400 })
  }

  // Get all users for notification
  const users = await db.user.findMany({ where: { id: { not: user.id } } })

  let sentCount = 0
  for (const u of users) {
    await db.userNotification.create({
      data: {
        userId: u.id,
        alertId: alert.id,
        title: alert.title,
        message: alert.summary,
        channel: 'WEB',
        status: 'UNREAD',
        sentAt: new Date(),
      },
    })
    sentCount++
  }

  await db.alert.update({
    where: { id },
    data: { status: 'SENT' },
  })

  await db.alertNotification.create({
    data: {
      alertId: alert.id,
      channel: 'WEB',
      status: 'SENT',
      sentAt: new Date(),
    },
  })

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'SEND', entityType: 'Alert', entityId: id, metadata: JSON.stringify({ sentTo: sentCount }) },
  })

  return NextResponse.json({ success: true, sentTo: sentCount })
}