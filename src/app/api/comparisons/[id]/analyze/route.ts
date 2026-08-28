import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { analyzeComparison } from '@/lib/ai-analyzer'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comparison = await db.documentComparison.findUnique({
    where: { id },
    include: { oldDocument: true, newDocument: true },
  })

  if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const oldText = comparison.oldDocument.extractedText || ''
  const newText = comparison.newDocument.extractedText || ''

  if (!oldText || !newText) {
    return NextResponse.json({ error: 'Both documents must have extracted text' }, { status: 400 })
  }

  await db.documentComparison.update({
    where: { id },
    data: { status: 'ANALYZING' },
  })

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'ANALYZE', entityType: 'DocumentComparison', entityId: id },
  })

  try {
    const result = await analyzeComparison(id, oldText, newText)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}