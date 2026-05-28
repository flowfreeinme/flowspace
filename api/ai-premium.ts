// api/ai-premium.ts
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const AI_ALLOWED_EMAILS = (process.env.AI_ALLOWED_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(ctx: any): string {
  const parts: string[] = []

  if (ctx?.mode === 'board' && ctx.board) {
    parts.push(`You are a powerful AI research assistant inside FlowSpace, a visual board workspace.`)
    parts.push(`The user is viewing a board called "${ctx.board.title || 'Untitled'}".`)
    if (ctx.board.sections?.length) {
      parts.push(`Board sections:\n${ctx.board.sections.map((s: any) => `- ${s.title}`).join('\n')}`)
    }
    if (ctx.board.cards?.length) {
      parts.push(`Board cards:\n${ctx.board.cards.map((c: any) => `- ${c.text}`).filter((t: string) => t.trim()).join('\n')}`)
    }
  } else if (ctx?.mode === 'page' && ctx.page) {
    parts.push(`You are a powerful AI research assistant inside FlowSpace.`)
    parts.push(`The user is editing a page called "${ctx.page.title || 'Untitled'}".`)
    if (ctx.page.blocks?.length) {
      const text = ctx.page.blocks.map((b: any) => b.content).join('\n').slice(0, 2000)
      parts.push(`Page content:\n${text}`)
    }
  } else {
    parts.push(`You are a powerful AI research assistant inside FlowSpace.`)
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

  parts.push(`Answer the user's question thoroughly. Use web search when current or factual information would help.
When planning days or task systems, use calendar event times/locations, timeline dated items, kanban status, and flowchart order together.
When the user requests a calendar range, use every listed calendar event in earliest-to-latest order.
Respond in plain, readable text. Be direct and useful.`)

  return parts.join('\n\n')
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
    const email = user.email?.toLowerCase() ?? ''
    if (!AI_ALLOWED_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Premium AI feature not available for this account.' })
    }
  } catch {
    return res.status(401).json({ error: 'Could not verify identity.' })
  }

  const { messages, workspaceContext } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set.' })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: buildSystemPrompt(workspaceContext),
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const message = textBlock?.type === 'text' ? textBlock.text.trim() : 'No response.'
    return res.json({ message, actions: [] })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Premium AI service error' })
  }
}
