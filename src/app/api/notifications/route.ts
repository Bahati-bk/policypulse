import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifs = await db.userNotification.findMany({
    where: { userId: user.id },
    include: { alert: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const unreadCount = await db.userNotification.count({
    where: { userId: user.id, status: 'UNREAD' },
  })

  return NextResponse.json({ notifications: notifs, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationId, markAll } = await req.json()

  if (markAll) {
    await db.userNotification.updateMany({
      where: { userId: user.id, status: 'UNREAD' },
      data: { status: 'READ' },
    })
    return NextResponse.json({ success: true })
  }

  if (notificationId) {
    await db.userNotification.update({
      where: { id: notificationId },
      data: { status: 'READ' },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'notificationId or markAll required' }, { status: 400 })
}