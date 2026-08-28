import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await db.policyDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.policyDocument.update({
    where: { id },
    data: { processingStatus: 'PROCESSING' },
  })

  try {
    let extractedText: string | null = null
    if (doc.storageKey && doc.documentType === 'TXT') {
      const filePath = path.join('/home/z/my-project/upload', doc.storageKey)
      if (fs.existsSync(filePath)) {
        extractedText = fs.readFileSync(filePath, 'utf-8')
      }
    }

    const updated = await db.policyDocument.update({
      where: { id },
      data: {
        processingStatus: extractedText ? 'READY' : 'FAILED',
        processingError: extractedText ? null : 'Could not extract text',
        extractedText,
      },
    })

    await db.auditLog.create({
      data: { actorUserId: user.id, action: 'PROCESS', entityType: 'PolicyDocument', entityId: id, metadata: JSON.stringify({ status: updated.processingStatus }) },
    })

    return NextResponse.json(updated)
  } catch (error) {
    await db.policyDocument.update({
      where: { id },
      data: { processingStatus: 'FAILED', processingError: String(error) },
    })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}