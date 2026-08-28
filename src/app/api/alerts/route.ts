import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const alerts = await db.alert.findMany({
    where,
    include: {
      change: {
        include: {
          comparison: {
            include: { oldDocument: { include: { policy: true } }, newDocument: { include: { policy: true } } },
          },
          references: true,
        },
      },
      approver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(alerts)
}