import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await db.userProfile.findUnique({
    where: { userId: user.id },
    include: { user: { select: { id: true, email: true, name: true, phone: true, role: true } } },
  })

  if (!profile) {
    const created = await db.userProfile.create({ data: { userId: user.id } })
    return NextResponse.json({ ...created, user })
  }

  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const profile = await db.userProfile.upsert({
    where: { userId: user.id },
    update: {
      jurisdiction: body.jurisdiction,
      businessType: body.businessType,
      employmentStatus: body.employmentStatus,
      interests: JSON.stringify(body.interests || []),
    },
    create: {
      userId: user.id,
      jurisdiction: body.jurisdiction || 'Uganda',
      businessType: body.businessType,
      employmentStatus: body.employmentStatus,
      interests: JSON.stringify(body.interests || []),
    },
  })

  if (body.name || body.phone) {
    await db.user.update({
      where: { id: user.id },
      data: { name: body.name, phone: body.phone },
    })
  }

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'UPDATE', entityType: 'UserProfile', entityId: profile.id },
  })

  return NextResponse.json(profile)
}