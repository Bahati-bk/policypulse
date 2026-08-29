import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { comparePoliciesAI } from '@/lib/deepseek'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { policyId1, policyId2 } = body

  if (!policyId1 || !policyId2) {
    return NextResponse.json({ error: 'Both policyId1 and policyId2 required' }, { status: 400 })
  }

  if (policyId1 === policyId2) {
    return NextResponse.json({ error: 'Policies must be different' }, { status: 400 })
  }

  try {
    const [policy1, policy2] = await Promise.all([
      db.policy.findUnique({ where: { id: policyId1 } }),
      db.policy.findUnique({ where: { id: policyId2 } }),
    ])

    if (!policy1 || !policy2) {
      return NextResponse.json({ error: 'One or both policies not found' }, { status: 404 })
    }

    const profile = await db.userProfile.findUnique({ where: { userId: user.id } })
    const userSectors = await db.userSector.findMany({
      where: { userId: user.id },
      include: { sector: true },
    })
    const sectorNames = userSectors.map(us => us.sector.name)
    const interests: string[] = profile?.interests ? JSON.parse(profile.interests) : []

    const userContext = `Role: ${user.role}, Business: ${profile?.businessType || 'N/A'}, Employment: ${profile?.employmentStatus || 'N/A'}, Sectors: ${sectorNames.join(', ') || 'None'}, Interests: ${interests.join(', ') || 'None'}`

    const rawResult = await comparePoliciesAI({
      policy1: { title: policy1.title, description: policy1.description, policyType: policy1.policyType },
      policy2: { title: policy2.title, description: policy2.description, policyType: policy2.policyType },
      userContext,
    })

    const result = JSON.parse(rawResult)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Comparison failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
