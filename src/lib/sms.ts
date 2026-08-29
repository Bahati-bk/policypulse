import { db } from '@/lib/db'

const SHORTCODE = '*384*17818#'

/**
 * Queue SMS messages to all active phone contacts for a given user.
 * Used to auto-send alerts when policies/alerts/comparisons are created.
 */
export async function autoSendSmsAlert(params: {
  userId: string
  alertId?: string
  title: string
  summary?: string
  source?: string
}): Promise<{ queued: number; total: number }> {
  const { userId, alertId, title, summary, source } = params

  // Fetch all active contacts for this user
  const contacts = await db.phoneContact.findMany({
    where: { userId, active: true },
  })

  if (contacts.length === 0) {
    return { queued: 0, total: 0 }
  }

  // Build the SMS message
  const message = `[PolicyPulse${source ? ` - ${source}` : ''}]
${title}
${summary ? summary.slice(0, 200) : ''}`.trim()

  let queued = 0
  for (const contact of contacts) {
    try {
      await db.uSSDMessage.create({
        data: {
          alertId: alertId || null,
          phoneNumber: contact.phoneNumber,
          message,
          shortcode: SHORTCODE,
          status: 'QUEUED',
          recipientCount: 1,
          sentById: userId,
        },
      })
      queued++
    } catch (err) {
      console.error(`Failed to queue SMS for ${contact.phoneNumber}:`, err)
    }
  }

  // Audit log
  if (queued > 0) {
    await db.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'AUTO_SMS_QUEUE',
        entityType: 'USSDMessage',
        metadata: JSON.stringify({
          alertId: alertId || null,
          contactCount: contacts.length,
          queuedCount: queued,
          shortcode: SHORTCODE,
          source,
        }),
      },
    })
  }

  return { queued, total: contacts.length }
}

/**
 * Queue SMS to specific phone numbers (not just saved contacts).
 */
export async function queueSmsToNumbers(params: {
  userId: string
  phoneNumbers: string[]
  alertId?: string
  title: string
  summary?: string
}): Promise<{ queued: number }> {
  const { userId, phoneNumbers, alertId, title, summary } = params

  const phoneRegex = /^(\+?256|0)\d{9}$/
  const message = `[PolicyPulse] ${title}\n${summary ? summary.slice(0, 200) : ''}`.trim()

  let queued = 0
  for (const rawPhone of phoneNumbers) {
    const cleaned = rawPhone.replace(/[\s\-+]/g, '')
    const normalized = cleaned.startsWith('0') ? '256' + cleaned.slice(1) : cleaned

    if (!phoneRegex.test(normalized)) continue

    try {
      await db.uSSDMessage.create({
        data: {
          alertId: alertId || null,
          phoneNumber: normalized,
          message,
          shortcode: SHORTCODE,
          status: 'QUEUED',
          recipientCount: 1,
          sentById: userId,
        },
      })
      queued++
    } catch (err) {
      console.error(`Failed to queue SMS for ${normalized}:`, err)
    }
  }

  return { queued }
}
