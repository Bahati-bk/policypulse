import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { role, isActive } = body as { role?: string; isActive?: boolean }

  const existingUser = await db.user.findUnique({ where: { id } })
  if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}

  if (role && ['USER', 'ADMIN', 'ANALYST'].includes(role)) {
    updateData.role = role
  }

  if (isActive !== undefined) {
    if (!isActive) {
      const baseName = (existingUser.name || 'User').replace(/ \(Deactivated\)$/, '')
      updateData.name = `${baseName} (Deactivated)`
    } else {
      updateData.name = (existingUser.name || 'User').replace(/ \(Deactivated\)$/, '')
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: updateData,
    include: {
      profile: {
        select: {
          jurisdiction: true,
          businessType: true,
          employmentStatus: true,
        },
      },
      _count: {
        select: {
          subscriptions: true,
          notifications: true,
        },
      },
    },
  })

  return NextResponse.json({ user: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const existingUser = await db.user.findUnique({ where: { id } })
  if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const baseName = (existingUser.name || 'User').replace(/ \(Deactivated\)$/, '')
  const deactivated = await db.user.update({
    where: { id },
    data: {
      name: `${baseName} (Deactivated)`,
      role: 'USER',
    },
    include: {
      profile: {
        select: {
          jurisdiction: true,
          businessType: true,
          employmentStatus: true,
        },
      },
      _count: {
        select: {
          subscriptions: true,
          notifications: true,
        },
      },
    },
  })

  return NextResponse.json({ user: deactivated })
}
