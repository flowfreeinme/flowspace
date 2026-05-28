# Encryption + Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side AES-GCM encryption of workspace data, extract BoardView sub-components, and trim AI message history for token efficiency.

**Architecture:** Workspace JSON is encrypted with a per-user AES-GCM key before storage in Supabase; the key is stored in a `user_keys` table protected by RLS. BoardView's internal `SectionBlock`, `ImageCard`, and toolbox panel become separate files. AiPanel caps conversation history at 10 messages before API calls.

**Tech Stack:** Web Crypto API (AES-GCM), Supabase RLS, Vitest, React, Zustand, TypeScript

---

## File Map

| File | Action |
|---|---|
| Supabase: `user_keys` table | Create via MCP migration |
| `src/lib/crypto.ts` | Create — key gen/load, encrypt, decrypt |
| `src/lib/storage.ts` | Update — accept CryptoKey, encrypt on save, decrypt on load |
| `src/stores/workspace.ts` | Update — fetch/cache CryptoKey in init(), thread through persist/sync |
| `src/components/BoardSection.tsx` | Create — extracted SectionBlock from BoardView |
| `src/components/BoardCard.tsx` | Create — extracted ImageCard from BoardView |
| `src/components/BoardToolbox.tsx` | Create — extracted fixed bottom-right panel from BoardView |
| `src/components/BoardView.tsx` | Update — import extracted components, delete moved code |
| `src/components/AiPanel.tsx` | Update — cap message history before API call, truncate card text |
| `vitest.config.ts` | Create — vitest config |

---

## Task 1: Create user_keys table in Supabase

**Files:**
- Supabase MCP migration

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with project ID `cbzpbeeqfmpzdhdwtmrw` and this SQL:

```sql
create table if not exists user_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key_b64 text not null,
  created_at timestamptz default now()
);

alter table user_keys enable row level security;

create policy "owner only" on user_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Verify the table exists**

Use `mcp__claude_ai_Supabase__list_tables` and confirm `user_keys` appears.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add user_keys table with RLS for encryption key storage"
```

---

## Task 2: Add vitest and create crypto.ts

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/crypto.ts`
- Create: `src/lib/crypto.test.ts`

- [ ] **Step 1: Install vitest**

```bash
cd /Users/michael/flowspace && bun add -d vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Write failing tests**

Create `src/lib/crypto.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt } from './crypto'

let key: CryptoKey

beforeAll(async () => {
  key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
})

describe('encrypt / decrypt', () => {
  it('round-trips a string', async () => {
    const plain = JSON.stringify({ hello: 'world', num: 42 })
    const ciphertext = await encrypt(key, plain)
    const result = await decrypt(key, ciphertext)
    expect(result).toBe(plain)
  })

  it('produces different ciphertext each call (random IV)', async () => {
    const plain = 'same input'
    const a = await encrypt(key, plain)
    const b = await encrypt(key, plain)
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', async () => {
    const plain = 'tamper test'
    const ciphertext = await encrypt(key, plain)
    const bytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    bytes[20] ^= 0xff  // flip a byte in the ciphertext
    const tampered = btoa(String.fromCharCode(...bytes))
    await expect(decrypt(key, tampered)).rejects.toThrow()
  })
})
```

- [ ] **Step 4: Run tests — expect FAIL**

```bash
cd /Users/michael/flowspace && bun vitest run src/lib/crypto.test.ts
```

Expected: fails with "Cannot find module './crypto'"

- [ ] **Step 5: Create crypto.ts**

Create `src/lib/crypto.ts`:

```ts
import { supabase } from './supabase'

const KEY_ALGO = { name: 'AES-GCM', length: 256 } as const

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(KEY_ALGO, true, ['encrypt', 'decrypt'])
}

async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

async function importKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, KEY_ALGO, true, ['encrypt', 'decrypt'])
}

export async function getOrCreateKey(userId: string): Promise<CryptoKey> {
  const { data } = await supabase
    .from('user_keys')
    .select('key_b64')
    .eq('user_id', userId)
    .single()

  if (data?.key_b64) return importKey(data.key_b64)

  const key = await generateKey()
  const key_b64 = await exportKey(key)
  await supabase.from('user_keys').insert({ user_id: userId, key_b64 })
  return key
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(key: CryptoKey, b64: string): Promise<string> {
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd /Users/michael/flowspace && bun vitest run src/lib/crypto.test.ts
```

Expected: 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/lib/crypto.ts src/lib/crypto.test.ts package.json bun.lock
git commit -m "feat: add AES-GCM crypto module with vitest coverage"
```

---

## Task 3: Update storage.ts to encrypt/decrypt

**Files:**
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Read current storage.ts**

Read `/Users/michael/flowspace/src/lib/storage.ts` to confirm current content before editing.

- [ ] **Step 2: Replace the file contents**

Replace `src/lib/storage.ts` with:

```ts
import type { WorkspaceData, Tab } from '@/types'
import { supabase } from './supabase'
import { encrypt, decrypt } from './crypto'

const TAB_STATE_KEY = 'flowspace_tab_state'

export function saveTabState(tabs: Tab[], activeTabId: string | null) {
  try { localStorage.setItem(TAB_STATE_KEY, JSON.stringify({ tabs, activeTabId })) } catch {}
}

export function loadTabState(): { tabs: Tab[]; activeTabId: string | null } | null {
  try {
    const raw = localStorage.getItem(TAB_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

declare global {
  interface Window {
    electronAPI?: {
      loadData: () => Promise<WorkspaceData | null>
      saveData: (data: string) => Promise<{ ok: boolean }>
      isElectron: boolean
    }
  }
}

export async function loadWorkspace(key: CryptoKey): Promise<WorkspaceData | null> {
  const { data, error } = await supabase.rpc('load_workspace')
  if (!error && data) {
    const raw = data as Record<string, unknown>
    // Encrypted path: { encrypted: "<base64 iv+ciphertext>" }
    if (raw.encrypted && typeof raw.encrypted === 'string') {
      const json = await decrypt(key, raw.encrypted)
      return JSON.parse(json) as WorkspaceData
    }
    // Backward compat: old plaintext JSONB — re-save encrypted on next persist()
    return raw as unknown as WorkspaceData
  }
  // Electron offline fallback (plaintext local file, not encrypted)
  if (window.electronAPI) return window.electronAPI.loadData()
  return null
}

export async function saveWorkspace(workspace: WorkspaceData, key: CryptoKey): Promise<void> {
  const json = JSON.stringify(workspace)
  const encrypted = await encrypt(key, json)
  await supabase.rpc('save_workspace', {
    p_data: { encrypted } as unknown as Record<string, unknown>,
  })
  if (window.electronAPI) {
    await window.electronAPI.saveData(JSON.stringify(workspace))
  }
}
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -20
```

Expected: build succeeds (errors will appear in Task 4 when workspace store is not yet updated)

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: encrypt workspace data with AES-GCM before saving to Supabase"
```

---

## Task 4: Update workspace store to thread CryptoKey

**Files:**
- Modify: `src/stores/workspace.ts`

- [ ] **Step 1: Read current workspace.ts**

Read `/Users/michael/flowspace/src/stores/workspace.ts` to confirm current content before editing.

- [ ] **Step 2: Add cryptoKey import and interface field**

At the top of `src/stores/workspace.ts`, add the import:

```ts
import { getOrCreateKey, decrypt } from '@/lib/crypto'
```

Add `cryptoKey: CryptoKey | null` to the `WorkspaceStore` interface (after `sidebarOpen`):

```ts
interface WorkspaceStore extends WorkspaceData {
  initialized: boolean
  sidebarOpen: boolean
  cryptoKey: CryptoKey | null
  // ... rest unchanged
```

- [ ] **Step 3: Initialize cryptoKey in store defaults**

In the `create<WorkspaceStore>((set, get) => ({` initial state, add:

```ts
cryptoKey: null,
```

- [ ] **Step 4: Update init() to fetch the key**

Replace the current `async init()` method with:

```ts
async init() {
  if (get().initialized || initInProgress) return
  initInProgress = true
  const gen = initGeneration

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { initInProgress = false; return }

  const cryptoKey = await getOrCreateKey(user.id)
  set({ cryptoKey })

  const data = await loadWorkspace(cryptoKey)
  // If reset() was called while we were awaiting, discard this load
  if (gen !== initGeneration) { initInProgress = false; return }
  const workspace = data ?? createDefaultWorkspace()

  const saved = loadTabState()
  const rawTabs: Tab[] =
    (saved?.tabs?.length ? saved.tabs : null) ??
    (workspace.tabs?.length ? workspace.tabs : null) ??
    []
  const rawActiveTabId = saved?.activeTabId ?? workspace.activeTabId ?? null

  const validTabs = rawTabs.filter(t => workspace.pages[t.pageId])

  let activeTabId: string | null =
    rawActiveTabId && validTabs.some(t => t.id === rawActiveTabId)
      ? rawActiveTabId
      : (validTabs[validTabs.length - 1]?.id ?? null)

  if (activeTabId === null && workspace.rootPages.length > 0) {
    const mostRecent = workspace.rootPages
      .map(id => workspace.pages[id])
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
    if (mostRecent) {
      const tab: Tab = { id: uuid(), pageId: mostRecent.id }
      validTabs.push(tab)
      activeTabId = tab.id
    }
  }

  set({ ...workspace, tabs: validTabs, activeTabId, initialized: true })
  if (validTabs.length > 0) saveTabState(validTabs, activeTabId)
  initInProgress = false
},
```

- [ ] **Step 5: Update persist() to pass key**

Replace the `persist()` method with:

```ts
persist() {
  if (!get().initialized) return
  const { tabs, activeTabId } = get()
  if (tabs.length > 0) saveTabState(tabs, activeTabId)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const { initialized, pages, rootPages, tabs, activeTabId, cryptoKey } = get()
    if (!initialized || !cryptoKey) return
    await saveWorkspace({ pages, rootPages, tabs, activeTabId }, cryptoKey)
  }, 500)
},
```

- [ ] **Step 6: Update syncFromRemote() to use loadWorkspace**

Replace `syncFromRemote()` with:

```ts
async syncFromRemote() {
  if (!get().initialized) return
  const { cryptoKey } = get()
  if (!cryptoKey) return
  const remote = await loadWorkspace(cryptoKey)
  if (!remote) return
  set(s => {
    const validTabs = s.tabs.filter(t => remote.pages[t.pageId])
    const activeTabId = validTabs.some(t => t.id === s.activeTabId)
      ? s.activeTabId
      : (validTabs[validTabs.length - 1]?.id ?? null)
    return { pages: remote.pages, rootPages: remote.rootPages, tabs: validTabs, activeTabId }
  })
},
```

- [ ] **Step 7: Remove unused supabase import if syncFromRemote no longer uses it directly**

Check if `supabase` is still used elsewhere in workspace.ts. If `syncFromRemote` was the only user of `supabase` in this file, remove the import. (The `getOrCreateKey` call in `init()` uses supabase internally via `crypto.ts`, not directly here.)

Actually: `supabase` is imported for `supabase.auth.getUser()` in the new `init()`, so keep it.

- [ ] **Step 8: Build**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -20
```

Expected: clean build. Fix any type errors before continuing.

- [ ] **Step 9: Manual test**

Open the app in browser. Sign in. Verify:
- Pages load correctly
- Creating a new page works
- Editing content persists after refresh
- Check Supabase dashboard: `workspaces` table data column should now contain `{"encrypted":"<base64>"}` instead of plain JSON

- [ ] **Step 10: Commit**

```bash
git add src/stores/workspace.ts
git commit -m "feat: wire CryptoKey through workspace store init, persist, and sync"
```

---

## Task 5: Extract BoardSection.tsx

**Files:**
- Create: `src/components/BoardSection.tsx`
- Modify: `src/components/BoardView.tsx`

- [ ] **Step 1: Read BoardView.tsx lines 1–120**

Read `/Users/michael/flowspace/src/components/BoardView.tsx` with `limit: 120` to locate the `SectionBlock` function definition and its imports.

- [ ] **Step 2: Create BoardSection.tsx**

Find the full `SectionBlock` function in BoardView.tsx. Create `src/components/BoardSection.tsx` with its exact code plus only the imports it needs:

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'

interface SectionData {
  title: string
  x: number
  y: number
}

interface BoardSectionProps {
  id: string
  data: SectionData
  selected: boolean
  onTitleChange: (id: string, title: string) => void
  onDelete: (id: string) => void
  onMouseDown: (e: React.MouseEvent, id: string) => void
  onMouseEnter: (id: string) => void
  onMouseLeave: () => void
}

export default function BoardSection({
  id, data, selected, onTitleChange, onDelete, onMouseDown, onMouseEnter, onMouseLeave,
}: BoardSectionProps) {
  const [hovered, setHovered] = useState(false)
  // Paste the exact body of SectionBlock from BoardView.tsx here,
  // replacing prop names to match the interface above
}
```

> Note: copy the exact JSX from the `SectionBlock` function in BoardView.tsx — don't rewrite it.

- [ ] **Step 3: In BoardView.tsx, delete the SectionBlock function and add the import**

At the top of BoardView.tsx, add:
```ts
import BoardSection from './BoardSection'
```

Delete the `SectionBlock` function definition from BoardView.tsx.

Replace all usages of `<SectionBlock` in BoardView with `<BoardSection`.

- [ ] **Step 4: Build**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/BoardSection.tsx src/components/BoardView.tsx
git commit -m "refactor: extract BoardSection component from BoardView"
```

---

## Task 6: Extract BoardCard.tsx (ImageCard)

**Files:**
- Create: `src/components/BoardCard.tsx`
- Modify: `src/components/BoardView.tsx`

- [ ] **Step 1: Read BoardView.tsx to find ImageCard**

Read `/Users/michael/flowspace/src/components/BoardView.tsx` with `offset: 100, limit: 80` to locate the `ImageCard` function.

- [ ] **Step 2: Create BoardCard.tsx**

Create `src/components/BoardCard.tsx` with the exact `ImageCard` function body and its required imports:

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'

interface ImageData {
  url: string
  x: number
  y: number
  width: number
  height: number
}

interface BoardCardProps {
  id: string
  data: ImageData
  selected: boolean
  onDragStart: (e: React.MouseEvent, id: string) => void
  onDelete: (id: string) => void
}

export default function BoardCard({
  id, data, selected, onDragStart, onDelete,
}: BoardCardProps) {
  const [hovered, setHovered] = useState(false)
  // Paste the exact body of ImageCard from BoardView.tsx here
}
```

- [ ] **Step 3: Update BoardView.tsx**

Add import at top:
```ts
import BoardCard from './BoardCard'
```

Delete `ImageCard` function from BoardView.tsx. Replace all `<ImageCard` usages with `<BoardCard`.

- [ ] **Step 4: Build**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/BoardCard.tsx src/components/BoardView.tsx
git commit -m "refactor: extract BoardCard (ImageCard) component from BoardView"
```

---

## Task 7: Extract BoardToolbox.tsx

**Files:**
- Create: `src/components/BoardToolbox.tsx`
- Modify: `src/components/BoardView.tsx`

- [ ] **Step 1: Read the toolbox panel in BoardView.tsx**

Read `/Users/michael/flowspace/src/components/BoardView.tsx` with `offset: 860` to locate the fixed bottom-right toolbox panel JSX.

- [ ] **Step 2: Create BoardToolbox.tsx**

The toolbox panel currently renders inline in BoardView's return. Extract it into a component. The toolbox needs: `zoom`, `zoomBy`, `resetView`, `toolboxItems`. Create `src/components/BoardToolbox.tsx`:

```tsx
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface ToolboxItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  active: boolean
}

interface BoardToolboxProps {
  zoom: number
  toolboxItems: ToolboxItem[]
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
}

export default function BoardToolbox({ zoom, toolboxItems, onZoomIn, onZoomOut, onResetView }: BoardToolboxProps) {
  return (
    <div
      className="fixed right-6 z-40 flex flex-col bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl overflow-hidden"
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      <div className="flex flex-col gap-1 p-1.5">
        {toolboxItems.map(t => (
          <button key={t.label} onClick={t.onClick} title={t.label}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${t.active ? 'bg-accent/20 text-accent' : 'text-gray-500 hover:text-white hover:bg-surface-3'}`}>
            {t.icon}<span className="text-[10px] leading-none">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-surface-3 mx-1.5" />
      <div className="flex items-center gap-0.5 p-1.5">
        <button onClick={onZoomOut} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"><ZoomOut size={13} /></button>
        <button onClick={onResetView} className="px-1.5 py-1 text-[10px] text-gray-400 hover:text-white transition-colors min-w-[2.8rem] text-center">{Math.round(zoom * 100)}%</button>
        <button onClick={onZoomIn} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"><ZoomIn size={13} /></button>
        <button onClick={onResetView} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"><Maximize2 size={13} /></button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update BoardView.tsx**

Add import:
```ts
import BoardToolbox from './BoardToolbox'
```

Replace the inline toolbox panel JSX with:
```tsx
<BoardToolbox
  zoom={zoom}
  toolboxItems={toolboxItems}
  onZoomIn={() => zoomBy(1.25)}
  onZoomOut={() => zoomBy(0.8)}
  onResetView={resetView}
/>
```

Remove `ZoomIn`, `ZoomOut`, `Maximize2` from BoardView's lucide-react import if they're no longer used there.

- [ ] **Step 4: Build**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 5: Visual check**

Open a board in the app. Confirm the toolbox panel still renders correctly with zoom controls and tool buttons. Test zoom in/out and reset view.

- [ ] **Step 6: Commit**

```bash
git add src/components/BoardToolbox.tsx src/components/BoardView.tsx
git commit -m "refactor: extract BoardToolbox component from BoardView"
```

---

## Task 8: AI token efficiency — trim message history and card text

**Files:**
- Modify: `src/components/AiPanel.tsx`

The current `send()` function passes the full `messages` array and full `boardContext` to the API on every call. As conversations grow, this wastes tokens. Fix: cap history at last 10 messages; truncate card text at 300 chars.

- [ ] **Step 1: Read AiPanel.tsx**

Read `/Users/michael/flowspace/src/components/AiPanel.tsx` to confirm the `send()` function's fetch body.

- [ ] **Step 2: Find and update the fetch body in send()**

Locate this line in `send()`:

```ts
const apiMessages = [...messages, { role: 'user' as const, content: text }]
```

Replace with:

```ts
const allMessages = [...messages, { role: 'user' as const, content: text }]
// Cap history to last 10 messages to limit token usage
const apiMessages = allMessages.slice(-10)
```

- [ ] **Step 3: Trim boardContext card text before the fetch call**

Immediately before the `fetch(endpoint, ...)` call, add:

```ts
const trimmedBoardContext = {
  ...boardContext,
  cards: boardContext.cards.map(c => ({ ...c, text: c.text.slice(0, 300) })),
}
```

Then update the fetch body to use `trimmedBoardContext` instead of `boardContext`:

```ts
body: JSON.stringify({
  messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
  boardContext: trimmedBoardContext,
}),
```

- [ ] **Step 4: Build**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 5: Manual test**

Open a board with the AI panel. Send several messages. Verify responses still work. Confirm a long conversation (>10 messages) doesn't break — the AI may lose older context but should still respond to recent messages.

- [ ] **Step 6: Commit**

```bash
git add src/components/AiPanel.tsx
git commit -m "perf: cap AI message history at 10 and truncate card text to reduce token usage"
```

---

## Task 9: Deploy to production

- [ ] **Step 1: Final build check**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 2: Run all tests**

```bash
cd /Users/michael/flowspace && bun vitest run
```

Expected: 3 tests pass (crypto round-trip, unique IV, tamper detection)

- [ ] **Step 3: Deploy**

```bash
vercel --prod --yes --scope mgordon04g-2640s-projects
```

- [ ] **Step 4: Smoke test on production**

1. Open flowspaced.com in a fresh browser session
2. Sign in
3. Open a page — content should load
4. Edit a block — should persist after refresh
5. Open Supabase dashboard → workspaces table → confirm `data` column shows `{"encrypted":"..."}` (not plaintext JSON)
6. Open a board, use the AI panel — should still respond
7. Confirm toolbox renders correctly on the board
