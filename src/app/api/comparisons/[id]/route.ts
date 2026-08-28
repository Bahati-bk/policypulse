import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comparison = await db.documentComparison.findUnique({
    where: { id },
    include: {
      oldDocument: { include: { policy: true } },
      newDocument: { include: { policy: true } },
      creator: { select: { id: true, name: true, email: true } },
      changes: {
        include: { assessment: true, alert: true, references: true },
        orderBy: { createdAt: 'desc' },
      },
      analysisRuns: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(comparison)
}