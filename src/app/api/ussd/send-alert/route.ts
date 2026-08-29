import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { phoneNumbers?: string[]; message?: string; alertId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { phoneNumbers, message, alertId } = body

  // Validate
  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return NextResponse.json({ error: 'phoneNumbers is required and must be a non-empty array' }, { status: 400 })
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  if (phoneNumbers.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 phone numbers per request' }, { status: 400 })
  }

  // Validate phone numbers (Uganda format: 256... or 0..., or +256...)
  const phoneRegex = /^(\+?256|0)\d{9}$/
  const invalidNumbers = phoneNumbers.filter(p => !phoneRegex.test(p.replace(/\s/g, '')))
  if (invalidNumbers.length > 0) {
    return NextResponse.json({ error: `Invalid phone number(s): ${invalidNumbers.slice(0, 3).join(', ')}${invalidNumbers.length > 3 ? ` and ${invalidNumbers.length - 3} more` : ''}` }, { status: 400 })
  }

  const SHORTCODE = '*384*17818#'

  // Normalize phone numbers to standard format
  const normalizedNumbers = phoneNumbers.map(p => {
    const cleaned = p.replace(/[\s\-+]/g, '')
    if (cleaned.startsWith('0')) return '256' + cleaned.slice(1)
    return cleaned
  })

  // In production, this would call Africa's Talking API:
  // POST https://api.africastalking.com/version1/messaging
  // Headers: apikey: <YOUR_API_KEY>, Content-Type: application/x-www-form-urlencoded
  // Body: username=<USERNAME>&to=<phone>&message=<message>&from=<shortcode>

  // For now, store in database and return success
  const ussdMessages = []
  for (const phone of normalizedNumbers) {
    const ussdMsg = await db.uSSDMessage.create({
      data: {
        alertId: alertId || null,
        phoneNumber: phone,
        message: message.trim(),
        shortcode: SHORTCODE,
        status: 'QUEUED',
        recipientCount: 1,
        sentById: user.id,
      },
    })
    ussdMessages.push(ussdMsg)
  }

  // Audit log
  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'USSD_SEND',
      entityType: 'USSDMessage',
      entityId: ussdMessages[0]?.id || null,
      metadata: JSON.stringify({
        alertId: alertId || null,
        phoneCount: normalizedNumbers.length,
        shortcode: SHORTCODE,
      }),
    },
  })

  return NextResponse.json({
    success: true,
    messageCount: normalizedNumbers.length,
    shortcode: SHORTCODE,
    status: 'QUEUED',
    note: 'Messages queued. In production, these would be sent via Africa\'s Talking API.',
  })
}