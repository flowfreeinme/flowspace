// api/ai.ts
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function buildSystemPrompt(ctx: any): string {
  const parts: string[] = []

  if (ctx?.mode === 'board' && ctx.board) {
    parts.push(`You are an AI assistant inside FlowSpace, a visual board workspace.`)
    parts.push(`The user is viewing a board called "${ctx.board.title || 'Untitled'}".`)
    parts.push(
      ctx.board.sections?.length
        ? `Current sections:\n${ctx.board.sections.map((s: any) => `- ${s.title}`).join('\n')}`
        : 'No sections yet.'
    )
    parts.push(
      ctx.board.cards?.length
        ? `Current cards:\n${ctx.board.cards.map((c: any) => `- ${c.text}`).filter((t: string) => t.trim()).join('\n')}`
        : 'No cards yet.'
    )
  } else if (ctx?.mode === 'page' && ctx.page) {
    parts.push(`You are an AI writing assistant inside FlowSpace.`)
    parts.push(`The user is editing a page called "${ctx.page.title || 'Untitled'}".`)
    if (ctx.page.blocks?.length) {
      const text = ctx.page.blocks.map((b: any) => b.content).join('\n').slice(0, 1000)
      parts.push(`Page content:\n${text}`)
    }
  } else {
    parts.push(`You are an AI assistant inside FlowSpace.`)
  }

  if (ctx?.allBoards?.length) {
    parts.push(
      `\nOther boards in this workspace:\n${ctx.allBoards
        .map((b: any) => `- ${b.title}${b.sections?.length ? `: ${b.sections.join(', ')}` : ''}`)
        .join('\n')}`
    )
  }
  if (ctx?.calendar?.length) {
    if (ctx?.calendarRange) {
      parts.push(`Calendar request window: ${ctx.calendarRange.label} (${ctx.calendarRange.start} to ${ctx.calendarRange.end}). Events below are already filtered to this window and sorted earliest to latest.`)
    }
    parts.push(
      `\nUpcoming calendar events:\n${ctx.calendar.map((e: any) => {
        const exact = e.start
          ? ` [${e.start}${e.startTime ? ` ${e.startTime}` : ''} to ${e.end || e.start}${e.endTime ? ` ${e.endTime}` : ''}]`
          : ''
        return `- ${e.date}: ${e.title}${e.location ? ` @ ${e.location}` : ''}${exact}`
      }).join('\n')}`
    )
  }
  if (ctx?.workflows?.length) {
    parts.push(
      `\nWorkflow planning context:\n${ctx.workflows
        .map((w: any) => `- ${w.type} on ${w.pageTitle || 'Untitled'}:\n${(w.items || []).map((item: string) => `  - ${item}`).join('\n')}`)
        .join('\n')}`
    )
  }

  parts.push(`
You MUST respond with valid JSON only — no text before or after:
{"message":"Your reply here","actions":[]}

Available action types:
{"type":"clear_board"}
{"type":"create_section","title":"Section title"}
{"type":"create_card","text":"Card text","section":"Section title"}
{"type":"delete_card","text":"Card text to delete"}
{"type":"delete_section","title":"Section title to delete"}
{"type":"rename_section","title":"Old title","newTitle":"New title"}
{"type":"move_card","text":"Card text","toSection":"Target section title"}
{"type":"replace_selection","text":"Replacement text"}
{"type":"create_workflow","workflowType":"timeline","title":"Schedule","items":[{"title":"Event","start":"YYYY-MM-DD","end":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","location":"Place"}]}
{"type":"create_workflow","workflowType":"kanban","items":[{"title":"Task","status":"todo|in-progress|done"}]}
{"type":"create_workflow","workflowType":"flowchart","items":[{"title":"Step one"},{"title":"Step two"}]}

Rules:
- Output JSON only. Nothing else.
- Always include "message".
- For board reformats: clear_board first, then sections, then cards.
- Keep card text under 15 words.
- When planning days or schedules, use calendar event times/locations, timeline dated items, kanban status, and flowchart order together.
- Use create_workflow when the user asks for a timeline, kanban, flowchart, schedule, task pipeline, or step-by-step day map.
- Use 24-hour HH:mm times and YYYY-MM-DD dates in create_workflow timeline items.
- When creating a timeline from a requested calendar range, include one timeline item for every calendar event listed in that range and keep them earliest to latest.
- Prefer board sections/cards for simple lists, timeline for fixed times/dates, kanban for task status, and flowchart for order/dependencies.
- For text transforms (rewrite/expand/summarize/fix grammar): return a single replace_selection action with the transformed text in "text". Put a brief description in "message".
- For questions only, keep actions as [].`)

  return parts.join('\n\n')
}

function parseResponse(raw: string) {
  const cleaned = raw
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      message: typeof parsed.message === 'string' ? parsed.message : cleaned,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    }
  } catch {
    return { message: cleaned || 'No response.', actions: [] }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
  } catch {
    return res.status(401).json({ error: 'Could not verify identity.' })
  }

  const { messages, workspaceContext } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' })
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'AI service not configured.' })

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0,
      messages: [
        { role: 'system', content: buildSystemPrompt(workspaceContext) },
        ...messages,
      ],
    })
    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    return res.json(parseResponse(raw))
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'AI service error' })
  }
}
