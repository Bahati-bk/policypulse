import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comparisons = await db.documentComparison.findMany({
    include: {
      oldDocument: { include: { policy: true } },
      newDocument: { include: { policy: true } },
      creator: { select: { id: true, name: true, email: true } },
      changes: {
        include: { assessment: true, alert: true, references: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { changes: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(comparisons)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { oldDocumentId, newDocumentId } = await req.json()
  if (!oldDocumentId || !newDocumentId) {
    return NextResponse.json({ error: 'Both documents are required' }, { status: 400 })
  }

  const oldDoc = await db.policyDocument.findUnique({ where: { id: oldDocumentId } })
  const newDoc = await db.policyDocument.findUnique({ where: { id: newDocumentId } })

  if (!oldDoc || !newDoc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (oldDoc.policyId !== newDoc.policyId) {
    return NextResponse.json({ error: 'Documents must be from the same policy' }, { status: 400 })
  }

  const existing = await db.documentComparison.findFirst({
    where: { oldDocumentId, newDocumentId },
  })
  if (existing) {
    return NextResponse.json({ error: 'Comparison already exists', comparison: existing }, { status: 409 })
  }

  const comparison = await db.documentComparison.create({
    data: { oldDocumentId, newDocumentId, createdBy: user.id, status: 'PENDING' },
  })

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'CREATE', entityType: 'DocumentComparison', entityId: comparison.id },
  })

  return NextResponse.json(comparison, { status: 201 })
}