import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const policy = await db.policy.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      documents: {
        select: {
          id: true,
          fileName: true,
          version: true,
          documentType: true,
          processingStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { documents: true } },
    },
  })

  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(policy)
}
