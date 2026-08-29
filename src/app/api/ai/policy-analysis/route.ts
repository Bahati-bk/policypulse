import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { analyzePolicyRelevance } from '@/lib/deepseek'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { policyId } = body

  if (!policyId) {
    return NextResponse.json({ error: 'policyId required' }, { status: 400 })
  }

  const policy = await db.policy.findUnique({
    where: { id: policyId },
    include: { category: { select: { name: true } } },
  })

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  }

  try {
    const profile = await db.userProfile.findUnique({ where: { userId: user.id } })
    const userSectors = await db.userSector.findMany({
      where: { userId: user.id },
      include: { sector: true },
    })
    const sectorNames = userSectors.map(us => us.sector.name)
    const interests: string[] = profile?.interests ? JSON.parse(profile.interests) : []

    const rawResult = await analyzePolicyRelevance({
      policyTitle: policy.title,
      policyDescription: policy.description || '',
      policyType: policy.policyType,
      issuingAuthority: policy.issuingAuthority,
      userSectors: sectorNames,
      userBusinessType: profile?.businessType || null,
      userEmploymentStatus: profile?.employmentStatus || null,
      userInterests: interests,
    })

    const result = JSON.parse(rawResult)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
