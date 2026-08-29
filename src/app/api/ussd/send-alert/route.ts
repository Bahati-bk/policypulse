import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

const SHORTCODE = '38417818' // Africa's Talking shortcode (without * and #)
const AT_API_URL = 'https://api.africastalking.com/version1/messaging'

// Read from env — user should set these
function getAtCredentials() {
  const username = process.env.AT_USERNAME || 'policypulse'
  const apiKey = process.env.AT_API_KEY || ''
  return { username, apiKey, configured: !!apiKey }
}

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

  // Normalize phone numbers to standard format
  const normalizedNumbers = phoneNumbers.map(p => {
    const cleaned = p.replace(/[\s\-+]/g, '')
    if (cleaned.startsWith('0')) return '256' + cleaned.slice(1)
    return cleaned
  })

  const credentials = getAtCredentials()
  const truncatedMsg = message.trim().slice(0, 160) // SMS limit

  const results: { phone: string; status: string; error?: string; messageId?: string }[] = []

  for (const phone of normalizedNumbers) {
    let status: 'SENT' | 'FAILED' | 'QUEUED' = 'QUEUED'
    let errorMessage: string | null = null
    let atMessageId: string | null = null

    if (credentials.configured) {
      // Actually send via Africa's Talking SMS API
      try {
        const params = new URLSearchParams({
          username: credentials.username,
          to: '+' + phone,
          message: truncatedMsg,
          from: SHORTCODE,
        })

        const atResponse = await fetch(AT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apiKey': credentials.apiKey,
          },
          body: params.toString(),
        })

        const atData = await atResponse.json()

        if (atResponse.ok && atData?.SMSMessageData?.Recipients) {
          const recipient = atData.SMSMessageData.Recipients[0]
          if (recipient?.status === 'Success') {
            status = 'SENT'
            atMessageId = recipient.messageId
          } else {
            status = 'FAILED'
            errorMessage = recipient?.status || 'Unknown error'
          }
        } else {
          status = 'FAILED'
          errorMessage = atData?.errorMessage || `HTTP ${atResponse.status}`
        }
      } catch (err) {
        status = 'FAILED'
        errorMessage = err instanceof Error ? err.message : 'Network error'
      }
    }

    // Store in database
    const ussdMsg = await db.uSSDMessage.create({
      data: {
        alertId: alertId || null,
        phoneNumber: phone,
        message: truncatedMsg,
        shortcode: '*' + SHORTCODE.split('').join('*') + '#',
        status,
        recipientCount: 1,
        sentById: user.id,
        sentAt: status === 'SENT' ? new Date() : null,
        errorMessage: errorMessage || null,
      },
    })

    results.push({
      phone,
      status,
      error: errorMessage || undefined,
      messageId: ussdMsg.id,
    })
  }

  // Audit log
  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'USSD_SEND',
      entityType: 'USSDMessage',
      metadata: JSON.stringify({
        alertId: alertId || null,
        phoneCount: normalizedNumbers.length,
        shortcode: '*384*17818#',
        sentCount: results.filter(r => r.status === 'SENT').length,
        failedCount: results.filter(r => r.status === 'FAILED').length,
        queuedCount: results.filter(r => r.status === 'QUEUED').length,
        liveApi: credentials.configured,
      }),
    },
  })

  const sentCount = results.filter(r => r.status === 'SENT').length
  const failedCount = results.filter(r => r.status === 'FAILED').length

  return NextResponse.json({
    success: sentCount > 0,
    messageCount: normalizedNumbers.length,
    sent: sentCount,
    failed: failedCount,
    queued: results.filter(r => r.status === 'QUEUED').length,
    shortcode: '*384*17818#',
    results,
    note: credentials.configured
      ? `Sent via Africa's Talking API. ${sentCount} delivered, ${failedCount} failed.`
      : `API key not configured (AT_API_KEY). ${results.length} message(s) queued for later delivery.`,
  })
}
