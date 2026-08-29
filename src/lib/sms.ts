import { db } from '@/lib/db'

const SHORTCODE = '38417818'
const AT_API_URL = 'https://api.africastalking.com/version1/messaging'

function getAtCredentials() {
  const username = process.env.AT_USERNAME || 'policypulse'
  const apiKey = process.env.AT_API_KEY || ''
  return { username, apiKey, configured: !!apiKey }
}

async function sendViaAfricaTalking(phone: string, message: string): Promise<{ sent: boolean; error?: string }> {
  const creds = getAtCredentials()
  if (!creds.configured) return { sent: false }

  try {
    const params = new URLSearchParams({
      username: creds.username,
      to: '+' + phone,
      message: message.slice(0, 160),
      from: SHORTCODE,
    })

    const res = await fetch(AT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': creds.apiKey,
      },
      body: params.toString(),
    })

    const data = await res.json()
    const recipient = data?.SMSMessageData?.Recipients?.[0]

    if (res.ok && recipient?.status === 'Success') {
      return { sent: true }
    }
    return { sent: false, error: recipient?.status || data?.errorMessage || `HTTP ${res.status}` }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Queue or send SMS messages to all active phone contacts for a given user.
 */
export async function autoSendSmsAlert(params: {
  userId: string
  alertId?: string
  title: string
  summary?: string
  source?: string
}): Promise<{ queued: number; sent: number; total: number }> {
  const { userId, alertId, title, summary, source } = params

  const contacts = await db.phoneContact.findMany({
    where: { userId, active: true },
  })

  if (contacts.length === 0) {
    return { queued: 0, sent: 0, total: 0 }
  }

  const message = `[PolicyPulse${source ? ` - ${source}` : ''}]
${title}
${summary ? summary.slice(0, 120) : ''}`.trim()

  let queued = 0
  let sent = 0

  for (const contact of contacts) {
    const result = await sendViaAfricaTalking(contact.phoneNumber, message)
    const status = result.sent ? 'SENT' as const : 'QUEUED' as const

    try {
      await db.uSSDMessage.create({
        data: {
          alertId: alertId || null,
          phoneNumber: contact.phoneNumber,
          message,
          shortcode: '*384*17818#',
          status,
          recipientCount: 1,
          sentById: userId,
          sentAt: result.sent ? new Date() : null,
          errorMessage: result.error || null,
        },
      })
      if (result.sent) sent++
      else queued++
    } catch (err) {
      console.error(`Failed to queue SMS for ${contact.phoneNumber}:`, err)
      queued++
    }
  }

  // Audit log
  if (queued > 0 || sent > 0) {
    await db.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'AUTO_SMS_QUEUE',
        entityType: 'USSDMessage',
        metadata: JSON.stringify({
          alertId: alertId || null,
          contactCount: contacts.length,
          queuedCount: queued,
          sentCount: sent,
          shortcode: '*384*17818#',
          source,
        }),
      },
    })
  }

  return { queued, sent, total: contacts.length }
}

/**
 * Queue or send SMS to specific phone numbers.
 */
export async function queueSmsToNumbers(params: {
  userId: string
  phoneNumbers: string[]
  alertId?: string
  title: string
  summary?: string
}): Promise<{ queued: number; sent: number }> {
  const { userId, phoneNumbers, alertId, title, summary } = params

  const phoneRegex = /^(\+?256|0)\d{9}$/
  const message = `[PolicyPulse] ${title}\n${summary ? summary.slice(0, 120) : ''}`.trim()

  let queued = 0
  let sent = 0

  for (const rawPhone of phoneNumbers) {
    const cleaned = rawPhone.replace(/[\s\-+]/g, '')
    const normalized = cleaned.startsWith('0') ? '256' + cleaned.slice(1) : cleaned

    if (!phoneRegex.test(normalized)) continue

    const result = await sendViaAfricaTalking(normalized, message)
    const status = result.sent ? 'SENT' as const : 'QUEUED' as const

    try {
      await db.uSSDMessage.create({
        data: {
          alertId: alertId || null,
          phoneNumber: normalized,
          message,
          shortcode: '*384*17818#',
          status,
          recipientCount: 1,
          sentById: userId,
          sentAt: result.sent ? new Date() : null,
          errorMessage: result.error || null,
        },
      })
      if (result.sent) sent++
      else queued++
    } catch (err) {
      console.error(`Failed to queue SMS for ${normalized}:`, err)
      queued++
    }
  }

  return { queued, sent }
}
