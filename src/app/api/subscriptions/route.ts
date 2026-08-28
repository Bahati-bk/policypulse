import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subs = await db.subscription.findMany({
    where: { userId: user.id },
    include: { user: { select: { id: true, email: true } } },
  })

  const sectors = await db.userSector.findMany({
    where: { userId: user.id },
    include: { sector: true },
  })

  return NextResponse.json({ subscriptions: subs, sectors })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscriptionType, referenceId, active } = await req.json()

  const existing = await db.subscription.findFirst({
    where: { userId: user.id, subscriptionType, referenceId },
  })

  if (existing) {
    const updated = await db.subscription.update({
      where: { id: existing.id },
      data: { active },
    })
    return NextResponse.json(updated)
  }

  const sub = await db.subscription.create({
    data: { userId: user.id, subscriptionType, referenceId, active },
  })

  return NextResponse.json(sub, { status: 201 })
}