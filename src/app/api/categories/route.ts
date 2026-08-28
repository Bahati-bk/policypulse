import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await db.policyCategory.findMany({
    include: { _count: { select: { policies: true } } },
    orderBy: { name: 'asc' },
  })

  const sectors = await db.sector.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ categories, sectors })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { type, name, description } = await req.json()

  if (type === 'sector') {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const sector = await db.sector.create({ data: { name, slug, description } })
    await db.auditLog.create({ data: { actorUserId: user.id, action: 'CREATE', entityType: 'Sector', entityId: sector.id, metadata: JSON.stringify({ name }) } })
    return NextResponse.json(sector, { status: 201 })
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const cat = await db.policyCategory.create({ data: { name, slug, description } })
  await db.auditLog.create({ data: { actorUserId: user.id, action: 'CREATE', entityType: 'PolicyCategory', entityId: cat.id, metadata: JSON.stringify({ name }) } })
  return NextResponse.json(cat, { status: 201 })
}