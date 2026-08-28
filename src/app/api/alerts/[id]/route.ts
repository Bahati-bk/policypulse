import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const alert = await db.alert.findUnique({
    where: { id },
    include: {
      change: {
        include: {
          comparison: {
            include: { oldDocument: { include: { policy: true } }, newDocument: { include: { policy: true } } },
          },
          assessment: true,
          references: true,
        },
      },
      approver: { select: { id: true, name: true, email: true } },
    },
  })

  if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(alert)
}