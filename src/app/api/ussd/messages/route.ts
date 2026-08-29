import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const messages = await db.uSSDMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      sentBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return NextResponse.json(messages)
}