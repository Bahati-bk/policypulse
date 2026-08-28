import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await params
  const { name, description, active, type } = await req.json()

  if (type === 'sector') {
    const updated = await db.sector.update({ where: { id }, data: { name, description, active } })
    await db.auditLog.create({ data: { actorUserId: user.id, action: 'UPDATE', entityType: 'Sector', entityId: id } })
    return NextResponse.json(updated)
  }

  const updated = await db.policyCategory.update({ where: { id }, data: { name, description, active } })
  await db.auditLog.create({ data: { actorUserId: user.id, action: 'UPDATE', entityType: 'PolicyCategory', entityId: id } })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await params
  const type = req.nextUrl.searchParams.get('type')

  if (type === 'sector') {
    await db.sector.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }

  await db.policyCategory.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
