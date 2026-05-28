# AI Feature Improvements — Design Spec
Date: 2026-05-07

## Overview

Improve the existing AI feature across three dimensions: more board actions, AI in the page editor, and richer workspace context. Maintain a free tier (Groq) for all users and a premium tier (Claude) for allowlisted users on conceptual/research queries.

---

## 1. API Consolidation

### Endpoints after this change

| Endpoint | Model | Users | Purpose |
|---|---|---|---|
| `api/ai.ts` | Groq `llama-3.3-70b-versatile` | All authenticated | Board actions, page text transforms |
| `api/ai-premium.ts` | Claude Sonnet 4.6 | Premium only (email allowlist) | Conceptual queries, research, web search |

### Deleted
- `api/ai-free.ts` — removed, logic merged into `api/ai.ts`

### Premium gating
Premium status is determined by `AI_ALLOWED_EMAILS` env var (server) and `VITE_AI_ALLOWED_EMAILS` env var (client), same as today. When payment is added later, this check swaps to a Supabase `is_premium` flag with no other changes needed.

### Client-side routing (in `AiPanel`, after local router)

```
routeLocally() → handled? → done (free, instant)
not handled?
  → isPremium && isConceptual(query) → POST /api/ai-premium  (Claude)
  → otherwise                        → POST /api/ai          (Groq)
```

`isConceptual` is a client-side regex matching question starters: `what, how, why, explain, research, find, analyze, suggest, write, draft, help me, compare, describe`.

`CLAUDE_KEYWORDS` regex in `AiPanel` is removed and replaced by `isConceptual + isPremium`.

### Claude premium capabilities
- Full `WorkspaceContext` (all boards, current page, calendar)
- Anthropic web search tool enabled — Claude can fetch live results when research is needed
- `max_tokens: 2048`

### Groq capabilities
- Same `WorkspaceContext` shape, tighter truncation limits (see Section 5)
- `max_tokens: 1024`, `temperature: 0`

---

## 2. New Board Actions

Four new action types added to `AiAction` (in `AiPanel.tsx`), the local router (`aiRouter.ts`), both API system prompts, and the `onApplyActions` handler in `BoardView.tsx`.

```ts
{ type: 'delete_card',    text: string }
{ type: 'delete_section', title: string }
{ type: 'rename_section', title: string, newTitle: string }
{ type: 'move_card',      text: string, toSection: string }
```

### Local router patterns (free, no API call)

| User says | Action produced |
|---|---|
| `"delete card [text]"` | `delete_card` |
| `"delete section [name]"` | `delete_section` |
| `"rename section [old] to [new]"` | `rename_section` — fixes current "not supported yet" stub |
| `"move card [text] to [section]"` | `move_card` |

Fuzzy section matching (existing `closestSection` helper) is reused for all new patterns.

### BoardView handler
`onApplyActions` in `BoardView.tsx` is extended to handle all four new types. Cards matched by text (case-insensitive, trimmed). Sections matched by title (case-insensitive).

---

## 3. AiTextToolbar (Page Editor)

A new `AiTextToolbar` component surfaces when the user selects text inside `BlockEditor`.

### Trigger
- Listens for `mouseup` / `selectionchange` inside the editor container
- If `window.getSelection()` has non-empty text, toolbar appears
- Positioned above selection using `getBoundingClientRect()` of the selection range
- Disappears on click-outside or when selection is cleared

### Preset actions (shown as buttons)
- **Rewrite** — rephrase the selected text, same meaning
- **Expand** — add more detail and depth
- **Summarize** — condense to key points
- **Fix grammar** — correct grammar and spelling

### Custom instruction (premium)
Premium users see a small text input at the bottom of the toolbar. Typing a custom prompt and pressing Enter routes to `/api/ai-premium` (Claude) if the query is conceptual; otherwise to `/api/ai` (Groq).

### API call
Fires `/api/ai` (Groq for free users) with:
- Selected text as the user message
- `WorkspaceContext` with `mode: 'page'` and current page blocks

### New action type
```ts
{ type: 'replace_selection', text: string }
```
`BlockEditor` handles this by replacing the selected range with the returned text.

### Behavior
- One-shot transform — no chat history, no back-and-forth
- Toolbar disappears after action is applied
- Loading state shown in-place while waiting for response

---

## 4. WorkspaceContext (replaces BoardContext)

```ts
interface WorkspaceContext {
  mode: 'board' | 'page'

  // Present when mode = 'board'
  board?: {
    title: string
    sections: { title: string }[]
    cards: { text: string; section?: string }[]
  }

  // Present when mode = 'page'
  page?: {
    title: string
    blocks: { type: string; content: string }[]
  }

  // Always present (global workspace)
  allBoards?: { title: string; sections: string[] }[]
  calendar?: { title: string; date: string }[]
}
```

### Data sources

| Field | Source | Where assembled |
|---|---|---|
| `board` | Props passed from `BoardView` | `AiPanel` |
| `page` | Block serialization from `BlockEditor` | `AiTextToolbar` |
| `allBoards` | Workspace store (all pages of type board) | `AiPanel` + `AiTextToolbar` via prop |
| `calendar` | Calendar store | `AiPanel` + `AiTextToolbar` via prop |

### Truncation limits

| Field | Groq limit | Claude limit |
|---|---|---|
| `board.cards[].text` | 100 chars | 150 chars |
| `page.blocks` total | 1,000 chars | 2,000 chars |
| `allBoards` | titles + section titles only, no card text | same |
| `calendar` | 14 events max (next 7 days) | 14 events max |

---

## 5. Files Changed

| File | Change |
|---|---|
| `api/ai-free.ts` | Deleted |
| `api/ai.ts` | Rewritten — Groq only, all users, new actions + WorkspaceContext |
| `api/ai-premium.ts` | New — Claude Sonnet 4.6, premium users, web search tool, full context |
| `src/lib/aiRouter.ts` | Add 4 new action patterns + fix rename_section stub |
| `src/components/AiPanel.tsx` | Replace CLAUDE_KEYWORDS routing with isConceptual+isPremium; BoardContext → WorkspaceContext; add allBoards + calendar props |
| `src/components/AiTextToolbar.tsx` | New component — selection toolbar for BlockEditor |
| `src/components/BlockEditor.tsx` | Wire AiTextToolbar; handle replace_selection action |
| `src/components/BoardView.tsx` | Handle 4 new action types in onApplyActions |
| `src/types/index.ts` | Add WorkspaceContext, update AiAction union |

---

## 6. Out of Scope

- Stripe / payment integration (deferred — premium stays as email allowlist)
- Server-side usage tracking (localStorage rate limit kept as-is)
- Streaming responses
- AI in mobile shell (deferred)
