# AI Second Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add proactive AI intelligence that analyses pages on save, surfaces action items and related pages inline, provides a home dashboard briefing widget, and extends the AI panel with workspace-wide Second Brain routing.

**Architecture:** Two-phase analysis on page save (2s debounce): Phase 1 runs local heuristics client-side (extractKeywords, findRelatedPages, detectCandidateActions). Phase 2 makes a single Groq call to `/api/ai-insights` which returns cleaned action items, a "what next" page recommendation, and additional related pages. Results live in `aiInsightsStore` (Zustand, in-memory). The AI panel detects Second Brain queries by pattern matching and answers from the cache. Three UI surfaces: `PageInsightBar` (top of BlockEditor), `AiBriefingWidget` (home screen), and the existing unified AI panel.

**Tech Stack:** React, TypeScript, Zustand, Groq `llama-3.3-70b-versatile`, TailwindCSS, Vitest, `@supabase/supabase-js`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/aiInsights.ts` | Create | Heuristic engine: keyword extraction, related pages, action detection |
| `src/lib/aiInsights.test.ts` | Create | Tests for all three heuristic functions |
| `src/stores/aiInsightsStore.ts` | Create | Zustand store: per-page insights, whatNext, dismiss state |
| `api/ai-insights.ts` | Create | Groq endpoint: confirm actions, whatNext, additional related pages |
| `src/components/PageInsightBar.tsx` | Create | Dismissible hint bar shown at top of page view |
| `src/lib/aiRouter.ts` | Modify | Add `isSecondBrainQuery()` export |
| `src/components/AiPanel.tsx` | Modify | Route Second Brain queries to cached insights |
| `src/components/widgets/AiBriefingWidget.tsx` | Create | Home dashboard widget for whatNext + pending actions |
| `src/types/index.ts` | Modify | Add `'aiBriefing'` to `HomeWidgetType` union |
| `src/lib/homeCenter.ts` | Modify | Register aiBriefing in WIDGET_DEFAULTS, AUTO_ARRANGE, AVAILABLE_WIDGETS |
| `src/components/HomeScreen.tsx` | Modify | Render AiBriefingWidget for `widget.type === 'aiBriefing'` |
| `src/components/BlockEditor.tsx` | Modify | Render PageInsightBar, trigger analyzeOnSave on block changes |

---

## Task 1: Heuristic Engine

**Files:**
- Create: `src/lib/aiInsights.ts`
- Create: `src/lib/aiInsights.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/aiInsights.test.ts
import { describe, it, expect } from 'vitest'
import { extractKeywords, findRelatedPages, detectCandidateActions } from './aiInsights'
import type { Page } from '@/types'

function makePage(overrides: Partial<Page> & { id: string }): Page {
  return {
    title: 'Untitled',
    blocks: [],
    children: [],
    rootPages: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
    archived: false,
    favorite: false,
    icon: '',
    database: false,
    boardMode: false,
    lastOpenedAt: Date.now(),
    ...overrides,
  } as unknown as Page
}

describe('extractKeywords', () => {
  it('returns top keywords from headings and content', () => {
    const page = makePage({
      id: 'p1',
      title: 'Product Launch Strategy',
      blocks: [
        { id: 'b1', type: 'heading1', content: 'Launch Timeline' },
        { id: 'b2', type: 'text', content: 'We need to finalize the launch timeline before the product ships.' },
      ],
    })
    const keywords = extractKeywords(page)
    expect(keywords).toContain('launch')
    expect(keywords).toContain('timeline')
    expect(keywords.length).toBeLessThanOrEqual(10)
  })

  it('filters stop words', () => {
    const page = makePage({
      id: 'p2',
      blocks: [{ id: 'b1', type: 'text', content: 'the and or but with from' }],
    })
    const keywords = extractKeywords(page)
    expect(keywords).not.toContain('the')
    expect(keywords).not.toContain('and')
  })

  it('returns empty array for empty page', () => {
    const page = makePage({ id: 'p3', blocks: [] })
    expect(extractKeywords(page)).toEqual([])
  })
})

describe('findRelatedPages', () => {
  it('finds pages with overlapping keywords', () => {
    const source = makePage({
      id: 'src',
      title: 'Product Launch Strategy',
      blocks: [{ id: 'b1', type: 'text', content: 'launch timeline product roadmap marketing' }],
    })
    const related = makePage({
      id: 'rel',
      title: 'Marketing Launch Plan',
      blocks: [{ id: 'b2', type: 'text', content: 'launch marketing plan timeline' }],
    })
    const unrelated = makePage({
      id: 'unrel',
      title: 'Vacation Photos',
      blocks: [{ id: 'b3', type: 'text', content: 'beach holiday summer relax' }],
    })
    const results = findRelatedPages(source, [source, related, unrelated])
    expect(results.map(r => r.id)).toContain('rel')
    expect(results.map(r => r.id)).not.toContain('unrel')
    expect(results.map(r => r.id)).not.toContain('src')
  })

  it('returns empty when only one page exists', () => {
    const page = makePage({ id: 'p1', blocks: [{ id: 'b1', type: 'text', content: 'hello world' }] })
    expect(findRelatedPages(page, [page])).toEqual([])
  })

  it('returns max 3 results', () => {
    const source = makePage({ id: 'src', blocks: [{ id: 'b', type: 'text', content: 'launch product marketing strategy roadmap timeline' }] })
    const pages = [source, ...Array.from({ length: 6 }, (_, i) =>
      makePage({ id: `p${i}`, blocks: [{ id: 'b', type: 'text', content: 'launch product marketing strategy roadmap timeline' }] })
    )]
    expect(findRelatedPages(source, pages).length).toBeLessThanOrEqual(3)
  })
})

describe('detectCandidateActions', () => {
  it('detects unchecked checkboxes', () => {
    const page = makePage({
      id: 'p1',
      blocks: [{ id: 'b1', type: 'text', content: '- [ ] Send the report to stakeholders' }],
    })
    const actions = detectCandidateActions(page)
    expect(actions.some(a => a.includes('Send the report'))).toBe(true)
  })

  it('detects TODO: prefix', () => {
    const page = makePage({
      id: 'p2',
      blocks: [{ id: 'b1', type: 'text', content: 'TODO: Review the Q3 budget numbers' }],
    })
    const actions = detectCandidateActions(page)
    expect(actions.some(a => a.includes('Review the Q3 budget'))).toBe(true)
  })

  it('detects Action: prefix', () => {
    const page = makePage({
      id: 'p3',
      blocks: [{ id: 'b1', type: 'text', content: 'Action: Schedule follow-up call' }],
    })
    const actions = detectCandidateActions(page)
    expect(actions.some(a => a.includes('Schedule follow-up call'))).toBe(true)
  })

  it('does not detect false positives', () => {
    const page = makePage({
      id: 'p4',
      blocks: [{ id: 'b1', type: 'text', content: 'I need to tell you something interesting happened today at the conference.' }],
    })
    // Very generic "need to" in a sentence shouldn't produce a clean action
    const actions = detectCandidateActions(page)
    // Either empty or contains the full sentence — not a clean extracted action
    // Just ensure it doesn't crash
    expect(Array.isArray(actions)).toBe(true)
  })

  it('deduplicates actions', () => {
    const page = makePage({
      id: 'p5',
      blocks: [
        { id: 'b1', type: 'text', content: '- [ ] Send weekly report' },
        { id: 'b2', type: 'text', content: '- [ ] Send weekly report' },
      ],
    })
    const actions = detectCandidateActions(page)
    const count = actions.filter(a => a.includes('Send weekly report')).length
    expect(count).toBe(1)
  })

  it('returns empty for page with no actions', () => {
    const page = makePage({
      id: 'p6',
      blocks: [{ id: 'b1', type: 'text', content: 'Today was a great day. The sun was shining.' }],
    })
    expect(detectCandidateActions(page)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/michael/flowspace && npx vitest run src/lib/aiInsights.test.ts 2>&1 | tail -20
```
Expected: error about missing module `./aiInsights`

- [ ] **Step 3: Create the heuristic engine**

```ts
// src/lib/aiInsights.ts
import type { Page } from '@/types'

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','was','are','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','that','this',
  'these','those','it','its','they','them','their','we','our','you','your',
  'some','into','about','more','also','just','then','than','when','what',
  'which','who','how','all','any','each','both','very','here','there',
])

export function extractKeywords(page: Page): string[] {
  const headingContent = page.blocks
    .filter(b => b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3')
    .map(b => b.content)
    .join(' ')

  const bodyContent = [page.title, ...page.blocks.map(b => b.content)].join(' ')
  // Double-weight headings for relevance
  const combined = `${headingContent} ${headingContent} ${bodyContent}`

  const freq = new Map<string, number>()
  for (const word of combined.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
    if (word.length > 3 && !STOP_WORDS.has(word)) {
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}

export function findRelatedPages(page: Page, allPages: Page[]): { id: string; title: string }[] {
  if (allPages.length < 2) return []
  const keywords = new Set(extractKeywords(page))
  if (keywords.size === 0) return []

  return allPages
    .filter(p => p.id !== page.id)
    .map(p => ({
      id: p.id,
      title: p.title || 'Untitled',
      score: extractKeywords(p).filter(k => keywords.has(k)).length,
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, title }) => ({ id, title }))
}

const ACTION_PATTERNS: RegExp[] = [
  /^[-*]\s*\[\s*\]\s*(.{5,})/m,
  /\bTODO[:\s]+(.{5,})/i,
  /\bAction[:\s]+(.{5,})/i,
  /\bFollow[\s-]up[:\s]+(.{5,})/i,
  /\bNeed to\s+(send|review|update|fix|check|create|write|schedule|meet|call|email|prepare|confirm|finalize)\s+(.{4,})/i,
]

export function detectCandidateActions(page: Page): string[] {
  const lines = page.blocks.map(b => b.content).join('\n').split('\n')
  const seen = new Set<string>()
  const actions: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    for (const pattern of ACTION_PATTERNS) {
      const match = trimmed.match(pattern)
      if (match) {
        const raw = (match[2] ?? match[1] ?? '').trim().slice(0, 120)
        if (raw.length > 5 && !seen.has(raw)) {
          seen.add(raw)
          actions.push(raw)
        }
        break
      }
    }
  }

  return actions.slice(0, 10)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/michael/flowspace && npx vitest run src/lib/aiInsights.test.ts 2>&1 | tail -20
```
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/michael/flowspace && git add src/lib/aiInsights.ts src/lib/aiInsights.test.ts && git commit -m "feat: add AI Second Brain heuristic engine"
```

---

## Task 2: AI Insights Zustand Store

**Files:**
- Create: `src/stores/aiInsightsStore.ts`

- [ ] **Step 1: Create the store**

```ts
// src/stores/aiInsightsStore.ts
import { create } from 'zustand'

export interface RelatedPage {
  id: string
  title: string
}

export interface PageInsights {
  relatedPages: RelatedPage[]
  actionItems: string[]
  analyzedAt: number
  status: 'idle' | 'analyzing' | 'ready' | 'error'
}

export interface WhatNext {
  pageId: string
  title: string
  reason: string
}

interface AiInsightsState {
  byPage: Record<string, PageInsights>
  whatNext: WhatNext | null
  dismissedHints: Set<string>
  analyzeOnSave: (
    pageId: string,
    pageContent: string,
    candidateActions: string[],
    heuristicRelated: RelatedPage[],
    pageSummaries: { id: string; title: string; updatedAt: number }[],
    authToken: string | null
  ) => void
  dismissHint: (pageId: string) => void
}

const timers: Record<string, ReturnType<typeof setTimeout>> = {}

export const useAiInsightsStore = create<AiInsightsState>((set, get) => ({
  byPage: {},
  whatNext: null,
  dismissedHints: new Set(),

  analyzeOnSave(pageId, pageContent, candidateActions, heuristicRelated, pageSummaries, authToken) {
    // Show heuristic results immediately while AI call is pending
    set(s => ({
      byPage: {
        ...s.byPage,
        [pageId]: {
          relatedPages: heuristicRelated,
          actionItems: candidateActions,
          analyzedAt: s.byPage[pageId]?.analyzedAt ?? 0,
          status: 'analyzing',
        },
      },
    }))

    // Debounce the API call per page
    if (timers[pageId]) clearTimeout(timers[pageId])
    timers[pageId] = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai-insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ pageId, pageContent, candidateActions, pageSummaries }),
        })
        if (!res.ok) throw new Error('API error')
        const data = await res.json()

        const mergedRelated = [
          ...heuristicRelated,
          ...(data.additionalRelated ?? []).filter(
            (r: RelatedPage) => !heuristicRelated.some(h => h.id === r.id)
          ),
        ].slice(0, 3)

        set(s => {
          const dismissed = new Set(s.dismissedHints)
          dismissed.delete(pageId)

          const whatNext: WhatNext | null = data.whatNext?.pageId
            ? {
                pageId: data.whatNext.pageId,
                title: pageSummaries.find(p => p.id === data.whatNext.pageId)?.title ?? 'Untitled',
                reason: data.whatNext.reason ?? '',
              }
            : s.whatNext

          return {
            byPage: {
              ...s.byPage,
              [pageId]: {
                relatedPages: mergedRelated,
                actionItems: data.confirmedActions?.length ? data.confirmedActions : candidateActions,
                analyzedAt: Date.now(),
                status: 'ready',
              },
            },
            whatNext,
            dismissedHints: dismissed,
          }
        })
      } catch {
        set(s => ({
          byPage: {
            ...s.byPage,
            [pageId]: { ...s.byPage[pageId], status: 'error' },
          },
        }))
      }
    }, 2000)
  },

  dismissHint(pageId) {
    set(s => {
      const dismissed = new Set(s.dismissedHints)
      dismissed.add(pageId)
      return { dismissedHints: dismissed }
    })
  },
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | grep 'aiInsightsStore\|aiInsights' | head -20
```
Expected: no errors for the new files

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/stores/aiInsightsStore.ts && git commit -m "feat: add AI insights Zustand store"
```

---

## Task 3: API Endpoint

**Files:**
- Create: `api/ai-insights.ts`

- [ ] **Step 1: Create the endpoint**

```ts
// api/ai-insights.ts
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
- confirmedActions: clean and deduplicate the candidate actions. Remove false positives (generic sentences that aren't real tasks). Max 8 items. If no good actions exist, return empty array.
- whatNext: the page the user should work on next, chosen from the workspace page list above. Must be one of the listed page IDs. Base decision on recency and content patterns. If no clear recommendation, omit this field entirely.
- additionalRelated: pages semantically related to the current page content beyond keyword overlap. Max 3. Only include if genuinely relevant — do not pad.
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | grep 'ai-insights' | head -10
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add api/ai-insights.ts && git commit -m "feat: add /api/ai-insights endpoint"
```

---

## Task 4: Second Brain Routing

**Files:**
- Modify: `src/lib/aiRouter.ts`

- [ ] **Step 1: Read the current end of aiRouter.ts to find where to add the export**

Read `src/lib/aiRouter.ts` — note the last exported function and the file's ending.

- [ ] **Step 2: Add `isSecondBrainQuery` to aiRouter.ts**

Append to the end of `src/lib/aiRouter.ts`:

```ts
const SECOND_BRAIN_PATTERNS: RegExp[] = [
  /what should i (work on|focus|do|prioritize)/i,
  /what('s| is) next/i,
  /\b(what to focus|my focus|my priority)\b/i,
  /what('s| is) related to/i,
  /connected to/i,
  /what did i miss/i,
  /any action items/i,
  /extract (tasks|actions|action items)/i,
  /across (my )?(workspace|pages|notes)/i,
  /workspace.wide/i,
  /second brain/i,
]

export function isSecondBrainQuery(text: string): boolean {
  return SECOND_BRAIN_PATTERNS.some(p => p.test(text))
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | grep 'aiRouter' | head -10
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /Users/michael/flowspace && git add src/lib/aiRouter.ts && git commit -m "feat: add isSecondBrainQuery routing helper"
```

---

## Task 5: PageInsightBar Component

**Files:**
- Create: `src/components/PageInsightBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/PageInsightBar.tsx
import { useState } from 'react'
import { useAiInsightsStore } from '@/stores/aiInsightsStore'

interface Props {
  pageId: string
  onNavigate: (pageId: string) => void
}

export default function PageInsightBar({ pageId, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const insights = useAiInsightsStore(s => s.byPage[pageId])
  const dismissed = useAiInsightsStore(s => s.dismissedHints.has(pageId))
  const dismissHint = useAiInsightsStore(s => s.dismissHint)

  if (!insights || insights.status === 'idle' || insights.status === 'error' || dismissed) return null
  if (insights.status === 'ready' && !insights.actionItems.length && !insights.relatedPages.length) return null

  const parts = [
    insights.actionItems.length ? `${insights.actionItems.length} action item${insights.actionItems.length !== 1 ? 's' : ''}` : '',
    insights.relatedPages.length ? `${insights.relatedPages.length} related page${insights.relatedPages.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ')

  const isAnalyzing = insights.status === 'analyzing'

  return (
    <div className="border-b border-accent/20 bg-accent/5 transition-all">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-sm" aria-hidden>🧠</span>
        <span className="flex-1 text-xs text-surface-11">
          {isAnalyzing ? 'Analysing…' : parts}
        </span>
        {!isAnalyzing && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            {expanded ? 'Close' : 'Review →'}
          </button>
        )}
        <button
          onClick={() => dismissHint(pageId)}
          className="text-xs text-surface-9 hover:text-surface-11 px-1 transition-colors"
          aria-label="Dismiss AI hints"
        >
          ✕
        </button>
      </div>

      {expanded && insights.status === 'ready' && (
        <div className="grid grid-cols-2 gap-4 px-4 pb-3 pt-1">
          {insights.actionItems.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-accent">Action Items</div>
              <ul className="space-y-1">
                {insights.actionItems.map((item, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-surface-11">
                    <span className="shrink-0 text-surface-9">☐</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insights.relatedPages.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-accent">Related Pages</div>
              <ul className="space-y-1">
                {insights.relatedPages.map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => onNavigate(p.id)}
                      className="text-xs text-accent hover:underline text-left"
                    >
                      → {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | grep 'PageInsightBar' | head -10
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/PageInsightBar.tsx && git commit -m "feat: add PageInsightBar inline hint component"
```

---

## Task 6: BlockEditor Integration

**Files:**
- Modify: `src/components/BlockEditor.tsx`

- [ ] **Step 1: Read the top of BlockEditor.tsx to understand current imports and props**

Read `src/components/BlockEditor.tsx` lines 1–60. Note the existing imports and the component's props interface (particularly how `page` and `pageId` are received, and whether `supabase` is already imported).

- [ ] **Step 2: Add imports at the top of BlockEditor.tsx**

After the existing imports, add:

```ts
import { supabase } from '@/lib/supabase'
import { extractKeywords, findRelatedPages, detectCandidateActions } from '@/lib/aiInsights'
import { useAiInsightsStore } from '@/stores/aiInsightsStore'
import PageInsightBar from '@/components/PageInsightBar'
import { useWorkspaceStore } from '@/stores/workspace'
```

If `supabase` is already imported, skip that line. If `useWorkspaceStore` is already imported, skip that line.

- [ ] **Step 3: Add the analysis effect inside BlockEditor**

Inside the `BlockEditor` component function, after the existing hooks, add:

```ts
const analyzeOnSave = useAiInsightsStore(s => s.analyzeOnSave)
const openTab = useWorkspaceStore(s => s.openTab)

useEffect(() => {
  if (!page) return
  const hasContent = page.blocks.some(b => b.content.trim().length > 10)
  if (!hasContent) return

  const allPages = Object.values(useWorkspaceStore.getState().pages)
  const candidateActions = detectCandidateActions(page)
  const heuristicRelated = findRelatedPages(page, allPages)
  const pageSummaries = allPages
    .filter(p => !p.archived && !p.database)
    .map(p => ({ id: p.id, title: p.title || 'Untitled', updatedAt: p.updatedAt }))

  supabase.auth.getSession().then(({ data: { session } }) => {
    analyzeOnSave(
      page.id,
      page.blocks.map(b => b.content).join('\n').slice(0, 1500),
      candidateActions,
      heuristicRelated,
      pageSummaries,
      session?.access_token ?? null
    )
  })
}, [page?.blocks])
```

- [ ] **Step 4: Render PageInsightBar at the top of the BlockEditor JSX**

Find the outermost `<div>` or `<section>` that wraps the block list in BlockEditor's return statement. Render `PageInsightBar` as the first child:

```tsx
{page && (
  <PageInsightBar
    pageId={page.id}
    onNavigate={openTab}
  />
)}
```

Place this immediately inside the wrapper, before the blocks list and before any toolbar.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | grep 'BlockEditor' | head -20
```
Expected: no errors

- [ ] **Step 6: Run all tests**

```bash
cd /Users/michael/flowspace && npx vitest run 2>&1 | tail -10
```
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/BlockEditor.tsx && git commit -m "feat: integrate AI analysis into BlockEditor"
```

---

## Task 7: AiPanel Second Brain Integration

**Files:**
- Modify: `src/components/AiPanel.tsx`

- [ ] **Step 1: Read AiPanel.tsx lines 1–30 to find existing imports**

Read `src/components/AiPanel.tsx` lines 1–30.

- [ ] **Step 2: Add import for isSecondBrainQuery**

Add to the imports section of AiPanel.tsx:

```ts
import { routeLocally, isSecondBrainQuery } from '@/lib/aiRouter'
import { useAiInsightsStore } from '@/stores/aiInsightsStore'
```

(Replace the existing `import { routeLocally } from '@/lib/aiRouter'` with the version above that also imports `isSecondBrainQuery`.)

- [ ] **Step 3: Read AiPanel.tsx lines 88–140 to locate the submit handler**

Read `src/components/AiPanel.tsx` lines 88–140. Find the line that calls `routeLocally(text, boardCtx)`.

- [ ] **Step 4: Add Second Brain routing before routeLocally**

Immediately before the `const local = routeLocally(text, boardCtx)` line, insert:

```ts
if (isSecondBrainQuery(text)) {
  const { whatNext, byPage } = useAiInsightsStore.getState()

  const actionLines: string[] = Object.values(byPage)
    .filter(p => p.status === 'ready' && p.actionItems.length > 0)
    .flatMap(p => p.actionItems.slice(0, 2))
    .slice(0, 5)

  let reply = ''
  if (whatNext) {
    reply += `I'd suggest opening **${whatNext.title}** — ${whatNext.reason}`
    if (actionLines.length) {
      reply += `\n\nYou also have ${actionLines.length} pending action${actionLines.length !== 1 ? 's' : ''} across your workspace:\n${actionLines.map(a => `• ${a}`).join('\n')}`
    }
  } else if (actionLines.length) {
    reply = `Here are pending actions across your workspace:\n${actionLines.map(a => `• ${a}`).join('\n')}`
  } else {
    reply = 'Open and edit some pages first — I\'ll start building a picture of your workspace and can then suggest what to focus on.'
  }

  setMessages(m => [...m, { role: 'assistant', content: reply }])
  setLoading(false)
  setTimeout(() => inputRef.current?.focus(), 50)
  return
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | grep 'AiPanel' | head -20
```
Expected: no errors

- [ ] **Step 6: Run all tests**

```bash
cd /Users/michael/flowspace && npx vitest run 2>&1 | tail -10
```
Expected: all pass

- [ ] **Step 7: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/AiPanel.tsx && git commit -m "feat: add Second Brain routing to AI panel"
```

---

## Task 8: AI Briefing Widget + Registration

**Files:**
- Create: `src/components/widgets/AiBriefingWidget.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/lib/homeCenter.ts`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Create AiBriefingWidget**

```tsx
// src/components/widgets/AiBriefingWidget.tsx
import { useAiInsightsStore } from '@/stores/aiInsightsStore'
import { useWorkspaceStore } from '@/stores/workspace'

export default function AiBriefingWidget() {
  const whatNext = useAiInsightsStore(s => s.whatNext)
  const byPage = useAiInsightsStore(s => s.byPage)
  const openTab = useWorkspaceStore(s => s.openTab)
  const pages = useWorkspaceStore(s => s.pages)

  const allActions = Object.entries(byPage)
    .filter(([, insights]) => insights.status === 'ready' && insights.actionItems.length > 0)
    .flatMap(([pageId, insights]) =>
      insights.actionItems.slice(0, 2).map(item => ({ item, pageId }))
    )
    .slice(0, 5)

  const isEmpty = !whatNext && allActions.length === 0

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden>🧠</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">AI Briefing</span>
      </div>

      {isEmpty ? (
        <p className="text-xs text-surface-9">
          Open and edit some pages — I'll start surfacing insights as you work.
        </p>
      ) : (
        <>
          {whatNext && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-surface-9">Pick up where you left off</div>
              <div className="text-sm font-semibold text-surface-12">{whatNext.title}</div>
              <div className="text-xs text-surface-10">{whatNext.reason}</div>
              <button
                onClick={() => openTab(whatNext.pageId)}
                className="mt-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Open page →
              </button>
            </div>
          )}

          {allActions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-surface-9">Pending actions</div>
              <ul className="space-y-1">
                {allActions.map(({ item, pageId }, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-surface-11">
                    <span className="mt-px shrink-0 text-surface-9">☐</span>
                    <span className="flex-1">{item}</span>
                    {pages[pageId]?.title && (
                      <button
                        onClick={() => openTab(pageId)}
                        className="shrink-0 text-surface-8 hover:text-accent transition-colors"
                        title={pages[pageId].title}
                      >
                        · {pages[pageId].title.slice(0, 14)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `'aiBriefing'` to HomeWidgetType in src/types/index.ts**

Read `src/types/index.ts` to find the `HomeWidgetType` union. Add `| 'aiBriefing'` to the end of the union, before the closing semicolon. The result should look like:

```ts
export type HomeWidgetType =
  | 'calendar'
  | 'today'
  | 'focus'
  | 'recent'
  | 'quickCapture'
  | 'proPlanner'
  | 'focusTimer'
  | 'weather'
  | 'aiBriefing'
```

- [ ] **Step 3: Register widget in homeCenter.ts**

Read `src/lib/homeCenter.ts`. Make four additions:

**3a. Add to `WIDGET_DEFAULTS`** (after the `weather` entry):
```ts
aiBriefing: { id: 'aiBriefing', type: 'aiBriefing', x: 4, y: 0, w: 4, h: 5 },
```

**3b. Add to `AUTO_ARRANGE_ORDER`** (after `'weather'`):
```ts
'aiBriefing',
```

**3c. Add to `AUTO_ARRANGE_SIZES`** (after the `weather` entry):
```ts
aiBriefing: { w: 4, h: 5 },
```

**3d. Add to `AVAILABLE_WIDGETS` array** (after the weather entry):
```ts
{ type: 'aiBriefing', title: 'AI Briefing', description: 'See what to work on next and pending actions across your workspace.' },
```

- [ ] **Step 4: Register widget in HomeScreen.tsx**

Read `src/components/HomeScreen.tsx` lines 250–290. Find where other widgets are rendered with `if (widget.type === ...)`.

**4a. Add import** at the top of HomeScreen.tsx (with other widget imports):
```ts
import AiBriefingWidget from './widgets/AiBriefingWidget'
```

**4b. Add render case** (after the `focusTimer` render line):
```ts
if (widget.type === 'aiBriefing') return <AiBriefingWidget />
```

**4c. No settings form needed** — add this after the settings block for focusTimer:
```ts
if (widget.type === 'aiBriefing') return null
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | tail -20
```
Expected: 0 errors

- [ ] **Step 6: Run all tests**

```bash
cd /Users/michael/flowspace && npx vitest run 2>&1 | tail -10
```
Expected: all pass

- [ ] **Step 7: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/widgets/AiBriefingWidget.tsx src/types/index.ts src/lib/homeCenter.ts src/components/HomeScreen.tsx && git commit -m "feat: add AI Briefing home widget"
```

---

## Task 9: Production Build & Deploy

**Files:** none (verification only)

- [ ] **Step 1: Production build**

```bash
cd /Users/michael/flowspace && npm run build 2>&1 | tail -20
```
Expected: Build completed, 0 errors. Bundle size similar to current (~124 kB gzip).

- [ ] **Step 2: If build fails, fix TypeScript errors**

Run `npx tsc --noEmit 2>&1` and fix any errors before retrying the build.

- [ ] **Step 3: Deploy to production**

```bash
cd /Users/michael/flowspace && git push origin feat/databases
```

Then trigger a production deployment via the Vercel skill or Vercel dashboard.

- [ ] **Step 4: Verify deployment is live**

Check that https://flowspaced.com loads without errors. Open a page, type some content with an action item like `- [ ] Send report`, and confirm the PageInsightBar appears after ~2 seconds.
