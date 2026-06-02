# AI Semantic Memory — Design Spec

**Date:** 2026-06-02
**Status:** Approved

## Overview

Persist AI chat history across sessions and surface semantically relevant past exchanges in every conversation. Every message is stored in Supabase with a vector embedding; before each AI call, the current query is embedded and the top-5 most similar past messages are injected into the system prompt. The AI panel UI is unchanged — memory is invisible and automatic.

## Architecture

Three pieces bolt onto the existing system:

1. **Supabase `ai_chat_history` table with pgvector** — every user message and AI reply stored with a 384-dimensional embedding vector. RLS ensures users only see their own history.
2. **`/api/ai-embed` Vercel function** — called asynchronously after each exchange. Hits HuggingFace Inference API (free tier, `sentence-transformers/all-MiniLM-L6-v2`), writes the embedding back to Supabase. Does not block the AI response.
3. **Memory retrieval in `/api/ai`** — before calling Groq/Anthropic, embeds the current query, runs cosine similarity search, fetches top-5 relevant past messages, injects as a `## Relevant past context` block in the system prompt.

New env var required: `HUGGINGFACE_API_KEY` (free HuggingFace account).

## Data Model

### Migration (`supabase/migrations/YYYYMMDD_ai_chat_history.sql`)

```sql
create extension if not exists vector;

create table ai_chat_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  session_id  text not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  embedding   vector(384),
  created_at  timestamptz default now()
);

alter table ai_chat_history enable row level security;
create policy "users own history"
  on ai_chat_history for all using (auth.uid() = user_id);

create index on ai_chat_history
  using ivfflat (embedding vector_cosine_ops) with (lists = 50);

create or replace function search_chat_memory(
  query_embedding vector(384),
  match_count     int,
  p_user_id       uuid
)
returns table (role text, content text, similarity float)
language sql stable as $$
  select role, content, 1 - (embedding <=> query_embedding) as similarity
  from ai_chat_history
  where user_id = p_user_id
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

`embedding` is nullable — rows are inserted immediately; the async embed call fills it in after the AI responds.

## API Layer

### `/api/ai-memory-save.ts` (new)

- **Input:** `{ sessionId: string, role: 'user' | 'assistant', content: string }`
- **Auth:** Bearer token (same pattern as existing routes)
- Inserts a row into `ai_chat_history` with `embedding = null`
- **Returns:** `{ id: string }`

### `/api/ai-embed.ts` (new)

- **Input:** `{ messageId: string, text: string }`
- **Auth:** Bearer token
- Calls HuggingFace `feature-extraction` for `sentence-transformers/all-MiniLM-L6-v2`
- Mean-pools the token embeddings to produce a single `float[]` of length 384
- Updates `ai_chat_history` row by `id` with the embedding
- **Returns:** `{ ok: true }`
- Failure is silent — row stays with `null` embedding, excluded from future searches

### `/api/ai.ts` (modified)

Before the Groq/Anthropic call:
1. Embed the current user query (same HuggingFace call, inline)
2. Call `search_chat_memory(embedding, 5, userId)`, excluding current `sessionId`
3. Format results into a `pastContext` string
4. Pass to `buildSystemPrompt(workspaceContext, pastContext)`

`buildSystemPrompt` gains an optional second parameter. When `pastContext` is non-empty, prepends:

```
## Relevant past context
(from your previous conversations — use this to stay consistent)
[user]: ...
[assistant]: ...
```

No changes to the request/response shape that `AiPanel.tsx` depends on.

## AiPanel Changes (`src/components/AiPanel.tsx`)

Three additions to the existing `send()` function:

1. **Session ID** — `const sessionIdRef = useRef(crypto.randomUUID())` on mount. Passed in every `/api/ai` request body as `sessionId`.
2. **Save exchange** — after AI response is added to `messages`, fire two fire-and-forget fetches to `/api/ai-memory-save`: one for the user message, one for the assistant reply. Failures swallowed silently.
3. **Async embed** — after both saves return their `id`s, fire two fire-and-forget fetches to `/api/ai-embed`. Also swallowed silently.

```ts
// After AI response received:
const [userId, assistantId] = await Promise.all([
  saveToMemory(sessionIdRef.current, 'user', text),
  saveToMemory(sessionIdRef.current, 'assistant', data.message),
])
embedMessage(userId, text)
embedMessage(assistantId, data.message)
```

`saveToMemory` and `embedMessage` are small module-level helpers — not hooks, not stores. `embedMessage` is only called if `saveToMemory` returned a valid id; a failed save produces no embed call.

## Error Handling

| Scenario | Behaviour |
|---|---|
| HuggingFace API down / rate limit | Embed silently fails; row stays with `null` embedding; excluded from future searches |
| Memory search fails | `/api/ai` catches, proceeds with empty `pastContext`; AI responds normally |
| `ai-memory-save` fails | Swallowed silently; that exchange won't appear in future memory |
| pgvector extension missing | Migration fails at deploy time before reaching prod |
| User has no history yet | `search_chat_memory` returns 0 rows; `pastContext` empty; system prompt unchanged |
| Embed for current query fails | Same as memory search failing — skip memory, proceed normally |

Core invariant: **memory is additive, never load-bearing**. Every failure mode degrades gracefully to existing behaviour.

## Out of Scope

- UI for browsing or deleting chat history
- Memory summarisation / compression (Option B hybrid)
- Cross-device session continuity (loading prior session messages into the panel on open)
- Embedding model upgrade path (OpenAI `text-embedding-3-small` as alternative)
- Semantic search across workspace pages (separate from chat history)
