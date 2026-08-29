import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { deepseekChat } from '@/lib/deepseek'
import fs from 'fs'
import path from 'path'


interface AIChange {
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RESTRUCTURED'
  description: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  section: string
  recommendation: string
  oldText?: string
  newText?: string
  title: string
  confidenceScore: number
}

function extractText(base64: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const buffer = Buffer.from(base64, 'base64')

  if (ext === 'txt' || ext === 'md') {
    return buffer.toString('utf-8')
  }

  // For PDF and DOCX, store a placeholder and attempt basic text extraction
  if (ext === 'pdf') {
    // Basic text extraction from PDF (extracts visible text streams)
    const text = buffer.toString('latin1')
    const textParts: string[] = []
    const regex = /\(([\x20-\x7E\n\r\t]+)\)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      const t = match[1].trim()
      if (t.length > 2 && !/^\d+$/.test(t) && !/^[A-Z-]+$/.test(t)) {
        textParts.push(t)
      }
    }
    const extracted = textParts.join(' ')
    if (extracted.length > 50) return extracted.slice(0, 8000)
    // Fallback: try to find text between stream markers
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
    while ((match = streamRegex.exec(text)) !== null) {
      const content = match[1]
      // Decode PDF text
      const decoded = content
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      if (decoded.trim().length > 20) {
        textParts.push(decoded.trim())
      }
    }
    const fallback = textParts.join(' ').replace(/\s+/g, ' ').trim()
    return fallback.length > 50 ? fallback.slice(0, 8000) : `[PDF document: ${filename}. Text extraction limited for binary PDF files. Raw text not available.]`
  }

  if (ext === 'docx') {
    // Basic DOCX: look for XML text content
    const text = buffer.toString('utf-8')
    const xmlText: string[] = []
    const tagRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
    let tagMatch: RegExpExecArray | null
    while ((tagMatch = tagRegex.exec(text)) !== null) {
      xmlText.push(tagMatch[1])
    }
    const joined = xmlText.join(' ').replace(/\s+/g, ' ').trim()
    return joined.length > 50 ? joined.slice(0, 8000) : `[DOCX document: ${filename}. Text extraction limited for binary DOCX files.]`
  }

  // Unknown format: return the raw bytes as text (best effort)
  return buffer.toString('utf-8').slice(0, 8000)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { title, description, policyId, oldFile, newFile, oldFilename, newFilename } = body

    if (!policyId || !oldFile || !newFile || !oldFilename || !newFilename) {
      return NextResponse.json({ error: 'All fields required: policyId, oldFile, newFile, oldFilename, newFilename' }, { status: 400 })
    }

    const policy = await db.policy.findUnique({ where: { id: policyId } })
    if (!policy) return NextResponse.json({ error: 'Policy not found' }, { status: 404 })

    // Extract text from both files
    const oldText = extractText(oldFile, oldFilename)
    const newText = extractText(newFile, newFilename)

    if (!oldText || !newText) {
      return NextResponse.json({ error: 'Could not extract text from uploaded files. Please upload TXT files for best results.' }, { status: 400 })
    }

    // Save files to disk
    const uploadDir = '/home/z/my-project/upload'
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

    const oldStorageKey = `${Date.now()}-old-${oldFilename}`
    const newStorageKey = `${Date.now()}-new-${newFilename}`
    fs.writeFileSync(path.join(uploadDir, oldStorageKey), Buffer.from(oldFile, 'base64'))
    fs.writeFileSync(path.join(uploadDir, newStorageKey), Buffer.from(newFile, 'base64'))

    // Determine document types
    const oldExt = oldFilename.split('.').pop()?.toUpperCase() || 'TXT'
    const newExt = newFilename.split('.').pop()?.toUpperCase() || 'TXT'
    const oldDocType = (oldExt === 'DOCX' || oldExt === 'TXT') ? oldExt : 'PDF'
    const newDocType = (newExt === 'DOCX' || newExt === 'TXT') ? newExt : 'PDF'

    // Create both documents
    const oldDoc = await db.policyDocument.create({
      data: {
        policyId,
        version: 'Original',
        documentType: oldDocType,
        storageKey: oldStorageKey,
        fileName: oldFilename,
        processingStatus: 'READY',
        extractedText: oldText,
      },
    })

    const newDoc = await db.policyDocument.create({
      data: {
        policyId,
        version: 'Amended',
        documentType: newDocType,
        storageKey: newStorageKey,
        fileName: newFilename,
        processingStatus: 'READY',
        extractedText: newText,
      },
    })

    // Create comparison
    const comparison = await db.documentComparison.create({
      data: {
        oldDocumentId: oldDoc.id,
        newDocumentId: newDoc.id,
        createdBy: user.id,
        status: 'ANALYZING',
      },
    })

    // Create AI analysis run
    const analysisRun = await db.aIAnalysisRun.create({
      data: {
        comparisonId: comparison.id,
        provider: 'deepseek',
        status: 'RUNNING',
      },
    })

    await db.auditLog.create({
      data: { actorUserId: user.id, action: 'CREATE', entityType: 'DocumentComparison', entityId: comparison.id, metadata: JSON.stringify({ title, source: 'ai-compare' }) },
    })

    // Call Deepseek AI for comparison
    const aiPrompt = `You are an expert legal policy analyst specializing in Ugandan law and regulation. Compare the OLD and NEW versions of a policy document and identify ALL meaningful changes.

POLICY: ${policy.title}
${description ? `CONTEXT: ${description}` : ''}

OLD DOCUMENT (${oldFilename}):
${oldText.slice(0, 6000)}

NEW DOCUMENT (${newFilename}):
${newText.slice(0, 6000)}

RULES:
- Only report actual text changes between the documents, do not hallucinate
- Use exact quoted text from the documents where possible
- Base severity on real-world impact potential (HIGH = significant legal/compliance implications, MEDIUM = moderate changes, LOW = minor/clerical)
- Be specific about which section each change belongs to
- Provide actionable recommendations
- changeType must be one of: ADDED (new text added), MODIFIED (text changed), REMOVED (text deleted), RESTRUCTURED (content reorganized)

Respond with a JSON object containing a "changes" array. Each change must have:
- changeType: "ADDED", "MODIFIED", "REMOVED", or "RESTRUCTURED"
- title: Short summary of the change (max 80 chars)
- description: Detailed explanation of what changed and why it matters (2-4 sentences)
- oldText: The exact text from the old document (if applicable)
- newText: The exact text from the new document (if applicable)
- severity: "HIGH", "MEDIUM", or "LOW"
- section: The section or part of the document where this change occurs
- recommendation: Actionable advice on how to respond to this change
- confidenceScore: 0.0-1.0 (how confident you are this is a real change)

Respond with ONLY valid JSON, no markdown or explanation. Example:
{"changes": [{"changeType": "MODIFIED", "title": "...", "description": "...", "oldText": "...", "newText": "...", "severity": "HIGH", "section": "Section 5", "recommendation": "...", "confidenceScore": 0.95}]}`

    let aiChanges: AIChange[] = []
    try {
      const aiResponse = await deepseekChat(
        [
          { role: 'system', content: 'You are a legal policy analysis expert. Always respond with valid JSON only. No markdown formatting.' },
          { role: 'user', content: aiPrompt },
        ],
        { temperature: 0.2, maxTokens: 6000, jsonMode: true }
      )

      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      aiChanges = Array.isArray(parsed.changes) ? parsed.changes : []
    } catch (aiError) {
      const msg = aiError instanceof Error ? aiError.message : 'AI analysis failed'
      // Still return the comparison but note the AI failure
      await db.documentComparison.update({
        where: { id: comparison.id },
        data: { status: 'FAILED', errorMessage: `AI Error: ${msg}` },
      })
      await db.aIAnalysisRun.update({
        where: { id: analysisRun.id },
        data: { status: 'FAILED', errorMessage: msg },
      })

      // Return comparison with no changes but include the documents
      const result = await db.documentComparison.findUnique({
        where: { id: comparison.id },
        include: {
          oldDocument: { include: { policy: true } },
          newDocument: { include: { policy: true } },
          creator: { select: { id: true, name: true, email: true } },
          changes: { include: { assessment: true }, orderBy: { createdAt: 'desc' } },
          _count: { select: { changes: true } },
        },
      })
      return NextResponse.json({ comparison: result, aiError: msg })
    }

    // Save AI changes to database
    for (const change of aiChanges) {
      const validSeverity = ['HIGH', 'MEDIUM', 'LOW'].includes(change.severity) ? change.severity : 'MEDIUM'
      const validType = ['ADDED', 'MODIFIED', 'REMOVED', 'RESTRUCTURED'].includes(change.changeType) ? change.changeType : 'MODIFIED'

      const created = await db.policyChange.create({
        data: {
          comparisonId: comparison.id,
          changeType: validType,
          title: change.title || 'Untitled Change',
          description: change.description,
          oldText: change.oldText,
          newText: change.newText,
          severity: validSeverity,
          confidenceScore: change.confidenceScore || 0.5,
        },
      })

      // Create source reference with section
      if (change.section) {
        await db.sourceReference.create({
          data: {
            changeId: created.id,
            sectionTitle: change.section,
            quotedText: change.newText || change.oldText,
          },
        })
      }

      // Create impact assessment with recommendation
      await db.impactAssessment.create({
        data: {
          changeId: created.id,
          severity: validSeverity,
          rationale: change.description,
          actionRequired: !!change.recommendation,
          confidenceScore: change.confidenceScore || 0.5,
          affectedGroups: JSON.stringify([]),
          actions: JSON.stringify(change.recommendation ? [{ action: change.recommendation, priority: validSeverity, deadline: undefined }] : []),
        },
      })
    }

    // Mark comparison as completed
    await db.documentComparison.update({
      where: { id: comparison.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    await db.aIAnalysisRun.update({
      where: { id: analysisRun.id },
      data: {
        status: 'COMPLETED',
        output: JSON.stringify({ changes: aiChanges }),
        confidenceScore: aiChanges.length > 0
          ? aiChanges.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / aiChanges.length
          : 0,
        completedAt: new Date(),
      },
    })

    // Fetch and return the full comparison with all data
    const result = await db.documentComparison.findUnique({
      where: { id: comparison.id },
      include: {
        oldDocument: { include: { policy: true } },
        newDocument: { include: { policy: true } },
        creator: { select: { id: true, name: true, email: true } },
        changes: {
          include: { assessment: true, references: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { changes: true } },
      },
    })

    return NextResponse.json({ comparison: result, changesCount: aiChanges.length })
  } catch (error) {
    console.error('AI Compare error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
