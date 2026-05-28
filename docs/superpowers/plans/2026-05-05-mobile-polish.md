# Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Flowspace fully usable on mobile browsers by splitting the app shell into mobile/desktop variants while keeping all content components shared.

**Architecture:** A `useIsMobile` hook (768px breakpoint) feeds a boolean into `App.tsx`, which renders either `DesktopShell` (current layout, unchanged) or `MobileShell` (hamburger drawer + tab picker header). All content components — `PageView`, `BoardView`, `HomeScreen` — are shared by both shells with no logic forks. `BoardView` gains touch pan/pinch-to-zoom on mobile.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Vite (no test framework — verification is TypeScript build + manual browser check)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/hooks/useIsMobile.ts` | 768px media query, live boolean |
| Create | `src/components/DesktopShell.tsx` | Current desktop layout extracted from App.tsx |
| Create | `src/components/MobileShell.tsx` | Mobile header + drawer + tab picker |
| Modify | `src/App.tsx` | Delegates to DesktopShell or MobileShell |
| Modify | `src/components/BoardView.tsx` | Touch pan + pinch-to-zoom handlers |
| Modify | `src/components/PageView.tsx` | Responsive horizontal padding |

---

## Task 1: `useIsMobile` hook

**Files:**
- Create: `src/hooks/useIsMobile.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useIsMobile.ts
import { useState, useEffect } from 'react'

const QUERY = '(max-width: 768px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/michael/flowspace && bun run build 2>&1 | tail -10`
Expected: no errors (or same errors as before this task)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useIsMobile.ts
git commit -m "feat: add useIsMobile hook (768px breakpoint)"
```

---

## Task 2: Extract `DesktopShell`

**Files:**
- Create: `src/components/DesktopShell.tsx`
- Modify: `src/App.tsx` (prep only — full wiring in Task 4)

The desktop shell is the current App.tsx render verbatim, moved to its own component. `App.tsx` keeps all hooks, effects, and state — only the JSX return moves.

- [ ] **Step 1: Create `DesktopShell.tsx`**

```tsx
// src/components/DesktopShell.tsx
import { useWorkspace } from '@/stores/workspace'
import TabBar from './TabBar'
import Sidebar from './Sidebar'
import PageView from './PageView'
import BoardView from './BoardView'
import HomeScreen from './HomeScreen'
import CommandPalette from './CommandPalette'

interface Props {
  paletteOpen: boolean
  onClosePalette: () => void
}

export default function DesktopShell({ paletteOpen, onClosePalette }: Props) {
  const { tabs, activeTabId, pages, sidebarOpen } = useWorkspace()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const activePage = activeTab ? pages[activeTab.pageId] : null

  return (
    <div className="h-screen bg-surface-0 flex flex-col overflow-hidden text-sm">
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <div className={`transition-all duration-200 ease-in-out overflow-hidden shrink-0 ${sidebarOpen ? 'w-56' : 'w-0'}`}>
          <Sidebar />
        </div>
        {activeTab ? (
          activePage?.boardMode
            ? <BoardView key={activeTab.pageId} pageId={activeTab.pageId} />
            : <PageView key={activeTab.pageId} pageId={activeTab.pageId} />
        ) : (
          <HomeScreen />
        )}
      </div>
      {paletteOpen && <CommandPalette onClose={onClosePalette} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/michael/flowspace && bun run build 2>&1 | tail -10`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/DesktopShell.tsx
git commit -m "feat: extract DesktopShell component from App.tsx"
```

---

## Task 3: Build `MobileShell`

**Files:**
- Create: `src/components/MobileShell.tsx`

- [ ] **Step 1: Create `MobileShell.tsx`**

```tsx
// src/components/MobileShell.tsx
import { useState } from 'react'
import { Menu, X, ChevronDown, Plus } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import Sidebar from './Sidebar'
import PageView from './PageView'
import BoardView from './BoardView'
import HomeScreen from './HomeScreen'
import NotificationsMenu from './NotificationsMenu'
import AvatarMenu from './AvatarMenu'
import CommandPalette from './CommandPalette'

interface Props {
  paletteOpen: boolean
  onClosePalette: () => void
}

export default function MobileShell({ paletteOpen, onClosePalette }: Props) {
  const { tabs, activeTabId, pages, setActiveTab, createPage, openTab, setHomeActive } = useWorkspace()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tabPickerOpen, setTabPickerOpen] = useState(false)

  const activeTab = tabs.find(t => t.id === activeTabId)
  const activePage = activeTab ? pages[activeTab.pageId] : null

  function handleNewPage() {
    const id = createPage(null)
    openTab(id)
    setTabPickerOpen(false)
  }

  return (
    <div className="h-screen bg-surface-0 flex flex-col overflow-hidden text-sm">

      {/* ── Header ── */}
      <div className="flex items-center h-12 bg-surface-1 border-b border-surface-3 shrink-0 px-2 gap-2 relative z-30">
        <button
          onClick={() => { setDrawerOpen(true); setTabPickerOpen(false) }}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors shrink-0"
        >
          <Menu size={18} />
        </button>

        {/* Tab picker pill */}
        <button
          onClick={() => setTabPickerOpen(p => !p)}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-3 text-sm min-w-0"
        >
          <span className="text-xs shrink-0">{activePage?.icon ?? '🏠'}</span>
          <span className="truncate flex-1 text-left text-white">
            {activePage?.title || (activeTabId === null ? 'Home' : 'Untitled')}
          </span>
          <ChevronDown size={14} className="text-gray-500 shrink-0" />
        </button>

        <NotificationsMenu />
        <AvatarMenu />
      </div>

      {/* ── Tab picker dropdown ── */}
      {tabPickerOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setTabPickerOpen(false)} />
          <div className="absolute top-12 left-0 right-0 z-30 bg-surface-2 border-b border-surface-3 shadow-xl">
            <button
              onClick={() => { setHomeActive(); setTabPickerOpen(false) }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${
                activeTabId === null ? 'text-white bg-surface-3' : 'text-gray-400 hover:text-white hover:bg-surface-3'
              }`}
            >
              <span className="text-base">🏠</span>
              <span>Home</span>
            </button>
            {tabs.map(tab => {
              const page = pages[tab.pageId]
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setTabPickerOpen(false) }}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${
                    tab.id === activeTabId ? 'text-white bg-surface-3' : 'text-gray-400 hover:text-white hover:bg-surface-3'
                  }`}
                >
                  <span className="text-base shrink-0">{page?.icon ?? '📄'}</span>
                  <span className="truncate flex-1 text-left">{page?.title || 'Untitled'}</span>
                </button>
              )
            })}
            <button
              onClick={handleNewPage}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-accent hover:bg-surface-3 transition-colors border-t border-surface-3"
            >
              <Plus size={16} />
              <span>New page</span>
            </button>
          </div>
        </>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab ? (
          activePage?.boardMode
            ? <BoardView key={activeTab.pageId} pageId={activeTab.pageId} />
            : <PageView key={activeTab.pageId} pageId={activeTab.pageId} />
        ) : (
          <HomeScreen />
        )}
      </div>

      {/* ── Sidebar drawer ── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-surface-1 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between h-12 px-4 border-b border-surface-3 shrink-0">
              <span className="text-sm font-medium text-gray-300">Menu</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar />
            </div>
          </div>
        </>
      )}

      {paletteOpen && <CommandPalette onClose={onClosePalette} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/michael/flowspace && bun run build 2>&1 | tail -10`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileShell.tsx
git commit -m "feat: add MobileShell with hamburger drawer and tab picker"
```

---

## Task 4: Wire `App.tsx`

**Files:**
- Modify: `src/App.tsx`

Replace the current JSX return with a conditional shell dispatch. All existing hooks and effects stay exactly where they are.

- [ ] **Step 1: Update `App.tsx`**

Replace the entire file content with:

```tsx
// src/App.tsx
import { useEffect, useState } from 'react'

const ANNOUNCEMENT = {
  id: '2026-05-02',
  message: '05/02/2026 Updates and Bug Fixes',
  sub: 'Sections, lasso tool, image attachments, and R2 file storage.',
}

import { useWorkspace } from '@/stores/workspace'
import { useAuth } from '@/stores/auth'
import { useSharing } from '@/stores/sharing'
import { useNotifications } from '@/stores/notifications'
import { useInvites } from '@/stores/invites'
import { supabase } from '@/lib/supabase'
import { appChannel } from '@/lib/appChannel'
import { useIsMobile } from '@/hooks/useIsMobile'
import DesktopShell from '@/components/DesktopShell'
import MobileShell from '@/components/MobileShell'
import ToastStack from '@/components/ToastStack'

export default function App() {
  const { init: initAuth, user, loading: authLoading } = useAuth()
  const { init: initWorkspace, initialized, tabs, activeTabId, createPage, createBoard, openTab, closeTab, setHomeActive, toggleSidebar } = useWorkspace()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { loadSharedWithMe, loadMyShares } = useSharing()
  const { add: addToast } = useNotifications()
  const { loadPendingInvites, loadOwnerNotifs } = useInvites()
  const isMobile = useIsMobile()

  useEffect(() => { initAuth() }, [])

  useEffect(() => {
    if (!user) return
    const key = `flowspace_announcement_${ANNOUNCEMENT.id}`
    if (localStorage.getItem(key)) return
    setTimeout(() => {
      addToast({ type: 'info', message: ANNOUNCEMENT.message, sub: ANNOUNCEMENT.sub })
      localStorage.setItem(key, '1')
    }, 1500)
  }, [user])

  useEffect(() => {
    if (authLoading || !user) return
    if (!initialized) initWorkspace()
    if (user.email) {
      loadSharedWithMe(user.email)
      loadMyShares(user.id)
      loadPendingInvites(user.email)
      loadOwnerNotifs(user.id)
    }
  }, [authLoading, user])

  useEffect(() => {
    appChannel
      .on('broadcast', { event: 'invite-ping' }, ({ payload }) => {
        const me = useAuth.getState().user?.email?.toLowerCase()
        if (!me || payload.recipientEmail !== me) return
        const myEmail = useAuth.getState().user!.email!
        addToast({ type: 'info', message: `${payload.ownerEmail} invited you to a board`, sub: payload.pageTitle })
        useInvites.getState().loadPendingInvites(myEmail)
      })
      .on('broadcast', { event: 'notif-ping' }, ({ payload }) => {
        const me = useAuth.getState().user?.email?.toLowerCase()
        if (!me || payload.recipientEmail !== me) return
        const myId = useAuth.getState().user!.id
        addToast({ type: 'info', message: payload.title, sub: payload.body })
        useInvites.getState().loadOwnerNotifs(myId)
      })
      .subscribe()
  }, [])

  useEffect(() => {
    if (!user?.email) return
    const channel = supabase
      .channel(`access:${user.email.trim().toLowerCase()}`)
      .on('broadcast', { event: 'revoked' }, ({ payload }) => {
        const pageId = payload?.pageId as string
        if (!pageId) return
        useSharing.getState().loadSharedWithMe(user.email!)
        const ws = useWorkspace.getState()
        ws.tabs.filter(t => t.pageId === pageId).forEach(t => ws.closeTab(t.id))
        useWorkspace.setState(s => { const p = { ...s.pages }; delete p[pageId]; return { pages: p } })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.email])

  // Global keyboard shortcuts (desktop only — no-ops on mobile but harmless)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p) }
      if (mod && e.key === 'n') { e.preventDefault(); const id = createBoard(null); openTab(id) }
      if (mod && e.key === 'w') {
        e.preventDefault()
        const active = tabs.find(t => t.id === activeTabId)
        if (active) closeTab(active.id)
      }
      if (mod && e.key === '[') { e.preventDefault(); toggleSidebar() }
      if (mod && e.key === 'h') { e.preventDefault(); setHomeActive() }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tabs, activeTabId])

  // ── Loading / auth gates ──
  if (authLoading) {
    return <div className="h-screen bg-surface-0 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
  }

  if (!user) {
    if (showAuth) return <AuthPage />
    return <LandingPage onGetStarted={() => setShowAuth(true)} />
  }

  if (!initialized) {
    return <div className="h-screen bg-surface-0 flex items-center justify-center text-gray-500 text-sm">Loading workspace…</div>
  }

  return (
    <>
      {isMobile
        ? <MobileShell paletteOpen={paletteOpen} onClosePalette={() => setPaletteOpen(false)} />
        : <DesktopShell paletteOpen={paletteOpen} onClosePalette={() => setPaletteOpen(false)} />
      }
      <ToastStack />
    </>
  )
}
```

The full correct `App.tsx` import diff:
- **Remove:** `TabBar`, `Sidebar`, `PageView`, `BoardView`, `HomeScreen`, `CommandPalette`
- **Keep:** `AuthPage`, `LandingPage`, `ToastStack`
- **Add:** `useIsMobile`, `DesktopShell`, `MobileShell`
- **Keep:** `const [showAuth, setShowAuth] = useState(false)` in the component body
- All effects and state stay exactly as they are in the original file

- [ ] **Step 2: Verify build**

Run: `cd /Users/michael/flowspace && bun run build 2>&1 | tail -20`
Expected: no errors

- [ ] **Step 3: Manual smoke test**

Run: `cd /Users/michael/flowspace && bun run dev`
- Open http://localhost:5173 on desktop → should look identical to before
- Open Chrome DevTools → toggle device toolbar to iPhone size → should show hamburger header
- Tap ☰ → sidebar drawer slides in
- Tap the pill → tab picker dropdown appears
- Tap a page → navigates to it, dropdown closes

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire mobile/desktop shell switching in App.tsx"
```

---

## Task 5: `BoardView` touch support

**Files:**
- Modify: `src/components/BoardView.tsx`

The board is a free-form canvas. Desktop uses mouse events. Mobile needs single-finger touch-drag to pan and two-finger pinch to zoom. Add a `useEffect` alongside the existing wheel zoom `useEffect`.

- [ ] **Step 1: Add touch handlers to `BoardView.tsx`**

Find the wheel zoom `useEffect` block (around line 308) and add this new `useEffect` immediately after it:

```tsx
// ── touch pan + pinch-to-zoom ──
useEffect(() => {
  const el = viewportRef.current; if (!el) return

  let lastTouchDist: number | null = null
  let lastSingleTouch: { x: number; y: number } | null = null

  function getTouchDist(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.hypot(dx, dy)
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      lastTouchDist = null
    } else if (e.touches.length === 2) {
      lastTouchDist = getTouchDist(e.touches)
      lastSingleTouch = null
      e.preventDefault()
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && lastSingleTouch) {
      const dx = e.touches[0].clientX - lastSingleTouch.x
      const dy = e.touches[0].clientY - lastSingleTouch.y
      const np = { x: panRef.current.x + dx, y: panRef.current.y + dy }
      panRef.current = np; setPan(np)
      lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      e.preventDefault()
    } else if (e.touches.length === 2 && lastTouchDist !== null) {
      const newDist = getTouchDist(e.touches)
      const factor = newDist / lastTouchDist
      lastTouchDist = newDist

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const rect = el.getBoundingClientRect()
      const cx = midX - rect.left, cy = midY - rect.top
      const oldZ = zoomRef.current
      const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * factor))
      const np = { x: cx - (cx - panRef.current.x) * (newZ / oldZ), y: cy - (cy - panRef.current.y) * (newZ / oldZ) }
      zoomRef.current = newZ; panRef.current = np; setZoom(newZ); setPan(np)
      e.preventDefault()
    }
  }

  function onTouchEnd() {
    lastSingleTouch = null
    lastTouchDist = null
  }

  el.addEventListener('touchstart', onTouchStart, { passive: false })
  el.addEventListener('touchmove', onTouchMove, { passive: false })
  el.addEventListener('touchend', onTouchEnd)
  return () => {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  }
}, [])
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/michael/flowspace && bun run build 2>&1 | tail -10`
Expected: no errors

- [ ] **Step 3: Manual test on mobile**

Run: `cd /Users/michael/flowspace && bun run dev`
- Open in Chrome DevTools mobile simulator (or real device via LAN)
- Open a board page
- Single-finger drag → canvas pans smoothly
- Two-finger pinch → canvas zooms in/out around the pinch midpoint
- Zoom ± buttons (bottom-right panel) still work with taps

- [ ] **Step 4: Commit**

```bash
git add src/components/BoardView.tsx
git commit -m "feat: add touch pan and pinch-to-zoom to BoardView"
```

---

## Task 6: `PageView` responsive padding

**Files:**
- Modify: `src/components/PageView.tsx`

The current `px-12 pt-16` is comfortable on desktop but too cramped on a 375px screen. Change to responsive values.

- [ ] **Step 1: Update padding in `PageView.tsx`**

Find this line (around line 98):
```tsx
<div className="max-w-3xl mx-auto px-12 pt-16 pb-32">
```

Replace with:
```tsx
<div className="max-w-3xl mx-auto px-4 pt-10 pb-32 md:px-12 md:pt-16">
```

- [ ] **Step 2: Update floating toolbox position**

The toolbox uses `fixed bottom-6 right-6`. On mobile, ensure it doesn't overlap with any bottom chrome. It's `fixed` so it stays in place — no change needed. However, increase touch target size for toolbox buttons on mobile by updating the button padding in the toolbox render (around line 118):

Find:
```tsx
className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
```

Replace with:
```tsx
className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/michael/flowspace && bun run build 2>&1 | tail -10`
Expected: no errors

- [ ] **Step 4: Manual test**

- Open a page view on mobile width
- Content should have comfortable left/right padding (not edge-to-edge, not too indented)
- Desktop padding should be unchanged

- [ ] **Step 5: Commit**

```bash
git add src/components/PageView.tsx
git commit -m "feat: responsive padding and touch targets in PageView"
```

---

## Task 7: Final integration check + deploy

- [ ] **Step 1: Full build**

Run: `cd /Users/michael/flowspace && bun run build 2>&1`
Expected: Build successful, no TypeScript errors

- [ ] **Step 2: End-to-end mobile smoke test**

Run dev server and test these flows on mobile width (Chrome DevTools, iPhone SE preset):

1. Sign in flow — auth page readable, inputs usable
2. Home screen — visible and scrollable
3. Open a page — hamburger opens drawer, tap a page, content loads
4. Tab picker — tap pill, see open tabs, switch between them, add new page
5. BlockEditor — type text, use `/` menu for block types
6. Board view — single-finger pan works, pinch zooms, ± buttons tap correctly
7. Drawer close — tap backdrop closes drawer

- [ ] **Step 3: Deploy**

Run: `cd /Users/michael/flowspace && vercel --prod --yes --scope mgordon04g-2640s-projects`

- [ ] **Step 4: Verify live**

Open https://flowspace-alpha.vercel.app on a real phone and repeat the smoke test from Step 2.
