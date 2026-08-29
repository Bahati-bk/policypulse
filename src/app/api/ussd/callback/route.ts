import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SERVICE_CODE = '*384*17818#'

// Africa's Talking USSD gateway sends:
// POST with form-urlencoded body:
//   sessionId, serviceCode, phoneNumber, text
// Response must be plain text: "CON ..." (continue) or "END ..." (end session)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const sessionId = formData.get('sessionId') as string || ''
    const serviceCode = formData.get('serviceCode') as string || ''
    const phoneNumber = formData.get('phoneNumber') as string || ''
    const text = (formData.get('text') as string || '').trim()

    // Parse the user's input — each step is separated by *
    const steps = text ? text.split('*').map(s => s.trim()) : []
    const step = steps.length

    let response: string

    if (step === 0) {
      // Step 1: Main menu
      response = `CON Welcome to PolicyPulse - Uganda
${SERVICE_CODE}

1. View Latest Alerts
2. My Subscriptions
3. Recent Policy Changes
4. Unsubscribe`
    } else if (step === 1) {
      const choice = steps[0]

      if (choice === '1') {
        // Fetch latest approved alerts
        const alerts = await db.alert.findMany({
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            title: true,
            severity: true,
            summary: true,
          },
        })

        if (alerts.length === 0) {
          response = 'END No active alerts at this time.\nThank you for using PolicyPulse.'
        } else {
          const menuItems = alerts
            .map((a, i) => `${i + 1}. [${a.severity}] ${a.title}`)
            .join('\n')
          response = `CON Latest Policy Alerts:\n\n${menuItems}\n\n0. Back to Menu`
        }
      } else if (choice === '2') {
        // Check if phone number has subscriptions
        const phone = normalizePhone(phoneNumber)
        const contacts = await db.phoneContact.findMany({
          where: { phoneNumber: phone, active: true },
          select: { name: true, label: true },
        })

        if (contacts.length === 0) {
          response = `CON You have no active subscriptions.\n\n1. Subscribe to Alerts\n0. Back to Menu`
        } else {
          const list = contacts.map(c => `- ${c.name} (${c.label})`).join('\n')
          response = `CON Your Subscriptions:\n\n${list}\n\nActive: ${contacts.length}\n\n0. Back to Menu`
        }
      } else if (choice === '3') {
        // Recent documents (use PolicyDocument model)
        const docs = await db.policyDocument.findMany({
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { fileName: true, documentType: true, createdAt: true, policy: { select: { title: true } } },
        })

        if (docs.length === 0) {
          response = 'END No recent policy documents.\nThank you for using PolicyPulse.'
        } else {
          const list = docs
            .map((d, i) => `${i + 1}. ${d.policy?.title || d.fileName || 'Untitled'} (${d.documentType})`)
            .join('\n')
          response = `CON Recent Policy Changes:\n\n${list}\n\n0. Back to Menu`
        }
      } else if (choice === '4') {
        response = `CON Unsubscribe from PolicyPulse alerts?\n\n1. Yes, Unsubscribe\n2. No, Keep Active\n\n0. Back to Menu`
      } else {
        response = 'END Invalid selection.\nDial ' + SERVICE_CODE + ' to try again.'
      }
    } else if (step === 2) {
      const mainChoice = steps[0]
      const subChoice = steps[1]

      if (subChoice === '0') {
        // Go back to main menu
        response = `CON Welcome to PolicyPulse\n\n1. View Latest Alerts\n2. My Subscriptions\n3. Recent Policy Changes\n4. Unsubscribe`
      } else if (mainChoice === '1') {
        // Alert detail
        const alertIndex = parseInt(subChoice) - 1
        const alerts = await db.alert.findMany({
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { title: true, summary: true, severity: true },
        })

        if (alertIndex >= 0 && alertIndex < alerts.length) {
          const alert = alerts[alertIndex]
          const summary = (alert.summary || 'No details available.').slice(0, 140)
          response = `END [${alert.severity}] ${alert.title}\n\n${summary}\n\n- PolicyPulse Uganda`
        } else {
          response = 'END Invalid selection.\nDial ' + SERVICE_CODE + ' to try again.'
        }
      } else if (mainChoice === '4' && subChoice === '1') {
        // Unsubscribe — deactivate all contacts for this phone
        const phone = normalizePhone(phoneNumber)
        const result = await db.phoneContact.updateMany({
          where: { phoneNumber: phone, active: true },
          data: { active: false },
        })
        response = `END You have been unsubscribed from PolicyPulse alerts.\n(${result.count} contact(s) deactivated)\n\nDial ${SERVICE_CODE} to re-subscribe anytime.`
      } else if (mainChoice === '4' && subChoice === '2') {
        // Keep active — do nothing
        response = `END Good! You remain subscribed to PolicyPulse alerts.\nDial ${SERVICE_CODE} anytime to manage your subscription.`
      } else if (mainChoice === '2' && subChoice === '1') {
        // Subscribe — create a new contact
        response = `CON Enter your name to subscribe:\n(e.g. John Doe)`
      } else {
        response = 'END Invalid selection.\nDial ' + SERVICE_CODE + ' to try again.'
      }
    } else if (step === 3) {
      const mainChoice = steps[0]
      const subChoice = steps[1]
      const name = steps[2]

      if (mainChoice === '2' && subChoice === '1' && name.length > 0) {
        // Complete subscription
        const phone = normalizePhone(phoneNumber)

        // Check if contact already exists
        const existing = await db.phoneContact.findFirst({
          where: { phoneNumber: phone },
        })

        if (existing) {
          await db.phoneContact.update({
            where: { id: existing.id },
            data: { active: true, name },
          })
        } else {
          // Find any user to attach to (first admin)
          const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } })
          if (adminUser) {
            await db.phoneContact.create({
              data: {
                userId: adminUser.id,
                name,
                phoneNumber: phone,
                label: 'USSD Subscriber',
                active: true,
              },
            })
          }
        }

        response = `END Thank you ${name}!\nYou are now subscribed to PolicyPulse alerts.\n\nYou will receive SMS notifications for important policy changes in Uganda.\n\nDial ${SERVICE_CODE} to manage your subscription.`
      } else {
        response = 'END Invalid input.\nDial ' + SERVICE_CODE + ' to start again.'
      }
    } else {
      response = 'END Session ended.\nDial ' + SERVICE_CODE + ' to start again.'
    }

    // Return plain text with correct content type — NOT HTML, NOT JSON
    return new NextResponse(response, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (error) {
    console.error('USSD callback error:', error)

    // Even errors must return proper USSD format, never HTML
    return new NextResponse('END Service temporarily unavailable. Please try again later.', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  }
}

// Also handle GET requests (some gateways use GET)
export async function GET(req: NextRequest) {
  return new NextResponse(
    'END PolicyPulse USSD Service. Please dial ' + SERVICE_CODE + ' from your phone.',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    }
  )
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-+]/g, '')
  if (cleaned.startsWith('0')) return '256' + cleaned.slice(1)
  return cleaned
}
