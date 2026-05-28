# Flowspace Developer Guide

A reference for making changes, deploying, and understanding the codebase — no Claude required.

---

## Revision History

| Date | What was added or changed |
|---|---|
| 2026-05-07 | Guide created, landing page scroll fix |
| 2026-05-06 | AES-GCM encryption, board component refactor, mobile shell, real-time cross-device sync, AI token optimisation |

---

## Setup (one-time)

```bash
cd /Users/michael/flowspace
npm install
```

---

## Daily Workflow

### 1. Start the dev server

```bash
cd /Users/michael/flowspace
npm run dev
```

Opens at **http://localhost:5173** — hot-reloads on every save. No build step needed during development.

### 2. Find what to edit

| What you want to change | Where to look |
|---|---|
| Landing page | `src/components/LandingPage.tsx` |
| Mobile layout | `src/components/MobileShell.tsx` |
| Desktop layout | `src/components/DesktopShell.tsx` |
| Block editor (pages) | `src/components/PageView.tsx` |
| Board/kanban view | `src/components/BoardView.tsx` |
| Board cards | `src/components/BoardCard.tsx` |
| Board column sections | `src/components/BoardSection.tsx` |
| Board toolbar | `src/components/BoardToolbox.tsx` |
| Sidebar (desktop) | `src/components/Sidebar.tsx` |
| Global styles | `src/index.css` |
| App state / data model | `src/stores/workspace.ts` |
| Auth (sign in/up/out) | `src/stores/auth.ts` |
| Save/load workspace | `src/lib/storage.ts` |
| Encryption | `src/lib/crypto.ts` |
| Supabase client | `src/lib/supabase.ts` |

### 3. Make your change, save, check the browser

No compile step needed during dev — the browser updates instantly.

### 4. Build before deploying

```bash
npm run build
```

Compiles everything to `dist/`. Watch for errors here — if build fails, deployment will fail too.

---

## Deploying to Production

```bash
vercel deploy --prod --yes --scope mgordon04g-2640s-projects
```

Run this from `/Users/michael/flowspace`. Takes ~30–60 seconds.

Live at: **https://flowspaced.com**

---

## What the Code Actually Means

### The big picture

Flowspace is a single-page app (SPA). When you visit the site, the browser downloads one big JavaScript bundle and runs everything locally — there is no traditional server rendering pages. The "backend" is just Supabase (a hosted Postgres database + auth service).

```
Browser → React app (your code) → Supabase (database + auth)
```

### How data flows

1. User signs in → Supabase returns a session token
2. App calls `workspace.init()` → fetches the user's workspace from Supabase
3. User makes changes → workspace state updates in memory (Zustand store)
4. After 1 second of inactivity → `persist()` saves to Supabase (debounced to avoid hammering the database)
5. Another device → Supabase realtime broadcasts the change → second device calls `syncFromRemote()`

### What a "page" is

A page is just a JavaScript object:
```
{ id, title, icon, parentId, boardMode, blocks: [...] }
```

All pages live in a flat dictionary (`pages: { [id]: Page }`) in the workspace store. The sidebar tree is built by following `parentId` references. `boardMode: true` means it renders as a kanban board instead of a text document.

### What a "block" is

Everything inside a page is a block — a paragraph, heading, to-do item, code snippet, image, etc. Each block has a `type` and a `content` string. The editor works by rendering a list of these blocks and letting you edit them individually.

### What Zustand is

Zustand is the state manager — think of it as a global variable that all components can read from and write to. When any component calls `useWorkspace()`, it gets access to the current state and functions to change it. When state changes, only the components that use that piece of state re-render.

### What Tailwind CSS is

Instead of writing separate `.css` files, styles are written as class names directly on elements: `className="flex items-center gap-2 text-sm text-gray-400"`. Tailwind converts these class names into CSS at build time. This means all styling is co-located with the component that uses it.

### What TypeScript is

TypeScript is JavaScript with type annotations. The `: string`, `: number`, `interface`, and `type` keywords are all TypeScript — they disappear at build time and don't affect runtime behaviour. Their job is to catch mistakes before the code runs (e.g. passing a number where a string is expected).

---

## Encryption (added 2026-05-06)

### Why it exists

Before encryption was added, workspace data was stored in Supabase as plain JSON — anyone with database access (including Supabase staff, or anyone who found a leaked key) could read your notes. Encryption means the data in the database is unreadable without your specific encryption key.

### How it works — plain English

1. **Key generation**: When you first sign in, the app generates a random 256-bit encryption key using the browser's built-in `crypto.subtle` API. This is a one-time event per account.

2. **Key storage**: That key is saved (as a base64 string) in a Supabase table called `user_keys`. Only your user ID can read your own key — this is enforced by Row Level Security (RLS) on the database.

3. **Saving**: Before workspace data is sent to Supabase, it is encrypted using AES-GCM (a military-grade standard). The result is a base64 blob that looks like random noise.

4. **Loading**: When the app starts, it fetches the key from `user_keys`, then uses it to decrypt the workspace data before rendering anything.

5. **IV (Initialisation Vector)**: Each time data is encrypted, a random 12-byte IV is generated and prepended to the ciphertext. This ensures the same data encrypts differently every time, preventing pattern analysis.

### The files involved

| File | Role |
|---|---|
| `src/lib/crypto.ts` | Core encrypt/decrypt/key functions |
| `src/lib/storage.ts` | Calls encrypt before saving, decrypt after loading |
| `src/stores/workspace.ts` | Fetches the key on init, passes it to storage functions |

### What AES-GCM means

- **AES** — Advanced Encryption Standard. The global standard used by banks, governments, and the military.
- **256** — 256-bit key length. There are 2²⁵⁶ possible keys — more than the number of atoms in the observable universe.
- **GCM** — Galois/Counter Mode. Not just encrypts, but also verifies the data hasn't been tampered with.

### Current limitation

The encryption key itself is stored in Supabase (`user_keys` table). This means Supabase (or anyone with your service role key) could technically read both the key and the encrypted data. True zero-knowledge would require storing the key only on your device, derived from a passphrase you never send to the server. That's a possible future improvement.

---

## Real-Time Sync (added 2026-05-06)

When you save on one device, the change is broadcast over a Supabase Realtime channel. Other devices listening on the same channel call `syncFromRemote()`, which fetches and decrypts the latest workspace and merges it into local state. A per-session device ID prevents a device from processing its own broadcasts.

---

## Git Basics

### Save your work (commit)

```bash
git add src/components/MyFile.tsx      # stage specific file
# or
git add src/                           # stage all src changes

git commit -m "fix: description of what you changed"
```

**Commit message prefixes** (convention used in this project):

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `perf:` | Performance improvement |
| `refactor:` | Code restructure, no behaviour change |
| `docs:` | Documentation only |
| `style:` | Visual/CSS changes |

### See what changed

```bash
git status                  # list changed files
git diff                    # see exact line changes
git diff src/components/    # changes in a specific folder
git log --oneline           # recent commit history
git log --oneline --graph   # history with branch diagram
```

### Undo a change you haven't committed yet

```bash
git restore src/components/MyFile.tsx
```

### Undo the last commit (keeps your changes, just un-commits)

```bash
git reset HEAD~1
```

### See what a past commit changed

```bash
git show <commit-hash>      # e.g. git show 8f974c5c
```

---

## Working with GitHub

### Push your commits to GitHub

```bash
git push origin review        # pushes to the "review" branch
```

> The current branch is `review`. To push to a different branch, replace `review` with the branch name.

### Pull someone else's changes

```bash
git pull origin review
```

### Create a new branch for a feature

```bash
git checkout -b feature/my-feature-name
# make changes, commit...
git push origin feature/my-feature-name
```

Then open a Pull Request on GitHub to merge it into `review`.

### Apply a GitHub PR locally

```bash
git fetch origin
git checkout origin/pr-branch-name
```

### Merge a finished feature back to review

```bash
git checkout review
git merge feature/my-feature-name
git push origin review
```

---

## Environment Variables

Supabase keys and other secrets live in `.env.local` (not committed to git):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

To add a new env var, add it to `.env.local` and prefix it with `VITE_` so Vite exposes it to the frontend. Access it in code as `import.meta.env.VITE_YOUR_VAR`.

---

## Database (Supabase)

Project URL: **https://cbzpbeeqfmpzdhdwtmrw.supabase.co**

Log in at [supabase.com](https://supabase.com) to:
- Browse/edit table data (Table Editor)
- Run SQL queries (SQL Editor)
- Check auth users (Authentication tab)
- View function/query logs (Logs tab)

### Key tables

| Table | What it holds |
|---|---|
| `workspaces` | One row per user — the encrypted workspace blob |
| `user_keys` | One row per user — the AES-256 encryption key |
| `page_shares` | Shared board records (who shared what with whom) |
| `notifications` | In-app notifications for share events |

---

## Ways to Move Forward

These are natural next steps based on the current architecture. Each is independent — pick any one without needing the others first.

### Short-term (days of work)

- **Export to PDF / Markdown** — Add an export button to pages. Markdown is straightforward: walk the block list and convert each block type to its Markdown equivalent. PDF requires a library like `jspdf` or a headless-print approach.

- **Page templates** — When creating a new page, offer starter templates (meeting notes, project brief, daily journal). These are just pre-populated block arrays passed to `createPage()`.

- **Keyboard shortcuts** — Most editor actions already have functions in the workspace store. Wiring them to keyboard shortcuts is a matter of adding `keydown` listeners in `PageView.tsx`.

- **Drag-to-reorder blocks** — The block list in `PageView.tsx` could use a drag library like `@dnd-kit/core` to let you reorder blocks by dragging, the same way Notion does.

- **Offline support** — The Electron path already has a local file fallback. For the web version, a `localStorage` or IndexedDB cache would let the app load without network and sync when connection returns.

### Medium-term (weeks of work)

- **True zero-knowledge encryption** — Derive the encryption key from a user-set passphrase using PBKDF2, never storing the key on the server. Supabase would then hold truly unreadable ciphertext.

- **Multi-user collaboration** — Supabase Realtime already handles broadcasting. The missing piece is a CRDT (Conflict-free Replicated Data Type) like Yjs to merge concurrent edits without conflicts.

- **Rich media blocks** — Image upload (Supabase Storage), video embeds, file attachments. The block data model supports any `type`, so it's mostly UI + storage wiring.

- **Mobile app** — The React codebase could be wrapped in React Native (via Expo) or Capacitor to ship on iOS/Android with the same business logic.

- **Search** — A full-text search across all pages and blocks. Could be done client-side with a library like `minisearch` or server-side with Postgres full-text search via a Supabase RPC.

### Long-term (months of work)

- **Plugin system** — Allow custom block types to be registered, enabling third-party integrations (e.g. a GitHub issues block, a calendar block).

- **Version history** — Store diffs or snapshots in Supabase so you can roll back a page to any past state.

- **Desktop app (Electron)** — The Electron shell already exists in the codebase. Packaging it for distribution on Mac, Windows, and Linux via GitHub Releases is the remaining work.

---

## Common Issues

**Port 5173 already in use**
```bash
kill $(lsof -ti:5173)
npm run dev
```

**Build fails with type errors**
```bash
npx tsc --noEmit    # shows all TypeScript errors with line numbers
```

**Changes deployed but not showing up**
Hard-refresh the browser: `Cmd+Shift+R`

**Vercel deploy says "not authenticated"**
```bash
vercel login
```

**Supabase data looks wrong after testing**
Open the Supabase Table Editor, find the `workspaces` table, and manually delete your test row. The app will re-create it cleanly on next save.
