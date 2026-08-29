import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { generatePersonalizedInsights } from '@/lib/deepseek'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Fetch user profile
    const profile = await db.userProfile.findUnique({ where: { userId: user.id } })
    const userSectors = await db.userSector.findMany({
      where: { userId: user.id },
      include: { sector: true },
    })
    const sectorNames = userSectors.map(us => us.sector.name)
    const interests: string[] = profile?.interests ? JSON.parse(profile.interests) : []

    // Fetch policies (limited set)
    const policies = await db.policy.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    })

    // Fetch recent changes from alerts
    const recentAlerts = await db.alert.findMany({
      where: { status: { in: ['DRAFT', 'PENDING_REVIEW', 'APPROVED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { title: true, severity: true, changeType: true },
    })

    const policiesInput = policies.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      policyType: p.policyType,
      issuingAuthority: p.issuingAuthority,
      category: p.category?.name || null,
    }))

    const recentChanges = recentAlerts.map(a => ({
      title: a.title,
      severity: a.severity,
      changeType: a.changeType,
    }))

    const rawResult = await generatePersonalizedInsights({
      policies: policiesInput,
      userSectors: sectorNames,
      userBusinessType: profile?.businessType || null,
      userEmploymentStatus: profile?.employmentStatus || null,
      userInterests: interests,
      userRole: user.role,
      recentChanges,
    })

    const result = JSON.parse(rawResult)

    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate insights'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
