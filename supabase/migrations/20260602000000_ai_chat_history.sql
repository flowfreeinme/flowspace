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
