import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const policies = await db.policy.findMany({
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { title: 'asc' },
  })

  return NextResponse.json(policies)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, policyType, jurisdiction, issuingAuthority, categoryId, effectiveDate, sourceUrl } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description required' }, { status: 400 })
  }

  const policy = await db.policy.create({
    data: {
      title,
      description,
      policyType: policyType || 'POLICY',
      jurisdiction: jurisdiction || 'Uganda',
      issuingAuthority: issuingAuthority || null,
      categoryId: categoryId || null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      sourceUrl: sourceUrl || null,
    },
  })

  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'CREATE',
      entityType: 'Policy',
      entityId: policy.id,
      metadata: JSON.stringify({ title }),
    },
  })

  return NextResponse.json(policy, { status: 201 })
}
