# AI Second Brain — Design Spec

## Overview

Add proactive AI intelligence to Flowspace that analyses your workspace as you work and surfaces three capabilities:

- **D — "What next"**: Context-aware recommendation for which page to focus on, based on recent activity, calendar, and workspace patterns
- **B — Auto-linking**: Related pages surfaced while you read and edit
- **C — Action extraction**: Action items detected from meeting notes and freeform pages

Analysis triggers automatically on page save (debounced 2s). Results surface in three places: an inline hint bar at the top of pages, a home dashboard widget, and the unified AI panel.

## Architecture

### Two-Phase Analysis Per Save

When any page saves, `workspace.ts` calls `aiInsightsStore.analyzeOnSave(pageId)` after a 2s debounce.

**Phase 1 — Local heuristics (instant, zero API cost)**

`src/lib/aiInsights.ts` runs synchronously in the browser:
- Extracts headings, bold text, and keywords from the saved page
- Cross-references against all other page titles + headings to find overlaps → `relatedPages`
- Scans for action-like sentences (checkboxes, "TODO:", "Action:", "need to", "follow up") → `candidateActions`

**Phase 2 — AI enrichment (single Groq call)**

`POST /api/ai-insights` receives:
- Current page content (trimmed to 1500 chars)
- `candidateActions` from Phase 1
- All page titles + last-modified timestamps (for "what next" scoring)

Returns:
- `confirmedActions` — cleaned, deduplicated action items
- `whatNext` — `{ pageId, reason }` for workspace-wide focus recommendation
- `additionalRelated` — related pages the heuristic missed

Results stored in `aiInsightsStore`. No Supabase writes — in-memory for the session.

### Intelligent Routing (Unified AI Panel)

The existing `routeLocally()` in `aiRouter.ts` is extended with a `routeToSecondBrain()` layer that runs first.

**Second Brain triggers** (pattern matching on the query):
- "what should I work on", "what's next", "focus", "priority"
- "what's related to", "connected to", "similar to"
- "what did I miss", "any action items", "extract tasks"
- Queries referencing "workspace", "pages", "across my notes"

If matched → build full workspace context from `aiInsightsStore` cache + page titles + recent saves, call `/api/ai-insights`, render response in the AI panel as a conversational reply.

If not matched → fall through to existing `routeLocally()` and board AI unchanged. Zero regression on existing behaviour.

## Data Model

### `src/stores/aiInsightsStore.ts` (Zustand, in-memory)

```ts
interface PageInsights {
  relatedPages: { id: string; title: string }[]
  actionItems: string[]
  analyzedAt: number
  status: 'idle' | 'analyzing' | 'ready' | 'error'
}

interface AiInsightsState {
  byPage: Record<string, PageInsights>
  whatNext: { pageId: string; title: string; reason: string } | null
  dismissedHints: Set<string>
  analyzeOnSave: (pageId: string) => Promise<void>
  dismissHint: (pageId: string) => void
}
```

`dismissedHints` tracks per-page dismissals. Cleared when a new analysis runs for that page (next save re-surfaces relevant hints).

### `src/lib/aiInsights.ts` (heuristic engine)

Three pure functions:
- `extractKeywords(page: Page): string[]` — top 10 terms from headings + bold text, stop words filtered
- `findRelatedPages(page: Page, allPages: Page[]): { id: string; title: string }[]` — keyword overlap scoring, returns top 3
- `detectCandidateActions(page: Page): string[]` — regex on task-like sentences, deduped

### `/api/ai-insights.ts` (new Vercel serverless function)

```ts
// Input
{ pageId: string, pageContent: string, candidateActions: string[], pageSummaries: { id: string, title: string, updatedAt: number }[] }

// Output
{ confirmedActions: string[], whatNext: { pageId: string; reason: string } | null, additionalRelated: { id: string; title: string }[] }
```

Uses Groq `llama-3.3-70b-versatile` (same model as `/api/ai`). Auth via Supabase token (same pattern as existing API routes).

## UI Surfaces

### ① Inline Hint Bar (`src/components/PageInsightBar.tsx`)

Rendered at the top of `BlockEditor` / page view when `insights.status === 'ready'` and `(actionItems.length > 0 || relatedPages.length > 0)` and page is not in `dismissedHints`.

- **Collapsed state**: single line — "🧠 3 action items found · 2 related pages [Review →] [✕]"
- **Expanded state**: two-column panel below the bar — action items (checkboxes) on the left, related page links on the right
- **✕ button**: calls `dismissHint(pageId)`, bar hidden until next save triggers new analysis
- Animated in with a subtle slide-down (no jarring flash)

### ② Home AI Briefing Widget (`src/components/widgets/AiBriefingWidget.tsx`)

New widget type added to the home dashboard widget system. Spans 2 columns by default.

- **Header**: "🧠 AI Briefing"
- **"What next" card**: `whatNext.title` as headline, `whatNext.reason` as subtext, "Open page →" button that navigates to that page
- **Pending actions**: flat list of `actionItems` from all pages, each showing which page it came from (max 5, "+ N more" link)
- Refreshes when home screen mounts (triggers `analyzeOnSave` for the most recently edited page if `whatNext` is stale > 10 min)

### ③ Unified AI Panel (extend existing `AiPanel`)

No new tab or mode toggle. `routeToSecondBrain()` runs before existing routing.

When a Second Brain query is detected:
- Panel shows a brief "Searching your workspace..." loading state (spinner, same style as existing AI loading)
- Response rendered as a normal AI message with any referenced page titles as clickable links that call `openTab(pageId)`
- If `aiInsightsStore` already has fresh insights (< 2 min old), use cache and skip the API call

## Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| Groq rate limit / error | `status: 'error'`, hint bar hidden, retry on next save |
| Page has < 50 words | Skip Phase 2 AI call, show heuristic results only |
| No related pages found | Hint bar hidden (don't show empty state) |
| `whatNext` pageId no longer exists | Widget shows nothing, cleared on next analysis |
| Rapid saves (< 2s apart) | Debounce coalesces into single analysis call |
| Workspace has 0 other pages | Skip `findRelatedPages`, no related section shown |

## Testing (`src/lib/aiInsights.test.ts`)

- `extractKeywords` — extracts from headings/bold, filters stop words, handles empty pages
- `findRelatedPages` — correct overlap ranking, handles zero matches, excludes current page from results
- `detectCandidateActions` — catches `- [ ]`, "TODO:", "need to", "follow up"; ignores false positives like "I need to tell you"
- `routeToSecondBrain` — correct pattern matching for workspace queries vs board commands; falls through correctly on board queries
- `analyzeOnSave` debounce — rapid saves coalesce into single call

## Out of Scope (this phase)

- Persistent insight storage in Supabase (session-only for now)
- Semantic embeddings / vector search
- Cross-workspace analysis
- AI-generated page summaries
- Push notifications for insights
