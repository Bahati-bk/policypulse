import ZAI from 'z-ai-web-dev-sdk'
import { db } from './db'
import { z } from 'zod'

const AIResponseSchema = z.object({
  changes: z.array(z.object({
    changeType: z.enum(['ADDED', 'REMOVED', 'MODIFIED']),
    title: z.string(),
    description: z.string(),
    oldText: z.string().optional(),
    newText: z.string().optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    confidenceScore: z.number().min(0).max(1),
    affectedGroups: z.array(z.object({
      group: z.string(),
      confidence: z.number(),
      impact: z.string(),
    })),
    actions: z.array(z.object({
      action: z.string(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      deadline: z.string().optional(),
    })),
    sourceSection: z.string().optional(),
  })),
})

type AIChange = z.infer<typeof AIResponseSchema>['changes'][number]

export async function analyzeComparison(
  comparisonId: string,
  oldText: string,
  newText: string
) {
  const analysisRun = await db.aIAnalysisRun.create({
    data: {
      comparisonId,
      provider: 'z-ai-sdk',
      status: 'RUNNING',
    },
  })

  try {
    const zai = await ZAI.create()

    const prompt = `You are a legal policy analysis expert. Compare the OLD and NEW versions of a policy document and identify meaningful changes.

RULES:
- Only report actual text changes, do not hallucinate
- Base severity on real-world impact potential
- Use exact quoted text from the documents
- Be specific about who is affected
- Provide actionable recommendations with realistic deadlines

OLD DOCUMENT:
${oldText.slice(0, 4000)}

NEW DOCUMENT:
${newText.slice(0, 4000)}

Respond with a JSON object containing a "changes" array. Each change must have:
- changeType: "ADDED", "REMOVED", or "MODIFIED"
- title: Short summary of the change
- description: Detailed explanation in plain language
- oldText: The exact text from the old document (if applicable)
- newText: The exact text from the new document (if applicable)
- severity: "LOW", "MEDIUM", or "HIGH"
- confidenceScore: 0.0-1.0
- affectedGroups: array of {group, confidence, impact}
- actions: array of {action, priority, deadline}
- sourceSection: Section reference if available

Respond with ONLY the JSON, no markdown or explanation.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a legal policy analysis expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices[0]?.message?.content || ''
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = AIResponseSchema.safeParse(JSON.parse(jsonStr))

    if (!parsed.success) {
      throw new Error(`Invalid AI response: ${parsed.error.message}`)
    }

    const { changes } = parsed.data

    for (const change of changes) {
      const created = await db.policyChange.create({
        data: {
          comparisonId,
          changeType: change.changeType,
          title: change.title,
          description: change.description,
          oldText: change.oldText,
          newText: change.newText,
          severity: change.severity,
          confidenceScore: change.confidenceScore,
        },
      })

      if (change.sourceSection) {
        await db.sourceReference.create({
          data: {
            changeId: created.id,
            sectionTitle: change.sourceSection,
            quotedText: change.newText || change.oldText,
          },
        })
      }

      await db.impactAssessment.create({
        data: {
          changeId: created.id,
          severity: change.severity,
          rationale: change.description,
          actionRequired: change.actions.length > 0,
          deadline: change.actions[0]?.deadline,
          confidenceScore: change.confidenceScore,
          affectedGroups: JSON.stringify(change.affectedGroups),
          actions: JSON.stringify(change.actions),
        },
      })

      await db.alert.create({
        data: {
          changeId: created.id,
          title: `${change.changeType}: ${change.title}`,
          summary: change.description,
          whatChanged: change.description,
          whoIsAffected: change.affectedGroups.map(g => g.group).join(', '),
          whatToDo: change.actions.map(a => a.action).join('\n'),
          status: 'DRAFT',
        },
      })
    }

    await db.documentComparison.update({
      where: { id: comparisonId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    await db.aIAnalysisRun.update({
      where: { id: analysisRun.id },
      data: {
        status: 'COMPLETED',
        output: JSON.stringify(parsed.data),
        confidenceScore: parsed.data.changes.reduce((a, c) => a + c.confidenceScore, 0) / parsed.data.changes.length,
        completedAt: new Date(),
      },
    })

    return { success: true, changesCount: changes.length }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await db.aIAnalysisRun.update({
      where: { id: analysisRun.id },
      data: { status: 'FAILED', errorMessage: msg },
    })
    await db.documentComparison.update({
      where: { id: comparisonId },
      data: { status: 'FAILED', errorMessage: msg },
    })
    throw error
  }
}
