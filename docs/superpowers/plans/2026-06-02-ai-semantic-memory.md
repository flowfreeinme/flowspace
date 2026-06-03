# AI Semantic Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every AI panel conversation to Supabase with pgvector embeddings, then retrieve semantically relevant past messages on each new query and inject them into the system prompt.

**Architecture:** Each AI exchange is saved to `ai_chat_history` (role + content + vector embedding). Before every Groq/Anthropic call, the current query is embedded, cosine similarity search returns the top-5 relevant past messages, and those are injected as a `## Relevant past context` block in the system prompt. Embedding is fire-and-forget after the response — it never blocks the user.

**Tech Stack:** Supabase pgvector, HuggingFace Inference API (free, `sentence-transformers/all-MiniLM-L6-v2`, 384 dims), existing Groq/Supabase clients, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260602000000_ai_chat_history.sql` | pgvector extension, table, RLS, ivfflat index, search function |
| Create | `api/_embed.ts` | Shared helper: call HuggingFace, return `number[384]` |
| Create | `api/ai-memory-save.ts` | Insert message row (embedding null), return id |
| Create | `api/ai-embed.ts` | Receive id+text, write embedding back to row |
| Create | `src/lib/aiMemory.ts` | Client-side `saveToMemory` + `embedMessage` helpers |
| Create | `src/lib/aiMemory.test.ts` | Unit tests for client helpers |
| Modify | `api/ai.ts` | Hoist supabase client, add memory retrieval, update `buildSystemPrompt` |
| Modify | `src/components/AiPanel.tsx` | Add `sessionIdRef`, fire-and-forget saves, pass `sessionId` |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260602000000_ai_chat_history.sql`

- [ ] **Step 1: Create migrations directory and SQL file**

```bash
mkdir -p /Users/michael/flowspace/supabase/migrations
```

Create `supabase/migrations/20260602000000_ai_chat_history.sql`:

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Chat history with embeddings
create table ai_chat_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  session_id  text not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  embedding   vector(384),
  created_at  timestamptz default now()
);

-- Row-level security
alter table ai_chat_history enable row level security;

create policy "users own history"
  on ai_chat_history
  for all
  using (auth.uid() = user_id);

-- IVFFlat index for cosine similarity (lists=50 suits <500k rows)
create index on ai_chat_history
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- Similarity search function
-- Excludes the current session so live conversation isn't duplicated in memory context
create or replace function search_chat_memory(
  query_embedding      vector(384),
  match_count          int,
  p_user_id            uuid,
  p_session_id_exclude text default ''
)
returns table (role text, content text, similarity float)
language sql stable as $$
  select
    role,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from ai_chat_history
  where user_id = p_user_id
    and embedding is not null
    and session_id != p_session_id_exclude
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

- [ ] **Step 2: Apply migration to Supabase**

If you have the Supabase CLI linked:
```bash
cd /Users/michael/flowspace && npx supabase db push
```

Otherwise, open the Supabase dashboard SQL editor and run the file contents directly.

- [ ] **Step 3: Verify migration applied**

In the Supabase dashboard SQL editor, run:
```sql
-- Verify table exists
select column_name, data_type
from information_schema.columns
where table_name = 'ai_chat_history'
order by ordinal_position;

-- Verify function exists
select proname from pg_proc where proname = 'search_chat_memory';
```

Expected: 6 columns (`id`, `user_id`, `session_id`, `role`, `content`, `embedding`, `created_at`) and one function row.

- [ ] **Step 4: Commit**

```bash
cd /Users/michael/flowspace
git add supabase/migrations/20260602000000_ai_chat_history.sql
git commit -m "feat: add ai_chat_history table with pgvector embeddings"
```

---

### Task 2: Shared embedding helper

**Files:**
- Create: `api/_embed.ts`

The `_` prefix prevents Vercel from treating this as a route. Both `api/ai-embed.ts` and `api/ai.ts` will import from here.

- [ ] **Step 1: Create `api/_embed.ts`**

```ts
// api/_embed.ts
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const HF_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not set')

  const res = await fetch(HF_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
  })

  if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`)

  const data: number[] | number[][] = await res.json()

  // sentence-transformers returns float[] for a single string
  if (Array.isArray(data) && typeof data[0] === 'number') return data as number[]
  // fallback: first row of batch response
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0] as number[]

  throw new Error('Unexpected embedding response shape')
}
```

- [ ] **Step 2: Add `HUGGINGFACE_API_KEY` to Vercel environment**

```bash
cd /Users/michael/flowspace && npx vercel env add HUGGINGFACE_API_KEY
```

Get a free token at https://huggingface.co/settings/tokens (read access is sufficient).

Also add to `.env.local` for local dev:
```
HUGGINGFACE_API_KEY=hf_your_token_here
```

- [ ] **Step 3: Commit**

```bash
git add api/_embed.ts
git commit -m "feat: add shared HuggingFace embedding helper"
```

---

### Task 3: Memory save endpoint

**Files:**
- Create: `api/ai-memory-save.ts`

- [ ] **Step 1: Create `api/ai-memory-save.ts`**

```ts
// api/ai-memory-save.ts
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  let user: any
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
    const { data } = await supabase.auth.getUser(token)
    if (!data.user) return res.status(401).json({ error: 'Unauthorized' })
    user = data.user

    const { sessionId, role, content } = req.body
    if (!sessionId || !role || !content) return res.status(400).json({ error: 'Missing fields' })
    if (!['user', 'assistant'].includes(role)) return res.status(400).json({ error: 'Invalid role' })

    const { data: row, error } = await supabase
      .from('ai_chat_history')
      .insert({ user_id: user.id, session_id: sessionId, role, content })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ id: row.id })
  } catch {
    return res.status(500).json({ error: 'Internal error' })
  }
}
```

- [ ] **Step 2: Smoke-test with curl (requires a valid Supabase auth token)**

```bash
curl -s -X POST http://localhost:3000/api/ai-memory-save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"sessionId":"test-session","role":"user","content":"hello world"}' | jq .
```

Expected: `{"id":"<uuid>"}`

- [ ] **Step 3: Commit**

```bash
git add api/ai-memory-save.ts
git commit -m "feat: add ai-memory-save endpoint"
```

---

### Task 4: Embed endpoint

**Files:**
- Create: `api/ai-embed.ts`

- [ ] **Step 1: Create `api/ai-embed.ts`**

```ts
// api/ai-embed.ts
import { createClient } from '@supabase/supabase-js'
import { getEmbedding } from './_embed'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
    const { data } = await supabase.auth.getUser(token)
    if (!data.user) return res.status(401).json({ error: 'Unauthorized' })

    const { messageId, text } = req.body
    if (!messageId || !text) return res.status(400).json({ error: 'Missing fields' })

    const embedding = await getEmbedding(text)

    // pgvector expects the array as a literal string '[0.1,0.2,...]'
    const { error } = await supabase
      .from('ai_chat_history')
      .update({ embedding: `[${embedding.join(',')}]` })
      .eq('id', messageId)
      .eq('user_id', data.user.id)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Internal error' })
  }
}
```

- [ ] **Step 2: Smoke-test with curl (use the id returned from Task 3 smoke test)**

```bash
curl -s -X POST http://localhost:3000/api/ai-embed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"messageId":"<uuid-from-task-3>","text":"hello world"}' | jq .
```

Expected: `{"ok":true}`

Verify the embedding was stored:
```sql
select id, length(embedding::text) > 100 as has_embedding
from ai_chat_history
where id = '<uuid>';
```

Expected: `has_embedding = true`

- [ ] **Step 3: Commit**

```bash
git add api/ai-embed.ts
git commit -m "feat: add ai-embed endpoint"
```

---

### Task 5: Client-side helpers (TDD)

**Files:**
- Create: `src/lib/aiMemory.ts`
- Create: `src/lib/aiMemory.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/aiMemory.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

const mockSession = { access_token: 'test-token' }

async function getModule() {
  return import('./aiMemory')
}

describe('saveToMemory', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns message id on success', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'abc-123' }),
    } as Response)

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBe('abc-123')
    expect(fetch).toHaveBeenCalledWith('/api/ai-memory-save', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-1', role: 'user', content: 'hello' }),
    }))
  })

  it('returns null when no session', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as any)

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null on non-ok response', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBeNull()
  })

  it('returns null on network error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'))

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBeNull()
  })
})

describe('embedMessage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response))
  })

  it('calls embed endpoint with messageId and text', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)

    const { embedMessage } = await getModule()
    await embedMessage('msg-1', 'some text')

    expect(fetch).toHaveBeenCalledWith('/api/ai-embed', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ messageId: 'msg-1', text: 'some text' }),
    }))
  })

  it('does nothing when no session', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as any)

    const { embedMessage } = await getModule()
    await embedMessage('msg-1', 'some text')

    expect(fetch).not.toHaveBeenCalled()
  })

  it('swallows network errors silently', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'))

    const { embedMessage } = await getModule()
    await expect(embedMessage('msg-1', 'text')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/michael/flowspace && npx vitest run src/lib/aiMemory.test.ts
```

Expected: fail with `Cannot find module './aiMemory'`

- [ ] **Step 3: Create `src/lib/aiMemory.ts`**

```ts
// src/lib/aiMemory.ts
import { supabase } from '@/lib/supabase'

export async function saveToMemory(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const res = await fetch('/api/ai-memory-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sessionId, role, content }),
    })
    if (!res.ok) return null

    const data = await res.json()
    return data.id ?? null
  } catch {
    return null
  }
}

export async function embedMessage(messageId: string, text: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await fetch('/api/ai-embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messageId, text }),
    })
  } catch {
    // silent failure — embedding is non-critical
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd /Users/michael/flowspace && npx vitest run src/lib/aiMemory.test.ts
```

Expected: all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/aiMemory.ts src/lib/aiMemory.test.ts
git commit -m "feat: add aiMemory client helpers with tests"
```

---

### Task 6: Wire memory retrieval into `/api/ai.ts`

**Files:**
- Modify: `api/ai.ts`

Two changes: (a) hoist `supabase`/`user` to outer scope so they're available after the auth block, (b) add memory retrieval before the Groq call, (c) add `pastContext` param to `buildSystemPrompt`.

- [ ] **Step 1: Update `buildSystemPrompt` signature**

In `api/ai.ts`, change the first line of `buildSystemPrompt`:

```ts
// Before:
function buildSystemPrompt(ctx: any): string {
  const parts: string[] = []

// After:
function buildSystemPrompt(ctx: any, pastContext = ''): string {
  const parts: string[] = []

  if (pastContext) {
    parts.push(`## Relevant past context\n(from your previous conversations — use this to stay consistent)\n${pastContext}`)
  }
```

- [ ] **Step 2: Add the `getEmbedding` import**

At the top of `api/ai.ts`, add:

```ts
import { getEmbedding } from './_embed'
```

- [ ] **Step 3: Hoist supabase and user out of the auth try-block**

Replace the current auth block:

```ts
// Before:
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

// After:
  let supabase: any
  let user: any
  try {
    supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
    const { data } = await supabase.auth.getUser(token)
    if (!data.user) return res.status(401).json({ error: 'Unauthorized' })
    user = data.user
  } catch {
    return res.status(401).json({ error: 'Could not verify identity.' })
  }

  const { messages, workspaceContext, sessionId } = req.body
```

- [ ] **Step 4: Add memory retrieval before the Groq call**

Between the `if (!process.env.GROQ_API_KEY)` check and the `try { const completion = ...` block, insert:

```ts
  let pastContext = ''
  try {
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content ?? ''
    if (lastUserMsg && process.env.HUGGINGFACE_API_KEY) {
      const queryEmbedding = await getEmbedding(lastUserMsg)
      const { data: memories } = await supabase.rpc('search_chat_memory', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_count: 5,
        p_user_id: user.id,
        p_session_id_exclude: sessionId ?? '',
      })
      if (memories?.length) {
        pastContext = (memories as { role: string; content: string }[])
          .map(m => `[${m.role}]: ${m.content.slice(0, 200)}`)
          .join('\n')
      }
    }
  } catch {
    // non-fatal — proceed without memory context
  }
```

- [ ] **Step 5: Pass `pastContext` to `buildSystemPrompt`**

```ts
// Before:
        { role: 'system', content: buildSystemPrompt(workspaceContext) },

// After:
        { role: 'system', content: buildSystemPrompt(workspaceContext, pastContext) },
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add api/ai.ts api/_embed.ts
git commit -m "feat: inject semantic memory context into AI system prompt"
```

---

### Task 7: Wire `AiPanel.tsx` to save and embed exchanges

**Files:**
- Modify: `src/components/AiPanel.tsx`

Three changes: (a) add `sessionIdRef`, (b) save + embed after each AI response, (c) pass `sessionId` in the request body.

- [ ] **Step 1: Add import for `aiMemory` helpers**

At the top of `AiPanel.tsx`, add:

```ts
import { saveToMemory, embedMessage } from '@/lib/aiMemory'
```

- [ ] **Step 2: Add `sessionIdRef`**

Next to the existing `inputRef` and `bottomRef` declarations:

```ts
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef(crypto.randomUUID())
```

- [ ] **Step 3: Pass `sessionId` in the fetch body**

Find the `body: JSON.stringify({` call inside the `fetch(endpoint, ...)` call and add `sessionId`:

```ts
// Before:
        body: JSON.stringify({
          messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
          workspaceContext: trimmedContext,
        }),

// After:
        body: JSON.stringify({
          messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
          workspaceContext: trimmedContext,
          sessionId: sessionIdRef.current,
        }),
```

- [ ] **Step 4: Fire-and-forget save + embed after successful AI response**

Find the block where the AI response is added to messages. It looks like:

```ts
      if (typeof data.message === 'string') {
        setMessages(m => [...m, {
          role: 'assistant',
          content: data.message,
          actions: data.actions?.length ? data.actions : undefined,
        }])
      }
```

Add the save calls immediately after `setMessages(...)`:

```ts
      if (typeof data.message === 'string') {
        setMessages(m => [...m, {
          role: 'assistant',
          content: data.message,
          actions: data.actions?.length ? data.actions : undefined,
        }])
        // Persist exchange to Supabase for semantic memory (fire-and-forget)
        Promise.all([
          saveToMemory(sessionIdRef.current, 'user', text),
          saveToMemory(sessionIdRef.current, 'assistant', data.message),
        ]).then(([userId, assistantId]) => {
          if (userId) embedMessage(userId, text)
          if (assistantId) embedMessage(assistantId, data.message)
        })
      }
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/michael/flowspace && npx vitest run
```

Expected: all tests pass including the new `aiMemory.test.ts`

- [ ] **Step 7: Manual end-to-end test**

1. Start dev server: `npx vercel dev`
2. Open the app, open the AI panel
3. Send a message: "remember that I prefer short responses"
4. Verify response appears normally
5. Wait ~5 seconds for async embed to complete
6. In Supabase dashboard, query:
   ```sql
   select role, content, embedding is not null as embedded
   from ai_chat_history
   order by created_at desc
   limit 4;
   ```
   Expected: 2 rows (`user` + `assistant`), both with `embedded = true` after ~5s
7. Open a new panel session (close and reopen the panel)
8. Ask: "what did I ask you to remember?"
9. Expected: AI response references "short responses" from the past context

- [ ] **Step 8: Commit**

```bash
git add src/components/AiPanel.tsx src/lib/aiMemory.ts src/lib/aiMemory.test.ts
git commit -m "feat: save AI exchanges to Supabase and embed for semantic recall"
```

---

## Out of Scope

- Memory in `/api/ai-premium.ts` (same pattern applies, separate task)
- UI for browsing or deleting chat history
- Memory summarisation / compression
- Loading prior session messages into the panel on open
- Semantic search across workspace pages
