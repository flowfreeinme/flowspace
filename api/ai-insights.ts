import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    try {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
        process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
      )
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) return res.status(401).json({ error: 'Unauthorized' })
    } catch {
      return res.status(401).json({ error: 'Could not verify identity.' })
    }
  }

  const { pageContent, candidateActions, pageSummaries } = req.body
  if (typeof pageContent !== 'string') return res.status(400).json({ error: 'Missing pageContent' })
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'AI service not configured.' })

  const prompt = `You are an AI assistant analysing a user's workspace page to extract action items and recommend what to work on next.

Current page content:
${pageContent.slice(0, 1500)}

Candidate action items detected by heuristics:
${Array.isArray(candidateActions) && candidateActions.length ? candidateActions.map((a: string) => `- ${a}`).join('\n') : 'None detected'}

Other pages in workspace (id | title | last modified):
${Array.isArray(pageSummaries) ? pageSummaries.slice(0, 20).map((p: { id: string; title: string; updatedAt: number }) => `${p.id} | "${p.title}" | ${new Date(p.updatedAt).toLocaleDateString()}`).join('\n') : 'No other pages'}

Respond with valid JSON only — no text before or after:
{
  "confirmedActions": ["action item text"],
  "whatNext": { "pageId": "uuid", "reason": "one sentence reason" },
  "additionalRelated": [{ "id": "uuid", "title": "page title" }]
}

Rules:
- confirmedActions: clean and deduplicate the candidate actions. Remove false positives. Max 8 items.
- whatNext: page to work on next from the workspace list. Must be one of the listed page IDs. If no clear recommendation, omit this field entirely.
- additionalRelated: semantically related pages beyond keyword overlap. Max 3.
- Output JSON only. Nothing else.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
    try {
      const data = JSON.parse(raw)
      return res.json({
        confirmedActions: Array.isArray(data.confirmedActions) ? data.confirmedActions.slice(0, 8) : [],
        whatNext: data.whatNext?.pageId ? { pageId: data.whatNext.pageId, reason: String(data.whatNext.reason ?? '') } : null,
        additionalRelated: Array.isArray(data.additionalRelated) ? data.additionalRelated.slice(0, 3) : [],
      })
    } catch {
      return res.json({ confirmedActions: [], whatNext: null, additionalRelated: [] })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'AI service error' })
  }
}
