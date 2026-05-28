# AI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new board actions, an AI text-selection toolbar for the page editor, richer workspace context (all boards + calendar), and a premium Claude tier — all using Groq for free users and Claude Sonnet 4.6 for premium (allowlisted) users on conceptual queries.

**Architecture:** Three-tier routing — local regex router (free, instant) → Groq `/api/ai` (all users, action queries) → Claude `/api/ai-premium` (premium allowlisted users, conceptual/research queries). A new `AiTextToolbar` component attaches to `BlockEditor` via text-selection events and fires one-shot transforms via Groq. `WorkspaceContext` replaces `BoardContext` everywhere.

**Tech Stack:** React 18, TypeScript, Vite, Groq SDK (`llama-3.3-70b-versatile`), Anthropic SDK (`claude-sonnet-4-6`), Zustand, Tailwind CSS, Vercel serverless functions

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/aiTypes.ts` | Create | Shared `WorkspaceContext` + `AiAction` types |
| `api/ai.ts` | Rewrite | Groq endpoint, all users, new context + actions |
| `api/ai-premium.ts` | Create | Claude endpoint, premium users, web search |
| `api/ai-free.ts` | Delete | Replaced by `api/ai.ts` |
| `src/lib/aiRouter.ts` | Modify | Fix rename stub, add delete/rename/move patterns |
| `src/components/AiPanel.tsx` | Modify | WorkspaceContext props, premium routing |
| `src/components/BoardView.tsx` | Modify | 4 new action handlers, pass full WorkspaceContext |
| `src/components/AiTextToolbar.tsx` | Create | Text selection toolbar for BlockEditor |
| `src/components/BlockEditor.tsx` | Modify | Wire AiTextToolbar, handle replace_selection |

---

### Task 1: Create shared AI types

**Files:**
- Create: `src/lib/aiTypes.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/aiTypes.ts
export interface WorkspaceContext {
  mode: 'board' | 'page'
  board?: {
    title: string
    sections: { title: string }[]
    cards: { text: string }[]
  }
  page?: {
    title: string
    blocks: { type: string; content: string }[]
  }
  allBoards?: { title: string; sections: string[] }[]
  calendar?: { title: string; date: string }[]
}

export interface AiAction {
  type:
    | 'clear_board'
    | 'create_section'
    | 'create_card'
    | 'delete_card'
    | 'delete_section'
    | 'rename_section'
    | 'move_card'
    | 'replace_selection'
  title?: string
  newTitle?: string
  text?: string
  section?: string
  toSection?: string
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing `aiTypes.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/aiTypes.ts && git commit -m "feat: add shared WorkspaceContext and AiAction types"
```

---

### Task 2: Rewrite `api/ai.ts` — Groq for all users

**Files:**
- Modify: `api/ai.ts`

- [ ] **Step 1: Replace the full file**

```ts
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
    parts.push(
      `\nUpcoming calendar events:\n${ctx.calendar.map((e: any) => `- ${e.date}: ${e.title}`).join('\n')}`
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

Rules:
- Output JSON only. Nothing else.
- Always include "message".
- For board reformats: clear_board first, then sections, then cards.
- Keep card text under 15 words.
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
```

- [ ] **Step 2: Commit**

```bash
git add api/ai.ts && git commit -m "feat: rewrite /api/ai — Groq for all users, WorkspaceContext, 8 action types"
```

---

### Task 3: Create `api/ai-premium.ts` — Claude for premium users

**Files:**
- Create: `api/ai-premium.ts`

- [ ] **Step 1: Create the file**

```ts
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
    parts.push(
      `\nUpcoming calendar events:\n${ctx.calendar.map((e: any) => `- ${e.date}: ${e.title}`).join('\n')}`
    )
  }

  parts.push(`Answer the user's question thoroughly. Use web search when current or factual information would help.
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
    const email = user?.email?.toLowerCase() ?? ''
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
```

- [ ] **Step 2: Commit**

```bash
git add api/ai-premium.ts && git commit -m "feat: add /api/ai-premium — Claude with web search for premium users"
```

---

### Task 4: Update `src/lib/aiRouter.ts`

**Files:**
- Modify: `src/lib/aiRouter.ts`

- [ ] **Step 1: Update the import at line 1**

Change:
```ts
import type { AiAction } from '@/components/AiPanel'
```
to:
```ts
import type { AiAction } from '@/lib/aiTypes'
```

- [ ] **Step 2: Remove the old rename stub (around line 69-73)**

Remove this block entirely:
```ts
  // ── rename section ─────────────────────────────────────────────────────────
  const renameSec = msg.match(/^rename\s+section\s+["']?(.+?)["']?\s+to\s+["']?(.+?)["']?\s*$/)
  if (renameSec) {
    // Not yet a supported action type — respond helpfully
    return { handled: true, message: 'Renaming sections directly isn\'t supported yet. You can delete and recreate the section, or ask me to reorganize the board.' }
  }
```

- [ ] **Step 3: Add four new patterns before the final `return { handled: false }`**

Add these four blocks immediately after the `// ── help` block and before `return { handled: false }`:

```ts
  // ── delete card ────────────────────────────────────────────────────────────
  const delCard = msg.match(/^(delete|remove)\s+card\s+["']?(.+?)["']?\s*$/)
  if (delCard) {
    const text = delCard[2].trim()
    return { handled: true, message: `Deleted card "${text}".`, actions: [{ type: 'delete_card', text }] }
  }

  // ── delete section ─────────────────────────────────────────────────────────
  const delSec = msg.match(/^(delete|remove)\s+section\s+["']?(.+?)["']?\s*$/)
  if (delSec) {
    const title = delSec[2].trim()
    return { handled: true, message: `Deleted section "${title}".`, actions: [{ type: 'delete_section', title }] }
  }

  // ── rename section ─────────────────────────────────────────────────────────
  const renameSec = msg.match(/^rename\s+section\s+["']?(.+?)["']?\s+to\s+["']?(.+?)["']?\s*$/)
  if (renameSec) {
    const title = renameSec[1].trim()
    const newTitle = titleCase(renameSec[2].trim())
    return { handled: true, message: `Renamed "${title}" to "${newTitle}".`, actions: [{ type: 'rename_section', title, newTitle }] }
  }

  // ── move card ──────────────────────────────────────────────────────────────
  const moveCard = msg.match(/^move\s+card\s+["']?(.+?)["']?\s+to\s+(?:section\s+)?["']?(.+?)["']?\s*$/)
  if (moveCard) {
    const text = moveCard[1].trim()
    const secQuery = moveCard[2].trim()
    const matched = closestSection(secQuery, ctx.sections)
    return {
      handled: true,
      message: `Moved "${text}"${matched ? ` to "${matched}"` : ''}.`,
      actions: [{ type: 'move_card', text, toSection: matched ?? secQuery }],
    }
  }
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in `aiRouter.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/aiRouter.ts && git commit -m "feat: aiRouter — add delete/rename/move patterns, fix rename stub"
```

---

### Task 5: Update `src/components/AiPanel.tsx`

**Files:**
- Modify: `src/components/AiPanel.tsx`

- [ ] **Step 1: Replace the import block at the top**

Replace:
```ts
import type { AiAction } from '@/components/AiPanel'
```
(This is a self-referencing export — remove it. The type now lives in `aiTypes.ts`.)

Change the full import block to:
```ts
import { useEffect, useRef, useState } from 'react'
import { X, Send, Sparkles, Wand2, Check } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { routeLocally } from '@/lib/aiRouter'
import type { WorkspaceContext, AiAction } from '@/lib/aiTypes'
```

- [ ] **Step 2: Remove the old local type definitions**

Delete these blocks from the file (they are now in `aiTypes.ts`):
```ts
export interface AiAction {
  type: 'clear_board' | 'create_section' | 'create_card'
  title?: string
  text?: string
  section?: string
}

interface BoardContext {
  title: string
  sections: { title: string }[]
  cards: { text: string }[]
}
```

- [ ] **Step 3: Update `AiPanelProps`**

Replace:
```ts
interface AiPanelProps {
  x: number
  y: number
  boardContext: BoardContext
  onClose: () => void
  onApplyActions: (actions: AiAction[]) => void
}
```
with:
```ts
interface AiPanelProps {
  x: number
  y: number
  workspaceContext: WorkspaceContext
  onClose: () => void
  onApplyActions: (actions: AiAction[]) => void
}
```

- [ ] **Step 4: Replace routing constants**

Remove:
```ts
const CLAUDE_KEYWORDS = /reorgani[sz]e|reformat|restructure|redesign|rebuild|redo the board/i

const ALLOWED_EMAILS = (import.meta.env.VITE_AI_ALLOWED_EMAILS ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)
```

Add in their place:
```ts
const PREMIUM_EMAILS = (import.meta.env.VITE_AI_ALLOWED_EMAILS ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)

const CONCEPTUAL_RE = /^(what|how|why|explain|research|find|analyze|suggest|write|draft|help me|compare|describe|tell me|search)/i
```

- [ ] **Step 5: Update the component signature**

Change:
```ts
export default function AiPanel({ x, y, boardContext, onClose, onApplyActions }: AiPanelProps) {
```
to:
```ts
export default function AiPanel({ x, y, workspaceContext, onClose, onApplyActions }: AiPanelProps) {
```

- [ ] **Step 6: Update the `send()` function**

Replace:
```ts
    const isAllowedUser = ALLOWED_EMAILS.includes(user?.email?.toLowerCase() ?? '')
    const endpoint = isAllowedUser && CLAUDE_KEYWORDS.test(text) ? '/api/ai' : '/api/ai-free'

    const apiMessages = [...messages, { role: 'user' as const, content: text }].slice(-10)

    const trimmedBoardContext = {
      title: boardContext.title,
      sections: boardContext.sections,
      cards: boardContext.cards.map(c => ({ text: c.text.slice(0, 150) })),
    }
```
with:
```ts
    const isPremium = PREMIUM_EMAILS.includes(user?.email?.toLowerCase() ?? '')
    const endpoint = isPremium && CONCEPTUAL_RE.test(text.trim()) ? '/api/ai-premium' : '/api/ai'

    const apiMessages = [...messages, { role: 'user' as const, content: text }].slice(-10)

    const trimmedContext: WorkspaceContext = {
      ...workspaceContext,
      board: workspaceContext.board
        ? { ...workspaceContext.board, cards: workspaceContext.board.cards.map(c => ({ text: c.text.slice(0, 100) })) }
        : undefined,
      page: workspaceContext.page
        ? { ...workspaceContext.page, blocks: workspaceContext.page.blocks.map(b => ({ ...b, content: b.content.slice(0, 100) })) }
        : undefined,
    }
```

Replace the `routeLocally` call:
```ts
    // OLD:
    const local = routeLocally(text, boardContext)

    // NEW:
    const boardCtx = workspaceContext.board ?? { title: '', sections: [], cards: [] }
    const local = routeLocally(text, boardCtx)
```

Replace the fetch body:
```ts
    // OLD:
    body: JSON.stringify({
      messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
      boardContext: trimmedBoardContext,
    }),

    // NEW:
    body: JSON.stringify({
      messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
      workspaceContext: trimmedContext,
    }),
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about `boardContext` prop in `BoardView.tsx` — fixed in Task 6.

- [ ] **Step 8: Commit**

```bash
git add src/components/AiPanel.tsx && git commit -m "feat: AiPanel — WorkspaceContext props, isPremium+isConceptual routing"
```

---

### Task 6: Update `src/components/BoardView.tsx`

**Files:**
- Modify: `src/components/BoardView.tsx`

- [ ] **Step 1: Update the AiPanel/AiAction import**

Change:
```ts
import AiPanel, { type AiAction } from './AiPanel'
```
to:
```ts
import AiPanel from './AiPanel'
import type { AiAction } from '@/lib/aiTypes'
```

- [ ] **Step 2: Add calendar store import**

Add after the existing store imports:
```ts
import { useCalendar } from '@/stores/calendar'
```

- [ ] **Step 3: Add store selectors inside the BoardView component**

Add these two lines near the top of the component body, alongside the other `useWorkspace` calls:
```ts
  const allPagesMap = useWorkspace(s => s.pages)
  const calendarEvents = useCalendar(s => s.events)
```

- [ ] **Step 4: Replace the `boardContext` construction**

Find this block (around line 688):
```ts
        const boardContext = {
          title: page?.title ?? '',
          sections: sections.map(s => ({ title: s.data.title || '' })),
          cards: cards.map(c => ({ text: c.data.text || '' })),
        }
```

Replace with:
```ts
        const now = new Date()
        const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const workspaceContext = {
          mode: 'board' as const,
          board: {
            title: page?.title ?? '',
            sections: sections.map(s => ({ title: s.data.title || '' })),
            cards: cards.map(c => ({ text: c.data.text || '' })),
          },
          allBoards: Object.values(allPagesMap)
            .filter(p => p.boardMode && p.id !== pageId)
            .map(p => ({
              title: p.title,
              sections: p.blocks
                .filter(b => b.type === 'section')
                .map(b => { try { return JSON.parse(b.content).title || '' } catch { return '' } })
                .filter(Boolean),
            })),
          calendar: calendarEvents
            .filter(e => e.start >= now && e.start <= sevenDaysOut)
            .slice(0, 14)
            .map(e => ({ title: e.title, date: e.start.toISOString().slice(0, 10) })),
        }
```

- [ ] **Step 5: Add four new action handlers inside `applyAiActions`**

Inside `applyAiActions`, after the existing `if (a.type === 'create_card' && a.text) { ... }` block, add:

```ts
            if (a.type === 'delete_card' && a.text) {
              const needle = a.text.toLowerCase()
              blocks = blocks.filter(b => {
                if (b.type !== 'textbox') return true
                try { return JSON.parse(b.content).text?.toLowerCase() !== needle }
                catch { return true }
              })
            }

            if (a.type === 'delete_section' && a.title) {
              const needle = a.title.toLowerCase()
              blocks = blocks.filter(b => {
                if (b.type !== 'section') return true
                try { return JSON.parse(b.content).title?.toLowerCase() !== needle }
                catch { return true }
              })
            }

            if (a.type === 'rename_section' && a.title && a.newTitle) {
              const needle = a.title.toLowerCase()
              blocks = blocks.map(b => {
                if (b.type !== 'section') return b
                try {
                  const d = JSON.parse(b.content)
                  if (d.title?.toLowerCase() === needle) {
                    return { ...b, content: JSON.stringify({ ...d, title: a.newTitle }) }
                  }
                } catch {}
                return b
              })
            }

            if (a.type === 'move_card' && a.text && a.toSection) {
              const cardNeedle = a.text.toLowerCase()
              const secNeedle = a.toSection.toLowerCase()
              const targetSec = blocks.find(b => {
                if (b.type !== 'section') return false
                try { return JSON.parse(b.content).title?.toLowerCase() === secNeedle }
                catch { return false }
              })
              if (targetSec) {
                try {
                  const secData = JSON.parse(targetSec.content)
                  const cardsInTarget = blocks.filter(b => {
                    if (b.type !== 'textbox') return false
                    try {
                      const d = JSON.parse(b.content)
                      return Math.abs(d.x - secData.x) < SECTION_COL_W
                    } catch { return false }
                  }).length
                  blocks = blocks.map(b => {
                    if (b.type !== 'textbox') return b
                    try {
                      const d = JSON.parse(b.content)
                      if (d.text?.toLowerCase() === cardNeedle) {
                        return { ...b, content: JSON.stringify({ ...d, x: secData.x, y: secData.y + 50 + cardsInTarget * CARD_H }) }
                      }
                    } catch {}
                    return b
                  })
                } catch {}
              }
            }
```

- [ ] **Step 6: Update the `AiPanel` prop**

Change:
```tsx
<AiPanel
  x={aiPanel.sx}
  y={aiPanel.sy}
  boardContext={boardContext}
  onClose={() => setAiPanel(null)}
  onApplyActions={applyAiActions}
/>
```
to:
```tsx
<AiPanel
  x={aiPanel.sx}
  y={aiPanel.sy}
  workspaceContext={workspaceContext}
  onClose={() => setAiPanel(null)}
  onApplyActions={applyAiActions}
/>
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/components/BoardView.tsx && git commit -m "feat: BoardView — WorkspaceContext, 4 new AI action handlers, allBoards+calendar"
```

---

### Task 7: Create `src/components/AiTextToolbar.tsx`

**Files:**
- Create: `src/components/AiTextToolbar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/AiTextToolbar.tsx
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { WorkspaceContext } from '@/lib/aiTypes'

interface AiTextToolbarProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  workspaceContext: WorkspaceContext
  onReplaceSelection: (text: string) => void
}

const ACTIONS = [
  { label: 'Rewrite',     prompt: 'Rewrite the following text to be clearer and more concise. Return only the rewritten text, nothing else.' },
  { label: 'Expand',      prompt: 'Expand the following text with more detail and depth. Return only the expanded text, nothing else.' },
  { label: 'Summarize',   prompt: 'Summarize the following text into key points. Return only the summary, nothing else.' },
  { label: 'Fix grammar', prompt: 'Fix the grammar and spelling of the following text. Return only the corrected text, nothing else.' },
]

const PREMIUM_EMAILS = (import.meta.env.VITE_AI_ALLOWED_EMAILS ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)

export default function AiTextToolbar({ containerRef, workspaceContext, onReplaceSelection }: AiTextToolbarProps) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const isPremium = PREMIUM_EMAILS.includes(user?.email?.toLowerCase() ?? '')

  useEffect(() => {
    function onMouseUp() {
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setVisible(false)
          return
        }
        if (!containerRef.current) return
        const range = sel.getRangeAt(0)
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
          setVisible(false)
          return
        }
        const rect = range.getBoundingClientRect()
        setSelectedText(sel.toString())
        setPosition({ top: rect.top - 48, left: Math.max(8, rect.left) })
        setVisible(true)
      }, 0)
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [containerRef])

  async function apply(prompt: string) {
    if (!selectedText || loading) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${prompt}\n\nText:\n${selectedText}` }],
          workspaceContext,
        }),
      })
      const data = await res.json()
      const actions = Array.isArray(data.actions) ? data.actions : []
      const replaceAction = actions.find((a: any) => a.type === 'replace_selection')
      if (replaceAction?.text) {
        onReplaceSelection(replaceAction.text)
      } else if (typeof data.message === 'string') {
        onReplaceSelection(data.message)
      }
    } catch {}
    setLoading(false)
    setVisible(false)
    setCustomPrompt('')
  }

  if (!visible) return null

  return (
    <div
      className="fixed z-[300] bg-surface-2 border border-surface-4 rounded-xl shadow-xl px-2 py-1.5 flex items-center gap-1"
      style={{ top: position.top, left: position.left }}
      onMouseDown={e => e.preventDefault()}
    >
      {loading ? (
        <Loader2 size={14} className="text-accent animate-spin mx-2" />
      ) : (
        <>
          {ACTIONS.map(a => (
            <button
              key={a.label}
              onClick={() => apply(a.prompt)}
              className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-surface-3 rounded-lg transition-colors whitespace-nowrap"
            >
              {a.label}
            </button>
          ))}
          {isPremium && (
            <input
              type="text"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customPrompt.trim()) apply(customPrompt) }}
              placeholder="Custom…"
              className="ml-1 bg-surface-3 text-xs text-white placeholder-gray-600 rounded-lg px-2 py-1 w-24 outline-none border border-surface-4 focus:border-accent"
            />
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (component not yet used — that's fine)

- [ ] **Step 3: Commit**

```bash
git add src/components/AiTextToolbar.tsx && git commit -m "feat: add AiTextToolbar — text selection AI for page editor"
```

---

### Task 8: Wire `AiTextToolbar` into `BlockEditor.tsx`

**Files:**
- Modify: `src/components/BlockEditor.tsx`

- [ ] **Step 1: Add missing imports**

Add to the existing React import (merge with what's already there):
```ts
import { useCallback, useEffect, useRef } from 'react'
```
(Only add what isn't already imported.)

Add after other component imports:
```ts
import AiTextToolbar from './AiTextToolbar'
import { useWorkspace as useWorkspaceForAi } from '@/stores/workspace'
import { useCalendar } from '@/stores/calendar'
import type { WorkspaceContext } from '@/lib/aiTypes'
```

- [ ] **Step 2: Add `containerRef`, context data, and `handleReplaceSelection` inside `BlockEditor`**

Add these inside `BlockEditor`, after `const blockRefs = useRef(...)`:

```ts
  const containerRef = useRef<HTMLDivElement>(null)
  const allPagesMap = useWorkspaceForAi(s => s.pages)
  const calendarEvents = useCalendar(s => s.events)

  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const workspaceContext: WorkspaceContext = {
    mode: 'page',
    page: page
      ? {
          title: page.title,
          blocks: page.blocks
            .filter(b => b.type !== 'image' && b.type !== 'file')
            .map(b => ({ type: b.type, content: b.content.slice(0, 200) })),
        }
      : undefined,
    allBoards: Object.values(allPagesMap)
      .filter(p => p.boardMode && p.id !== pageId)
      .map(p => ({
        title: p.title,
        sections: p.blocks
          .filter(b => b.type === 'section')
          .map(b => { try { return JSON.parse(b.content).title || '' } catch { return '' } })
          .filter(Boolean),
      })),
    calendar: calendarEvents
      .filter(e => e.start >= now && e.start <= sevenDaysOut)
      .slice(0, 14)
      .map(e => ({ title: e.title, date: e.start.toISOString().slice(0, 10) })),
  }

  function handleReplaceSelection(newText: string) {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    for (const [id, el] of blockRefs.current) {
      if (el.contains(sel.anchorNode)) {
        updateBlock(pageId, id, { content: newText })
        sel.removeAllRanges()
        return
      }
    }
  }
```

- [ ] **Step 3: Update the return statement**

Change:
```tsx
  return (
    <div className="flex flex-col gap-1 w-full">
      {page.blocks.map((block, i) => (
```
to:
```tsx
  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full">
      <AiTextToolbar
        containerRef={containerRef}
        workspaceContext={workspaceContext}
        onReplaceSelection={handleReplaceSelection}
      />
      {page.blocks.map((block, i) => (
```

- [ ] **Step 4: Verify full build**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/BlockEditor.tsx && git commit -m "feat: wire AiTextToolbar into BlockEditor with replace_selection handler"
```

---

### Task 9: Delete `api/ai-free.ts`

**Files:**
- Delete: `api/ai-free.ts`

- [ ] **Step 1: Remove the file**

```bash
rm /Users/michael/flowspace/api/ai-free.ts
```

- [ ] **Step 2: Confirm no remaining references**

```bash
cd /Users/michael/flowspace && grep -r 'ai-free' src/ api/ --include='*.ts' --include='*.tsx'
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: remove api/ai-free.ts — consolidated into api/ai.ts"
```

---

### Task 10: Build and deploy

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1
```

Expected: no errors

- [ ] **Step 2: Production build**

```bash
cd /Users/michael/flowspace && npm run build 2>&1 | tail -20
```

Expected: `✓ built in` with no errors

- [ ] **Step 3: Deploy to production**

```bash
cd /Users/michael/flowspace && vercel --prod --yes --scope mgordon04g-2640s-projects 2>&1 | tail -10
```

Expected: `✅  Production: https://flowspaced.com`

- [ ] **Step 4: Smoke test checklist**
  - Open a board → right-click → Ask AI
  - Type `add section Ideas` → works (local router, free)
  - Type `delete section Ideas` → works (local router, free)
  - Type `rename section Ideas to Backlog` → works (local router, free)
  - Type `move card [card text] to Backlog` → works (local router, free)
  - Type `what should I name my sections?` → routes to Groq (non-premium) or Claude (premium)
  - Open a page → select any text → AiTextToolbar appears with Rewrite / Expand / Summarize / Fix grammar
  - Click Rewrite → selected text is replaced with rewritten version
  - As a premium user, custom prompt input appears in the toolbar
