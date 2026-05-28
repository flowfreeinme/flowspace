# Encryption + Code Cleanup Design

**Date:** 2026-05-06  
**Scope:** Client-side AES-GCM encryption of workspace data + BoardView decomposition + AI token trimming

---

## 1. Encryption Architecture

### Goal
Encrypt all workspace content before it reaches Supabase so that a DB breach exposes no readable user data.

### Key Management

- On first sign-in, generate a random 256-bit key via `crypto.getRandomValues(new Uint8Array(32))`
- Import it as a `CryptoKey` with `algorithm: "AES-GCM"`, `extractable: true`, `usages: ["encrypt", "decrypt"]`
- Export as base64 and store in a new `user_keys` Supabase table (one row per user)
- On subsequent sign-ins, fetch the key row, decode base64, re-import as `CryptoKey`
- Hold the active `CryptoKey` in memory only — never in localStorage or sessionStorage

### user_keys Table Schema

```sql
create table user_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key_b64 text not null,
  created_at timestamptz default now()
);

alter table user_keys enable row level security;

create policy "owner only" on user_keys
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Encrypt/Decrypt Flow

- **Save path:** `saveWorkspace()` → serialize workspace JSON → encrypt with AES-GCM → base64-encode ciphertext → store in Supabase `workspaces.data` column
- **Load path:** `loadWorkspace()` → fetch ciphertext from Supabase → base64-decode → decrypt with AES-GCM → parse JSON → return `WorkspaceData`
- A fresh 12-byte IV is generated per encrypt call and prepended to the ciphertext before base64 encoding (IV is not secret, just must be unique)

### New Module: `src/lib/crypto.ts`

Owns all Web Crypto logic. Exports:

```ts
getOrCreateKey(userId: string): Promise<CryptoKey>
encrypt(key: CryptoKey, plaintext: string): Promise<string>   // returns base64
decrypt(key: CryptoKey, ciphertext: string): Promise<string>  // accepts base64
```

Nothing outside this module calls Web Crypto directly.

### Integration Points

- `src/stores/workspace.ts` — call `getOrCreateKey(userId)` in `init()`, cache `CryptoKey` in store state
- `src/lib/storage.ts` — accept `CryptoKey` param in `saveWorkspace` / `loadWorkspace`, call encrypt/decrypt
- No UI changes required — encryption is transparent to all components

### Backward Compatibility

First load after encryption is deployed: if the stored value is not valid base64 ciphertext (i.e. it's the old plaintext JSON), fall back to parsing as plain JSON and immediately re-save encrypted. Detection: attempt decrypt; if it fails or the key column doesn't exist, treat as plaintext.

---

## 2. Code Cleanup: BoardView Decomposition

### Problem
`BoardView.tsx` is 925 lines mixing section rendering, card rendering, drag logic, and the floating toolbox. Hard to read and modify.

### Solution
Extract three focused components from `BoardView.tsx`:

| New file | Responsibility | Approx lines |
|---|---|---|
| `src/components/BoardSection.tsx` | Renders one column: header, add-card button, card list | ~150 |
| `src/components/BoardCard.tsx` | Renders one card: text, resize handle, selection state | ~100 |
| `src/components/BoardToolbox.tsx` | Floating action toolbar (already logically distinct) | ~80 |

`BoardView.tsx` becomes ~300 lines: layout, drag orchestration, selection logic, and composition of the above.

Props flow down; callbacks flow up. No new state, no new abstractions beyond what's already implicit in the current code.

---

## 3. AI Token Efficiency

### Problem
`AiPanel.tsx` likely sends full workspace context to Claude/Groq including all pages, all blocks, all metadata. Most of it is irrelevant noise for the active task.

### Solution: Trim context before API calls

Build a `buildAiContext(pages, activePageId)` helper (in `AiPanel.tsx` or a new `src/lib/aiContext.ts`):

1. **Scope to active page only** — the user is almost always asking about what they're looking at
2. **Strip metadata** — omit `id`, `createdAt`, `updatedAt`, `children`, `parentId` from blocks
3. **Truncate long blocks** — cap each block's `content` at 500 characters
4. **Cap total context** — if total character count exceeds 8,000 (≈2,000 tokens), truncate oldest blocks first
5. **Structured format** — emit clean JSON: `{ title, blocks: [{ type, content }] }`

This reduces average AI request size by an estimated 60–80% for typical workspaces.

---

## Files Created / Modified

| File | Action |
|---|---|
| Supabase migration | Create `user_keys` table + RLS |
| `src/lib/crypto.ts` | Create — all Web Crypto logic |
| `src/lib/storage.ts` | Update — encrypt on save, decrypt on load |
| `src/stores/workspace.ts` | Update — fetch/cache key in `init()` |
| `src/components/BoardSection.tsx` | Create — extracted from BoardView |
| `src/components/BoardCard.tsx` | Create — extracted from BoardView |
| `src/components/BoardToolbox.tsx` | Create — extracted from BoardView |
| `src/components/BoardView.tsx` | Update — slimmed to ~300 lines |
| `src/lib/aiContext.ts` | Create — context trimming helper |
| `src/components/AiPanel.tsx` | Update — use aiContext helper |

---

## Out of Scope

- Passphrase-derived E2EE (key recovery complexity not worth it for personal use)
- Encrypting file uploads in R2 (separate concern)
- Supabase pgsodium / server-side encryption
- Splitting LandingPage.tsx (static JSX, no real benefit)
- Changes to aiRouter.ts (already lean)
