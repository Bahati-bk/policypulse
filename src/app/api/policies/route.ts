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
