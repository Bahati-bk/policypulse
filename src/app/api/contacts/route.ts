import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

const phoneRegex = /^(\+?256|0)\d{9}$/

function normalizePhone(p: string): string {
  const cleaned = p.replace(/[\s\-+]/g, '')
  if (cleaned.startsWith('0')) return '256' + cleaned.slice(1)
  return cleaned
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contacts = await db.phoneContact.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { phoneNumber, name, label } = body

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const normalized = normalizePhone(phoneNumber.trim())
    if (!phoneRegex.test(normalized)) {
      return NextResponse.json({ error: 'Invalid Uganda phone number. Use format: 256..., +256..., or 07...' }, { status: 400 })
    }

    // Upsert: if this phone number already exists for this user, reactivate it
    const existing = await db.phoneContact.findUnique({
      where: { userId_phoneNumber: { userId: user.id, phoneNumber: normalized } },
    })

    if (existing) {
      const updated = await db.phoneContact.update({
        where: { id: existing.id },
        data: { active: true, name: name || existing.name, label: label || existing.label },
      })
      return NextResponse.json(updated)
    }

    const contact = await db.phoneContact.create({
      data: {
        userId: user.id,
        phoneNumber: normalized,
        name: name || null,
        label: label || 'General',
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Contact create error:', error)
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
  }

  // Verify ownership
  const contact = await db.phoneContact.findUnique({ where: { id } })
  if (!contact || contact.userId !== user.id) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  await db.phoneContact.update({
    where: { id },
    data: { active: false },
  })

  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, name, label, phoneNumber } = body

    if (!id) return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })

    const contact = await db.phoneContact.findUnique({ where: { id } })
    if (!contact || contact.userId !== user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (label !== undefined) updateData.label = label
    if (phoneNumber) {
      const normalized = normalizePhone(phoneNumber.trim())
      if (!phoneRegex.test(normalized)) {
        return NextResponse.json({ error: 'Invalid Uganda phone number' }, { status: 400 })
      }
      updateData.phoneNumber = normalized
    }

    const updated = await db.phoneContact.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Contact update error:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}
