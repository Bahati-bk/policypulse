import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, SessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { autoSendSmsAlert } from '@/lib/sms'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const policyId = searchParams.get('policyId')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (policyId) where.policyId = policyId
  if (status) where.processingStatus = status

  const docs = await db.policyDocument.findMany({
    where,
    include: { policy: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(docs)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const title = formData.get('title') as string
    const policyId = formData.get('policyId') as string
    const version = formData.get('version') as string
    const file = formData.get('file') as File | null

    if (!title || !policyId) {
      return NextResponse.json({ error: 'Title and policy are required' }, { status: 400 })
    }

    let documentType = 'PDF'
    let extractedText: string | null = null
    let storageKey: string | null = null
    let fileName: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()?.toUpperCase()
      documentType = (ext === 'TXT' || ext === 'DOCX') ? ext! : 'PDF'
      fileName = file.name
      storageKey = `${Date.now()}-${file.name}`
      const uploadDir = '/home/z/my-project/upload'
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(path.join(uploadDir, storageKey), buffer)

      if (documentType === 'TXT') {
        extractedText = buffer.toString('utf-8')
      }
    }

    const doc = await db.policyDocument.create({
      data: {
        policyId,
        version: version || undefined,
        documentType,
        storageKey,
        fileName,
        processingStatus: extractedText ? 'READY' : 'UPLOADED',
        extractedText,
      },
    })

    await db.auditLog.create({
      data: { actorUserId: user.id, action: 'CREATE', entityType: 'PolicyDocument', entityId: doc.id, metadata: JSON.stringify({ title, fileName }) },
    })

    // Auto-send SMS to all saved contacts on document upload
    try {
      const smsResult = await autoSendSmsAlert({
        userId: user.id,
        title: `[New Document] ${title}`,
        summary: `A new document "${fileName || title}" has been uploaded for policy review.`,
        source: 'Document Upload',
      })
      if (smsResult.queued > 0) {
        console.log(`Auto-queued ${smsResult.queued} SMS for document upload ${doc.id}`)
      }
    } catch (smsErr) {
      console.error('Auto-SMS failed for document upload:', smsErr)
    }

    return NextResponse.json({ ...doc, _smsQueued: true }, { status: 201 })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
