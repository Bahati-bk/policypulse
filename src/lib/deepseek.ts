// Deepseek AI Service — OpenAI-compatible API integration
// Used for policy analysis, comparison, and personalized insights

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DeepseekResponse {
  choices: Array<{
    message: {
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function deepseekChat(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const { temperature = 0.3, maxTokens = 4000, jsonMode = false } = options || {}

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  }

  if (jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(DEEPSEEK_API_KEY ? { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Deepseek API error (${response.status}): ${errText}`)
  }

  const data: DeepseekResponse = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function analyzePolicyRelevance({
  policyTitle,
  policyDescription,
  policyType,
  issuingAuthority,
  userSectors,
  userBusinessType,
  userEmploymentStatus,
  userInterests,
}: {
  policyTitle: string
  policyDescription: string
  policyType: string
  issuingAuthority: string | null
  userSectors: string[]
  userBusinessType: string | null
  userEmploymentStatus: string | null
  userInterests: string[]
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a Ugandan policy analysis expert advisor. You provide clear, actionable, and personalized insights about how policies affect specific individuals and organizations.
You understand the Ugandan legal and regulatory framework deeply.
Always respond in valid JSON format with the following structure:
{
  "relevanceScore": <number 0-100>,
  "relevanceLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "<2-3 sentence summary of why this policy matters to the user>",
  "keyImpacts": [
    { "area": "<impact area>", "description": "<what changes>", "severity": "LOW" | "MEDIUM" | "HIGH", "actionRequired": true/false }
  ],
  "complianceSteps": ["<step 1>", "<step 2>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"]
}`,
    },
    {
      role: 'user',
      content: `Analyze this Ugandan policy's relevance to a specific user:

POLICY:
- Title: ${policyTitle}
- Type: ${policyType}
- Description: ${policyDescription}
- Issuing Authority: ${issuingAuthority || 'N/A'}

USER PROFILE:
- Sectors of interest: ${userSectors.join(', ') || 'Not specified'}
- Business type: ${userBusinessType || 'Not specified'}
- Employment status: ${userEmploymentStatus || 'Not specified'}
- Policy interests: ${userInterests.join(', ') || 'Not specified'}

Provide a personalized relevance analysis in JSON format.`,
    },
  ]

  return deepseekChat(messages, { temperature: 0.3, jsonMode: true })
}

export async function generatePersonalizedInsights({
  policies,
  userSectors,
  userBusinessType,
  userEmploymentStatus,
  userInterests,
  userRole,
  recentChanges,
}: {
  policies: Array<{ id: string; title: string; description: string | null; policyType: string; issuingAuthority: string | null; category?: string | null }>
  userSectors: string[]
  userBusinessType: string | null
  userEmploymentStatus: string | null
  userInterests: string[]
  userRole: string
  recentChanges: Array<{ title: string; severity: string; changeType: string }>
}): Promise<string> {
  const policiesSummary = policies
    .slice(0, 20)
    .map(p => `- [${p.policyType}] ${p.title}${p.category ? ` (${p.category})` : ''}: ${(p.description || '').slice(0, 120)}`)
    .join('\n')

  const changesSummary = recentChanges
    .slice(0, 10)
    .map(c => `- [${c.severity}] ${c.title} (${c.changeType})`)
    .join('\n')

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are PolicyPulse AI, an expert Ugandan policy advisor. You provide personalized, actionable policy intelligence.

You analyze the user's profile, their subscribed sectors/interests, and the current policy landscape to generate highly relevant insights.

You understand:
- Ugandan law (Acts, Regulations, Guidelines, Policies, Directives)
- How policies affect different business types (SME, Corporation, Government, NGO, Individual)
- Compliance requirements and deadlines
- Risk assessment for policy non-compliance

Respond in valid JSON with this structure:
{
  "greeting": "<Personalized 1-sentence greeting>",
  "priorityAlerts": [
    { "policyId": "<id>", "title": "<alert title>", "severity": "HIGH"|"CRITICAL", "description": "<why urgent>", "action": "<what to do>" }
  ],
  "policyRecommendations": [
    { "policyId": "<id>", "policyTitle": "<title>", "relevanceScore": <0-100>, "reason": "<why relevant>", "actionItems": ["<item 1>"] }
  ],
  "complianceChecklist": [
    { "area": "<area>", "status": "COMPLIANT"|"ACTION_NEEDED"|"AT_RISK", "details": "<explanation>" }
  ],
  "trends": [
    { "topic": "<trend topic>", "direction": "INCREASING"|"DECREASING"|"STABLE", "summary": "<1-2 sentence description>" }
  ],
  "upcomingDeadlines": [
    { "title": "<deadline title>", "date": "<date or timeframe>", "relatedPolicy": "<policy name>" }
  ]
}`,
    },
    {
      role: 'user',
      content: `Generate personalized policy insights for this user:

USER PROFILE:
- Role: ${userRole}
- Business type: ${userBusinessType || 'Not specified'}
- Employment status: ${userEmploymentStatus || 'Not specified'}
- Subscribed sectors: ${userSectors.join(', ') || 'None'}
- Policy interests: ${userInterests.join(', ') || 'None'}

CURRENT POLICY LANDSCAPE (${policies.length} policies tracked):
${policiesSummary}

RECENT POLICY CHANGES (${recentChanges.length} changes):
${changesSummary || 'No recent changes detected'}

Provide a comprehensive, personalized analysis.`,
    },
  ]

  return deepseekChat(messages, { temperature: 0.4, maxTokens: 4000, jsonMode: true })
}

export async function comparePoliciesAI({
  policy1,
  policy2,
  userContext,
}: {
  policy1: { title: string; description: string | null; policyType: string }
  policy2: { title: string; description: string | null; policyType: string }
  userContext: string
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a legal policy comparison expert specializing in Ugandan law.
Compare two policies and provide insights about their relationships, overlaps, and combined impact.

Respond in valid JSON:
{
  "relationship": "COMPLEMENTARY"|"OVERLAPPING"|"CONFLICTING"|"HIERARCHICAL"|"UNRELATED",
  "summary": "<2-3 sentence overview of how these policies relate>",
  "overlaps": [
    { "topic": "<overlap topic>", "policy1Aspect": "<how policy 1 addresses it>", "policy2Aspect": "<how policy 2 addresses it>", "conflict": true/false, "notes": "<explanation>" }
  ],
  "combinedImpact": "<How these policies together affect the user>",
  "keyDifferences": [
    { "aspect": "<aspect>", "policy1": "<policy 1 stance>", "policy2": "<policy 2 stance>" }
  ],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}`,
    },
    {
      role: 'user',
      content: `Compare these two Ugandan policies:

POLICY 1:
- Title: ${policy1.title}
- Type: ${policy1.policyType}
- Description: ${policy1.description || 'N/A'}

POLICY 2:
- Title: ${policy2.title}
- Type: ${policy2.policyType}
- Description: ${policy2.description || 'N/A'}

USER CONTEXT: ${userContext}

Provide a detailed comparison.`,
    },
  ]

  return deepseekChat(messages, { temperature: 0.3, maxTokens: 3000, jsonMode: true })
}

export async function explainPolicyChange({
  changeTitle,
  changeDescription,
  changeType,
  severity,
  oldText,
  newText,
  policyTitle,
  userContext,
}: {
  changeTitle: string
  changeDescription: string | null
  changeType: string
  severity: string
  oldText: string | null
  newText: string | null
  policyTitle: string
  userContext: string
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a policy communication expert. Explain policy changes in plain, accessible language.
Avoid legal jargon. Be practical and actionable.

Respond in valid JSON:
{
  "plainEnglishSummary": "<2-3 sentence explanation anyone can understand>",
  "whatItMeans": "<practical explanation of the impact>",
  "whoNeedsToAct": ["<group 1>", "<group 2>"],
  "stepsToComply": ["<step 1>", "<step 2>", "<step 3>"],
  "deadlines": [{ "action": "<action>", "timeframe": "<when>" }],
  "faq": [
    { "question": "<common question>", "answer": "<answer>" }
  ]
}`,
    },
    {
      role: 'user',
      content: `Explain this policy change in plain language:

POLICY: ${policyTitle}
CHANGE: ${changeTitle}
TYPE: ${changeType}
SEVERITY: ${severity}

${changeDescription ? `DETAILS: ${changeDescription}` : ''}
${oldText ? `OLD TEXT:\n${oldText}` : ''}
${newText ? `NEW TEXT:\n${newText}` : ''}

USER CONTEXT: ${userContext}

Make it practical and actionable.`,
    },
  ]

  return deepseekChat(messages, { temperature: 0.4, maxTokens: 2000, jsonMode: true })
}
