import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { autoSendSmsAlert } from '@/lib/sms'

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

  try {
    const body = await req.json()
    const { oldDocumentId, newDocumentId, title, description, policyId } = body

    if (!oldDocumentId || !newDocumentId) {
      return NextResponse.json({ error: 'Both documents are required' }, { status: 400 })
    }

    const oldDoc = await db.policyDocument.findUnique({ where: { id: oldDocumentId } })
    const newDoc = await db.policyDocument.findUnique({ where: { id: newDocumentId } })

    if (!oldDoc || !newDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (oldDoc.id === newDoc.id) {
      return NextResponse.json({ error: 'Cannot compare a document with itself' }, { status: 400 })
    }

    const existing = await db.documentComparison.findFirst({
      where: { oldDocumentId, newDocumentId },
    })
    if (existing) {
      return NextResponse.json({ error: 'Comparison already exists for these documents', comparison: existing }, { status: 409 })
    }

    const comparison = await db.documentComparison.create({
      data: {
        title: title || null,
        oldDocumentId,
        newDocumentId,
        createdBy: user.id,
        status: 'PENDING',
      },
    })

    await db.auditLog.create({
      data: { actorUserId: user.id, action: 'CREATE', entityType: 'DocumentComparison', entityId: comparison.id, metadata: JSON.stringify({ title, source: 'select-docs' }) },
    })

    // Auto-send SMS to all saved contacts
    try {
      const smsResult = await autoSendSmsAlert({
        userId: user.id,
        title: `[New Comparison] ${title || 'Document comparison'}`,
        summary: description || `Comparing ${oldDoc.fileName || 'document 1'} with ${newDoc.fileName || 'document 2'}`,
        source: 'Comparison',
      })
      if (smsResult.queued > 0) {
        console.log(`Auto-queued ${smsResult.queued} SMS for comparison ${comparison.id}`)
      }
    } catch (smsErr) {
      console.error('Auto-SMS failed for comparison:', smsErr)
    }

    return NextResponse.json({ ...comparison, _smsQueued: true }, { status: 201 })
  } catch (error) {
    console.error('Comparison create error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
