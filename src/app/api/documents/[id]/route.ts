import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await db.policyDocument.findUnique({
    where: { id },
    include: {
      policy: { include: { category: true } },
      comparisonsOld: { include: { changes: true } },
      comparisonsNew: { include: { changes: true } },
    },
  })

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doc)
}