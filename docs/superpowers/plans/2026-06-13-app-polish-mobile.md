# Flowspace App Polish & Mobile (Refined Dark · Calm) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the logged-in Flowspace shell + Home a polished "Refined Dark · Calm" pass (a real design-token + motion system, depth, micro-interactions, visible focus states) and make the phone experience first-class with a persistent bottom tab bar.

**Architecture:** Introduce a variable-driven token system in `src/index.css` `:root` (colors as `R G B` channel triples so Tailwind `/opacity` utilities keep working) mapped through `tailwind.config.js`, plus a small set of `@layer components` primitives (`.fs-card*`, `.btn*`, `.input`, `.micro-label`, `.focus-ring`) and a `prefers-reduced-motion` guard. Then apply those primitives to TabBar, Sidebar, Home clock & WidgetShell. For mobile, add a `BottomTabBar` component driven by a pure `getActiveMobileTab` helper, integrated into `MobileShell` (which already stacks Home widgets to one column on mobile via `WidgetShell.widgetGridStyle`).

**Tech Stack:** React 18 · TypeScript · Vite · Tailwind CSS 3 (`darkMode: 'class'`) · Zustand · lucide-react · Vitest (node env — logic tests only; no DOM/component test runner is configured).

**Spec:** `docs/superpowers/specs/2026-06-13-app-polish-mobile-design.md`

> **Verification note (read once):** This is mostly CSS/JSX visual work. The repo's Vitest runs in `environment: 'node'` with no testing-library/jsdom — so only *pure logic* is unit-tested (Task 6). Every other task is verified by `npm run typecheck` + `npm run build` (Tailwind must compile cleanly) and a stated manual check. That is the intended verification for those tasks — do not add a DOM test runner (out of scope, "no new dependencies").

---

## File Structure

**Created:**
- `src/lib/mobileTabs.ts` — pure helper: `MobileTab` type + `getActiveMobileTab()`. One responsibility: decide which bottom tab is active.
- `src/lib/mobileTabs.test.ts` — unit tests for the helper.
- `src/components/BottomTabBar.tsx` — presentational mobile bottom navigation (Home · Boards · Search · New).

**Modified:**
- `src/index.css` — add design tokens to `:root` (≈line 30); add `@layer components` primitives + keyframes + reduced-motion guard; add `.mobile-bottom-nav`; point `html` background at the surface token.
- `tailwind.config.js` — map `surface.*` and `accent.*` to `rgb(var(--…) / <alpha-value>)`.
- `src/components/TabBar.tsx` — active accent underline, focus rings, refined hover.
- `src/components/Sidebar.tsx` — active accent bar on nav rows, unify section headers to `.micro-label`, focus rings.
- `src/components/HomeScreen.tsx` — refine clock hero typography; widget-grid empty state.
- `src/components/widgets/WidgetShell.tsx` — resting-state hover lift + focus-within ring.
- `src/components/MobileShell.tsx` — mount `BottomTabBar`, replace top-pill with a title, drive the existing panel from a `panel` state, autofocus search.

**Out of scope (slice 2):** BoardView/blocks, PageView/BlockEditor, calendar, database, modal sweep, Landing/Auth, light mode, performance/code-splitting, SEO.

---

## Task 1: Design tokens (CSS variables + Tailwind mapping)

**Files:**
- Modify: `src/index.css:16-32`
- Modify: `tailwind.config.js:6-24`

**Why channel triples:** the codebase uses Tailwind opacity utilities on these colors (`bg-surface-2/70`, `border-accent/35`, `bg-accent/15`, `shadow-accent/25`, …). Mapping the Tailwind color to `rgb(var(--x) / <alpha-value>)` preserves all of them while letting the value live in a CSS variable.

- [ ] **Step 1: Add the token block to `:root` in `src/index.css`**

Replace the existing `html` rule and `:root` block (currently lines 16-32):

```css
html {
  background: rgb(var(--surface-0));
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}

#root {
  min-width: 0;
}

:root {
  --flowspace-viewport-height: 100vh;

  /* surfaces + accent as "R G B" channels → used via rgb(var(--x) / <alpha>) */
  --surface-0: 14 14 16;
  --surface-1: 22 22 24;
  --surface-2: 29 29 32;
  --surface-3: 38 38 42;
  --surface-4: 51 51 58;
  --accent-rgb: 124 106 247;
  --accent-hover-rgb: 144 128 255;
  --border-subtle-rgb: 35 35 40;
  --border-strong-rgb: 46 46 53;

  /* text tiers (hex — used directly in primitives) */
  --text-primary: #f1f1f4;
  --text-secondary: #a0a0a9;
  --text-tertiary: #6f6f79;
  --text-muted: #565660;

  /* accent gradient + focus ring */
  --accent-gradient: linear-gradient(135deg, #7c6af7, #9b8cff);
  --ring: 0 0 0 2px rgb(var(--surface-0)), 0 0 0 4px rgb(var(--accent-rgb) / 0.55);

  /* elevation */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 8px 22px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.5);
  --shadow-accent: 0 8px 22px rgb(var(--accent-rgb) / 0.2);

  /* radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* motion */
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 240ms;
  --ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

(The `@supports … 100dvh` block immediately below stays as-is — it re-declares only `--flowspace-viewport-height`.)

- [ ] **Step 2: Point Tailwind `surface`/`accent` at the variables**

In `tailwind.config.js`, replace the `colors` block (lines 7-19):

```js
      colors: {
        surface: {
          0: 'rgb(var(--surface-0) / <alpha-value>)',
          1: 'rgb(var(--surface-1) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
          4: 'rgb(var(--surface-4) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
        },
      },
```

Leave `fontFamily` unchanged.

- [ ] **Step 3: Build to verify Tailwind compiles and opacity utilities still resolve**

Run: `npm run build`
Expected: PASS (tsc + vite build complete with no errors). The app's surfaces shift slightly cooler/cleaner; nothing should turn transparent or black (that would mean an `/opacity` utility broke).

- [ ] **Step 4: Commit**

```bash
git add src/index.css tailwind.config.js
git commit -m "feat: design-token system (refined dark, calm)"
```

---

## Task 2: Primitives + motion (`@layer components`)

**Files:**
- Modify: `src/index.css` (insert after the `.mobile-shell-header { … }` rule, ~line 58, before `.mobile-shell-dropdown`)

- [ ] **Step 1: Add the primitives, keyframes, and reduced-motion guard**

Insert this block:

```css
@layer components {
  .fs-card {
    background-color: rgb(var(--surface-2));
    border: 1px solid rgb(var(--border-subtle-rgb));
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }
  .fs-card-interactive {
    transition: transform var(--dur-base) var(--ease-out),
      box-shadow var(--dur-base) var(--ease-out),
      border-color var(--dur-base) var(--ease-out),
      background-color var(--dur-base) var(--ease-out);
  }
  .fs-card-interactive:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: rgb(var(--accent-rgb) / 0.4);
  }
  .focus-ring:focus-visible {
    outline: none;
    box-shadow: var(--ring);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: var(--radius-sm);
    transition: transform var(--dur-fast) var(--ease-out),
      background-color var(--dur-base) var(--ease-out),
      box-shadow var(--dur-base) var(--ease-out),
      filter var(--dur-base) var(--ease-out);
  }
  .btn:active {
    transform: scale(0.98);
  }
  .btn-primary {
    background-image: var(--accent-gradient);
    color: #fff;
    box-shadow: var(--shadow-accent);
  }
  .btn-primary:hover {
    filter: brightness(1.06);
  }
  .btn-ghost {
    color: var(--text-secondary);
  }
  .btn-ghost:hover {
    background-color: rgb(var(--surface-3));
    color: var(--text-primary);
  }
  .input {
    background-color: rgb(var(--surface-1));
    border: 1px solid rgb(var(--border-subtle-rgb));
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    transition: border-color var(--dur-base) var(--ease-out),
      box-shadow var(--dur-base) var(--ease-out);
  }
  .input:focus-visible {
    outline: none;
    border-color: rgb(var(--accent-rgb));
    box-shadow: var(--ring);
  }
  .micro-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    color: var(--text-secondary);
  }
}

@keyframes fs-fade-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.fs-animate-in {
  animation: fs-fade-rise var(--dur-base) var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .fs-card-interactive,
  .btn,
  .input {
    transition: none !important;
  }
  .fs-card-interactive:hover {
    transform: none !important;
  }
  .btn:active {
    transform: none !important;
  }
  .fs-animate-in {
    animation: none !important;
  }
}
```

- [ ] **Step 2: Build to verify the layer compiles**

Run: `npm run build`
Expected: PASS. (No visual change yet — nothing consumes these classes until later tasks.)

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: calm motion + ui primitive classes"
```

---

## Task 3: TabBar polish (active indicator + focus rings)

**Files:**
- Modify: `src/components/TabBar.tsx`

Adds a static accent underline to the active Home/tab, a `focus-ring` to every button, and keeps hover subtle (Calm — no lift on full-height tab segments).

- [ ] **Step 1: Home button — add `relative`, `focus-ring`, and an active underline**

Replace the Home button (lines 32-40):

```tsx
      {/* Home button */}
      <button
        onClick={() => setHomeActive()}
        className={`focus-ring relative flex items-center justify-center w-10 h-full border-r border-surface-3 shrink-0 transition-colors ${
          isHome ? 'bg-surface-2 text-white' : 'text-gray-500 hover:text-gray-200 hover:bg-surface-2/50'
        }`}
        title="Home"
      >
        <Home size={14} />
        {isHome && <span className="pointer-events-none absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-accent" />}
      </button>
```

- [ ] **Step 2: Tab buttons — add `relative`, `focus-ring`, and an active underline**

Replace the tab `<button>` opening tag + add the underline before its closing `</button>`. Change the opening tag (lines 46-52) to:

```tsx
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group focus-ring relative flex items-center gap-1.5 px-3 h-full text-sm border-r border-surface-3 max-w-[180px] shrink-0 transition-colors ${
              isActive ? 'bg-surface-2 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2/50'
            }`}
          >
```

Then, immediately before that button's closing `</button>` (after the close-`X` span block, line 60), insert:

```tsx
            {isActive && <span className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
```

- [ ] **Step 3: Add `focus-ring` to the toggle, new-tab, and shortcuts buttons**

Add the `focus-ring` class to the `className` of each of these three buttons:
- Sidebar toggle (line 23-29): prepend `focus-ring ` to its className.
- New-tab `+` (line 65-70): prepend `focus-ring ` to its className.
- Shortcuts (line 75-81): prepend `focus-ring ` to its className.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: PASS.
Manual: run `npm run dev`, open the app. The active tab/Home shows a thin accent underline; tabbing with the keyboard shows a clear accent focus ring on each control.

- [ ] **Step 5: Commit**

```bash
git add src/components/TabBar.tsx
git commit -m "feat: tab bar active indicator + focus rings"
```

---

## Task 4: Sidebar polish (active accent bar + micro-labels + focus rings)

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Main nav row — active accent bar + focus ring**

The primary workspace row is at lines 95-103. Its `className` template has an active branch and an inactive branch (`'text-gray-400 hover:text-gray-100 hover:bg-surface-3'`). Update the wrapper class and both branches so the row is `relative`, carries `focus-ring`, and shows a left accent bar when active. Replace the className expression (lines 95-102) with:

```tsx
        className={`group focus-ring relative flex items-center gap-1 py-1 pr-2 pl-2 rounded-md cursor-pointer text-sm transition-colors ${
          isActive
            ? 'bg-surface-3 text-white before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
            : 'text-gray-400 hover:text-gray-100 hover:bg-surface-3'
        }`}
```

> Note: keep whatever the existing active-branch condition variable is named (e.g. `isActive`/`active`) — match the file. Only the class strings change. If the row already sets left padding via another class, leave the numeric value; the key additions are `focus-ring relative` and the `before:*` accent bar on the active branch.

- [ ] **Step 2: Unify section headers to `.micro-label`**

There are four uppercase section headers using ad-hoc classes. Replace the class strings:

1. "Workspace" header (line 388): `text-xs font-semibold text-gray-500 uppercase tracking-wider` → `micro-label`
2. "Favorites" header (line 444): `px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600` → `micro-label px-2 pb-1`
3. "Recent" header (line 453): same as Favorites → `micro-label px-2 pb-1`
4. Collapsible group header (line 489): replace `text-[10px] font-semibold uppercase tracking-wider text-gray-600` with `micro-label` (keep the surrounding `flex w-full items-center justify-between px-2 pb-1 … transition-colors hover:text-gray-400`).

- [ ] **Step 3: Add `focus-ring` to the search input and the new-folder/new-page controls**

- New-folder button (line 390) and the "…" menu button (line 398): prepend `focus-ring ` to className.
- The search/filter `<input>` (line 590): it already has `focus:border-accent`; add `focus-ring ` to its className for the ring.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: PASS.
Manual (`npm run dev`): active workspace item shows a left accent bar; section labels read consistently; keyboard focus shows the accent ring.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: sidebar active accent bar, micro-labels, focus rings"
```

---

## Task 5: Home clock + WidgetShell polish + empty state

**Files:**
- Modify: `src/components/HomeScreen.tsx:289-303` (clock) and the widget grid (≈351-365)
- Modify: `src/components/widgets/WidgetShell.tsx:81-86`

- [ ] **Step 1: Refine the clock hero**

Replace the greeting + clock block (lines 289-303) with:

```tsx
        <div className="mb-5 shrink-0">
          <p className="mb-1 text-xs tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            {greeting(hours)}&nbsp;-&nbsp;
            {DAYS[today.getDay()]}, {MONTHS[todayM]} {todayD}, {todayY}
          </p>
          <div className="flex items-end gap-2">
            <span
              className="text-5xl font-bold leading-none tabular-nums md:text-6xl"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              {displayHour}:{pad(now.getMinutes())}
            </span>
            <div className="mb-1 flex flex-col">
              <span
                className="text-xl font-semibold leading-tight tabular-nums"
                style={{ backgroundImage: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
              >
                {pad(now.getSeconds())}
              </span>
              <span className="text-xs leading-tight" style={{ color: 'var(--text-tertiary)' }}>{ampm}</span>
            </div>
          </div>
        </div>
```

- [ ] **Step 2: WidgetShell — resting-state hover lift + focus-within ring**

In `src/components/widgets/WidgetShell.tsx`, replace the `<section>` className expression (lines 81-85) with:

```tsx
      className={`group/widget relative min-h-0 overflow-hidden rounded-2xl border bg-surface-1 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 ${
        editingHome
          ? 'select-none border-accent/45 ring-1 ring-accent/20'
          : 'border-surface-3 focus-within:border-accent/40 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow-md)]'
      } ${isResizing ? 'z-20 border-accent ring-2 ring-accent/30' : ''} ${
        isDragging ? 'z-20 opacity-75 cursor-grabbing' : editingHome && !isResizing ? 'cursor-grab' : ''
      }`}
```

(The hover lift only applies in the non-editing branch, so drag/resize math is untouched. `transition-colors` became a multi-property transition so the lift animates.)

- [ ] **Step 3: Empty-state for the widget grid**

In `HomeScreen.tsx`, the widgets are rendered by `{widgets.map(widget => (<WidgetShell …/>))}` inside the grid `<div>` (≈line 364). Wrap it so an empty, non-editing home shows guidance. Replace `{widgets.map(widget => (` … `))}` with:

```tsx
          {widgets.length === 0 && !editingHome ? (
            <div className="col-span-full row-span-full flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">Your home is empty</p>
              <p style={{ color: 'var(--text-tertiary)' }} className="text-xs">Add widgets to see your day at a glance.</p>
            </div>
          ) : (
            widgets.map(widget => (
              <WidgetShell
                {/* …keep ALL existing props exactly as they are… */}
              />
            ))
          )}
```

> Important: do not change the `<WidgetShell …>` props — only wrap the existing `.map(...)` in the conditional above. Keep the JSX between `<WidgetShell` and `/>` byte-for-byte.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: PASS.
Manual (`npm run dev`): the clock's seconds render in an accent gradient; hovering a widget lifts it ~2px with a soft shadow; removing all widgets shows the empty-state copy.

- [ ] **Step 5: Commit**

```bash
git add src/components/HomeScreen.tsx src/components/widgets/WidgetShell.tsx
git commit -m "feat: refined home clock, widget hover lift, empty state"
```

---

## Task 6: Mobile bottom-tab logic + component (TDD)

**Files:**
- Create: `src/lib/mobileTabs.ts`
- Create: `src/lib/mobileTabs.test.ts`
- Create: `src/components/BottomTabBar.tsx`
- Modify: `src/index.css` (append `.mobile-bottom-nav`)

- [ ] **Step 1: Write the failing test**

Create `src/lib/mobileTabs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getActiveMobileTab } from './mobileTabs'

describe('getActiveMobileTab', () => {
  it('returns home when on the home screen and no panel is open', () => {
    expect(getActiveMobileTab({ activeTabId: null, panel: 'none' })).toBe('home')
  })

  it('panel takes precedence over the open page/home', () => {
    expect(getActiveMobileTab({ activeTabId: null, panel: 'boards' })).toBe('boards')
    expect(getActiveMobileTab({ activeTabId: 't1', panel: 'search' })).toBe('search')
  })

  it('returns null when a page is open and no panel is active', () => {
    expect(getActiveMobileTab({ activeTabId: 't1', panel: 'none' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/mobileTabs.test.ts`
Expected: FAIL — cannot resolve `./mobileTabs` (module/function not defined).

- [ ] **Step 3: Implement the helper**

Create `src/lib/mobileTabs.ts`:

```ts
export type MobileTab = 'home' | 'boards' | 'search'
export type MobilePanel = 'none' | 'boards' | 'search'

export function getActiveMobileTab(state: {
  activeTabId: string | null
  panel: MobilePanel
}): MobileTab | null {
  if (state.panel === 'boards') return 'boards'
  if (state.panel === 'search') return 'search'
  if (state.activeTabId === null) return 'home'
  return null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/mobileTabs.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Create the `BottomTabBar` component**

Create `src/components/BottomTabBar.tsx`:

```tsx
import { Home, LayoutGrid, Search, Plus } from 'lucide-react'
import type { MobileTab } from '@/lib/mobileTabs'

interface BottomTabBarProps {
  active: MobileTab | null
  onHome: () => void
  onBoards: () => void
  onSearch: () => void
  onNew: () => void
}

export default function BottomTabBar({ active, onHome, onBoards, onSearch, onNew }: BottomTabBarProps) {
  return (
    <nav className="mobile-bottom-nav shrink-0 bg-surface-1 border-t border-surface-3 flex items-stretch justify-around relative z-30">
      <TabButton label="Home" active={active === 'home'} onClick={onHome}>
        <Home size={20} />
      </TabButton>
      <TabButton label="Boards" active={active === 'boards'} onClick={onBoards}>
        <LayoutGrid size={20} />
      </TabButton>
      <TabButton label="Search" active={active === 'search'} onClick={onSearch}>
        <Search size={20} />
      </TabButton>
      <button
        onClick={onNew}
        aria-label="New"
        className="focus-ring flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-1.5 text-gray-500 transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-[var(--shadow-accent)]" style={{ backgroundImage: 'var(--accent-gradient)' }}>
          <Plus size={18} />
        </span>
        <span className="text-[10px] font-medium">New</span>
      </button>
    </nav>
  )
}

function TabButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`focus-ring flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors ${
        active ? 'text-accent' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
```

- [ ] **Step 6: Add the `.mobile-bottom-nav` safe-area rule to `src/index.css`**

Append (near the other `.mobile-shell-*` rules):

```css
.mobile-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

- [ ] **Step 7: Verify build + tests**

Run: `npm run typecheck && npm run build && npx vitest run src/lib/mobileTabs.test.ts`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/mobileTabs.ts src/lib/mobileTabs.test.ts src/components/BottomTabBar.tsx src/index.css
git commit -m "feat: mobile bottom tab bar + active-tab helper"
```

---

## Task 7: Integrate BottomTabBar into MobileShell

**Files:**
- Modify: `src/components/MobileShell.tsx`

Replaces the top "pill" trigger with a persistent bottom bar. The existing workspace/search dropdown panel is reused, now driven by a `panel` state and opened from the bottom bar (Boards = browse, Search = browse + focused input).

- [ ] **Step 1: Imports + state**

Add imports near the top of `MobileShell.tsx` (after line 17):

```tsx
import BottomTabBar from './BottomTabBar'
import { getActiveMobileTab, type MobilePanel } from '@/lib/mobileTabs'
```

Add a ref import to the existing React import (line 2): change `import { useState, useEffect } from 'react'` to `import { useState, useEffect, useRef } from 'react'`.

Inside the component, replace the `tabPickerOpen` state (line 96) with:

```tsx
  const [panel, setPanel] = useState<MobilePanel>('none')
  const searchInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 2: Replace `tabPickerOpen` references with `panel`**

There are several. Apply each:
- Escape handler (line 121): `if (tabPickerOpen) { setTabPickerOpen(false); return }` → `if (panel !== 'none') { setPanel('none'); return }`, and update the effect deps `[paletteOpen, tabPickerOpen, onClosePalette]` → `[paletteOpen, panel, onClosePalette]`.
- `openSharedBoard` (line 114): `setTabPickerOpen(false)` → `setPanel('none')`.
- `openWorkspacePage` (line 139): `setTabPickerOpen(false)` → `setPanel('none')`.
- `handleNewBoard` (line 152): `setTabPickerOpen(false)` → `setPanel('none')`.
- `handleNewPage` (line 160): `setTabPickerOpen(false)` → `setPanel('none')`.
- The dropdown's Home button onClick (line 194): `setTabPickerOpen(false)` → `setPanel('none')`.

- [ ] **Step 3: Autofocus search when the Search panel opens**

Add this effect after the existing effects (≈line 135):

```tsx
  useEffect(() => {
    if (panel === 'search') searchInputRef.current?.focus()
  }, [panel])
```

And give the existing search `<input>` (line 204-209) the ref — change its opening to:

```tsx
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search workspace"
                  className="input min-w-0 flex-1 bg-transparent px-0 text-sm text-gray-200 placeholder-gray-600 outline-none border-0"
                />
```

- [ ] **Step 4: Replace the header pill with a static title**

Replace the header inner block (lines 169-184) with:

```tsx
        <div className="flex items-center h-12 px-3 gap-2">
          <span className="text-xs shrink-0">{activePage?.icon ?? '🏠'}</span>
          <span className="truncate flex-1 text-left font-medium text-white">
            {activePage?.title || (activeTabId === null ? 'Home' : 'Untitled')}
          </span>
          <NotificationsMenu />
          <AvatarMenu />
        </div>
```

- [ ] **Step 5: Open the panel from a backdrop + drive its visibility from `panel`**

Change the dropdown gate (line 188) `{tabPickerOpen && (` → `{panel !== 'none' && (`, and the backdrop onClick (line 190) `onClick={() => setTabPickerOpen(false)}` → `onClick={() => setPanel('none')}`.

- [ ] **Step 6: Mount the BottomTabBar**

Immediately after the content `</div>` (line 333, before `{paletteOpen && …}`), insert:

```tsx
      <BottomTabBar
        active={getActiveMobileTab({ activeTabId, panel })}
        onHome={() => { setHomeActive(); setPanel('none'); setQuery('') }}
        onBoards={() => setPanel(p => (p === 'boards' ? 'none' : 'boards'))}
        onSearch={() => setPanel('search')}
        onNew={handleNewBoard}
      />
```

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run build`
Expected: PASS (no remaining `tabPickerOpen` references — if tsc reports one, convert it to `panel` per Step 2).
Manual (`npm run dev`, narrow the window to a phone width / device toolbar): a bottom bar shows Home · Boards · Search · New; Boards opens the workspace list; Search opens it with the field focused; New opens the board template picker; the active tab is accent-colored; the bar sits below content with no overlap, and respects the home-indicator safe area.

- [ ] **Step 8: Commit**

```bash
git add src/components/MobileShell.tsx
git commit -m "feat: persistent mobile bottom nav, simplified header"
```

---

## Task 8: Final verification sweep

**Files:** none (verification + any small fixes surfaced)

- [ ] **Step 1: Full typecheck + build + tests**

Run: `npm run typecheck && npm run build && npm test`
Expected: all PASS. (`npm test` = `vitest run` — the full existing suite plus `mobileTabs.test.ts` stay green.)

- [ ] **Step 2: Desktop manual checklist** (`npm run dev`)

- Active tab + active sidebar row show the accent indicator/bar.
- Keyboard `Tab` traversal shows a visible accent focus ring on tab bar, sidebar rows, inputs, and (at mobile width) bottom-bar buttons.
- Hovering a Home widget lifts it ~2px with a soft shadow; emptying the home shows the empty state.
- With OS "Reduce Motion" enabled, hover lifts and the seconds/press animations do not animate (instant), but colors still change.

- [ ] **Step 3: Mobile manual checklist** (device toolbar ≤ 560px)

- Bottom bar persists across Home and an open board/page.
- Home widgets render as a single full-width column; the last widget is fully visible above the bar.
- Boards / Search / New all work from the bar; the active tab is highlighted.

- [ ] **Step 4: Commit any fixes (if needed)**

```bash
git add -A
git commit -m "fix: polish + mobile verification fixes"
```

(If no fixes were needed, skip this commit.)

---

## Self-Review

**Spec coverage** (against `2026-06-13-app-polish-mobile-design.md`):
- Token system (vars + Tailwind mapping) → Task 1. ✓
- Depth/radius/motion tokens + reduced-motion → Tasks 1-2. ✓
- Primitives (`.fs-card*`, `.btn*`, `.input`, `.micro-label`, `.focus-ring`) → Task 2. ✓
- TabBar (active indicator, focus) → Task 3. ✓
- Sidebar (active accent bar, micro-labels, focus) → Task 4. ✓
- Home clock + WidgetShell hover + empty/loading state → Task 5 (loading is already covered by the App-level "Loading workspace…" gate; the grid gets an explicit empty state). ✓
- Mobile bottom tab bar (Home·Boards·Search·New), ≥44px, safe-area → Tasks 6-7. ✓
- Mobile home single-column reflow → already provided by `WidgetShell.widgetGridStyle` (`1 / -1`) + HomeScreen `gridTemplateColumns: '1fr'`; verified in Task 8. ✓
- typecheck/build/test pass; no behavior regressions → Task 8. ✓

**Placeholder scan:** No TBD/TODO. The one "keep existing props" instruction (Task 5 Step 3) is an explicit *preserve* directive, not a missing-code placeholder — the surrounding conditional is fully specified.

**Type consistency:** `MobileTab`/`MobilePanel` defined in `mobileTabs.ts` (Task 6) and consumed identically in `BottomTabBar.tsx` (Task 6) and `MobileShell.tsx` (Task 7). `getActiveMobileTab({ activeTabId, panel })` signature matches its call site. `panel` state type (`MobilePanel`) matches the `'none'|'boards'|'search'` literals used in all handlers.

**Deferred-but-noted:** the TabBar/Sidebar active indicators are *static* accent bars (not animated sliding) — a deliberate Calm simplification of the spec's "sliding indicator"; can be upgraded later without rework.
