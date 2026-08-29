import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { explainPolicyChange } from '@/lib/deepseek'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { changeId } = body

  if (!changeId) {
    return NextResponse.json({ error: 'changeId required' }, { status: 400 })
  }

  const change = await db.policyChange.findUnique({
    where: { id: changeId },
    include: {
      comparison: {
        include: {
          oldDocument: { select: { policyId: true } },
          newDocument: { select: { policyId: true } },
        },
      },
    },
  })

  if (!change) {
    return NextResponse.json({ error: 'Change not found' }, { status: 404 })
  }

  // Get policy title from either document
  const policyId = change.comparison?.newDocument?.policyId || change.comparison?.oldDocument?.policyId
  const policy = policyId ? await db.policy.findUnique({ where: { id: policyId }, select: { title: true } }) : null

  try {
    const profile = await db.userProfile.findUnique({ where: { userId: user.id } })
    const userSectors = await db.userSector.findMany({
      where: { userId: user.id },
      include: { sector: true },
    })
    const sectorNames = userSectors.map(us => us.sector.name)
    const interests: string[] = profile?.interests ? JSON.parse(profile.interests) : []

    const userContext = `Role: ${user.role}, Business: ${profile?.businessType || 'N/A'}, Sectors: ${sectorNames.join(', ') || 'None'}, Interests: ${interests.join(', ') || 'None'}`

    const rawResult = await explainPolicyChange({
      changeTitle: change.title,
      changeDescription: change.description,
      changeType: change.changeType,
      severity: change.severity,
      oldText: change.oldText,
      newText: change.newText,
      policyTitle: policy?.title || 'Unknown Policy',
      userContext,
    })

    const result = JSON.parse(rawResult)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Explanation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
