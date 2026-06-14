# Flowspace — App Polish & Mobile (Refined Dark · Calm)

**Date:** 2026-06-13
**Status:** Draft for review
**Topic:** Make the logged-in app feel polished & premium, and make it solid on mobile.

---

## Goal

Two felt outcomes, one coherent effort:

1. **Polished & premium** — the app currently reads flat and a bit generic. It should feel crafted: real depth, gentle motion, micro-interactions, refined type and spacing.
2. **Solid on mobile** — phones are second-class today (a parallel `MobileShell` with a hidden top-"pill" dropdown for navigation and almost no responsive CSS). The phone experience should feel like a real native app.

This is **slice 1**. It deliberately scopes to the surfaces users see most. Boards canvas, calendar, database, the full modal sweep, light mode, performance, and SEO are explicitly deferred to a later pass.

## Locked design decisions (from brainstorming)

| Decision | Choice | Notes |
|---|---|---|
| Visual direction | **Refined Dark** | Evolve the existing dark theme; do **not** replace it. No light mode this slice. |
| Polish intensity | **Calm** | Restrained depth, soft low shadows, accent used sparingly, gentle hover lifts, light motion. Think Linear / Things — ages well for all-day use. |
| Mobile navigation | **Bottom tab bar** | Persistent, thumb-reachable: **Home · Boards · Search · New**. (Tab set adjustable.) |
| First-slice scope | **Shell + Home + Mobile** | Token/motion foundation → polish TabBar, Sidebar, Home & widgets → ship bottom tab bar + mobile home reflow. |

Optional, off by default: a single "signature" glow on the home clock (a Rich touch). Not enabled unless requested.

## Current state (what we're building on)

- **Tokens:** Tailwind theme defines `surface.0–4` (`#0f0f0f`–`#383838`) and a single `accent` (`#7c6af7` / hover `#9080ff`). `index.css` (1,068 lines) has only **2 CSS variables** (viewport height) and **~5** transition/animation lines total. There is no real token or motion system.
- **Motion:** Hover states are almost all `transition-colors` — nothing lifts, scales, or springs. Adding genuine micro-interactions is most of the "premium" win.
- **Shell:** `DesktopShell` = `TabBar` (top) + collapsible `Sidebar` (`w-56`, 200ms width animation) + content (`BoardView` / `PageView` / `DatabasePage` / `HomeScreen`).
- **Home:** A big live clock (`text-5xl/6xl`, accent seconds) over a **draggable/resizable widget dashboard** (`WidgetShell` per widget; widgets: today, focus, recent, proPlanner, focusTimer, weather, calendar, todoList, aiBriefing) with an edit-mode "Home menu" widget catalog.
- **Mobile:** A separate `MobileShell` — top header (h-12) with a **tab-picker pill** → dropdown (page list + search) + `NotificationsMenu` + `AvatarMenu`. No bottom nav. The only responsive CSS in the codebase targets Rx-Mastery (`.rx-*`); the main app does **no** responsive layout — it swaps to `MobileShell` via `useIsMobile`. Good news: `index.html` already sets `viewport-fit=cover` and there's a `--flowspace-viewport-height` using `dvh`.

## Design language — the token & motion system

Establish a real, variable-driven system. Define CSS custom properties in `:root` (in `index.css`) and point the Tailwind theme at them so Tailwind classes and raw CSS share one source of truth.

### Color & surface (Calm Refined Dark)

```
--surface-0: #0e0e10;   /* app background        */
--surface-1: #161618;   /* raised panel / header */
--surface-2: #1d1d20;   /* card / widget         */
--surface-3: #26262a;   /* hover / active card   */
--surface-4: #33333a;   /* control               */

--border-subtle: #232328;            /* 1px hairlines        */
--border-strong: #2e2e35;
--border-accent: rgba(124,106,247,.35);

--text-primary:   #f1f1f4;
--text-secondary: #a0a0a9;
--text-tertiary:  #6f6f79;
--text-muted:     #565660;

--accent:          #7c6af7;
--accent-hover:    #9080ff;
--accent-soft:     rgba(124,106,247,.14);   /* tint backgrounds */
--accent-gradient: linear-gradient(135deg,#7c6af7,#9b8cff);
```

Values are nudged a touch from today's for cleaner elevation separation, but stay close enough that the change reads as "refined," not "rebranded." Accent gradient is reserved for: primary buttons, active nav/tab state, the focus ring, and the clock seconds.

### Depth (elevation)

```
--shadow-sm:     0 2px 8px  rgba(0,0,0,.25);   /* resting card           */
--shadow-md:     0 8px 22px rgba(0,0,0,.35);   /* hover / raised          */
--shadow-lg:     0 24px 60px rgba(0,0,0,.50);  /* modals / popovers       */
--shadow-accent: 0 8px 22px rgba(124,106,247,.20); /* primary, sparingly  */
```

### Radius

```
--radius-sm: 8px;    /* buttons, inputs        */
--radius-md: 12px;   /* cards, widgets         */
--radius-lg: 16px;   /* panels, modals         */
--radius-pill: 9999px;
```

### Motion

```
--dur-fast: 120ms;  --dur-base: 180ms;  --dur-slow: 240ms;
--ease-out:    cubic-bezier(.2,.7,.2,1);
--ease-spring: cubic-bezier(.34,1.56,.64,1);  /* subtle overshoot, used lightly */
```

Conventions (Calm):
- **Interactive card hover:** `translateY(-2px)`, border → `--border-accent`, shadow → `--shadow-md`, over `--dur-base --ease-out`.
- **Button press:** `scale(.98)` over `--dur-fast`.
- **Focus-visible (a11y):** `outline:none; box-shadow: 0 0 0 2px var(--surface-0), 0 0 0 4px rgba(124,106,247,.55);` on all interactive elements.
- **Enter animations:** dropdowns/popovers/modals fade+rise (`8px`, `--dur-base`); toasts slide in; active tab indicator slides.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables transforms/keyframe motion, keeps color/opacity fades.

### Reusable primitives

Encode the conventions once, via `@layer components` classes in `index.css`, so surfaces stop re-specifying shadow/border/hover ad hoc:

- `.fs-card` (resting surface-2 + subtle border + `--shadow-sm` + `--radius-md`)
- `.fs-card-interactive` (adds the hover lift + focus ring)
- `.btn`, `.btn-primary` (accent gradient + press), `.btn-ghost`
- `.input` (surface-1 + subtle border + focus ring)
- `.micro-label` (uppercase, `.6px` tracking, `--text-secondary`, 600)
- `.focus-ring` (the a11y ring, composable)

These are CSS classes (matching the codebase's current inline-Tailwind idiom) — **not** a new component-library refactor.

## Per-surface changes (scope)

### Shell · TabBar
Refined tab "chips": resting `surface-1`, active = `surface-2` + subtle top/under accent indicator that slides between tabs; hover lift on inactive; clearer new-tab (`+`) affordance; tighter spacing & dividers.

### Shell · Sidebar
Item hover = `surface-3` tint + 2px inset accent bar on active; section headers become `.micro-label`s; consistent 44px row rhythm; keep the existing 200ms collapse. Apply focus ring for keyboard traversal.

### Home · Clock hero
Refined type scale and spacing; accent (gradient) seconds; date/greeting line as `--text-tertiary`. (Optional glow off by default.)

### Home · Widgets (`WidgetShell` + catalog)
Every widget shell adopts `.fs-card-interactive`: resting depth, hover lift, consistent `.micro-label` header, `--radius-md`, refined drag affordance and resize handles. Widget-catalog cards (edit mode) get the same language. Add **empty** and **loading (skeleton)** states for the dashboard.

### Mobile · Bottom tab bar (new `BottomTabBar.tsx`)
Persistent bar with **Home · Boards · Search · New**. Active = accent icon+label; `New` is an accent-filled action. Min 44×44 targets; `padding-bottom: env(safe-area-inset-bottom)`. Rendered by `MobileShell`; introduces a mobile view state `'home' | 'boards' | 'search'`. **Boards** and **Search** reuse the content currently inside the top-pill dropdown (page list + search), lifted into their own views. The top bar simplifies to title + `NotificationsMenu` + `AvatarMenu`. `New` triggers the existing create-board/template flow.

### Mobile · Home reflow
On mobile, render the dashboard as a **single-column, non-draggable stack** of `WidgetShell`s (fixed order; no resize/drag) — readable and scrollable rather than a cramped canvas. Content gets `padding-bottom` to clear the tab bar.

### Mobile · Touch & safe areas
≥44px touch targets across shell + home; honor `env(safe-area-inset-*)`; verified against the existing `dvh` viewport handling.

## Architecture / where things live

- **Tokens:** CSS variables in `src/index.css` `:root`; `tailwind.config.js` theme `extend` maps `colors`, `boxShadow`, `borderRadius`, `transitionDuration`, `transitionTimingFunction` to those vars.
- **Primitives:** `@layer components` block in `src/index.css`.
- **Mobile nav:** new `src/components/BottomTabBar.tsx`; `MobileShell` gains a `mobileView` state and renders Home/Boards/Search views (Boards & Search refactored out of the current dropdown). Pure-logic helpers (view routing) live alongside `src/lib/mobileWorkspaceNavigation.ts`.
- **Home mobile reflow:** a stacked render path in `HomeScreen` (or a thin `HomeScreenMobile` wrapper) gated by `useIsMobile`, reusing the same widget render functions.
- **No** light-mode theming, **no** router change, **no** new dependencies.

## Out of scope (candidates for slice 2)

BoardView canvas & blocks (timeline/flowchart/board-widget) polish · PageView/BlockEditor · calendar (Day/Week) · database · full modal/overlay sweep (Share, Settings, Properties, etc.) · LandingPage/AuthPage · light mode · performance / code-splitting · SEO/meta.

## Success criteria

- A variable-driven token system exists; surfaces, accent, shadows, radii, and motion all read from `:root` vars (no ad-hoc hex/shadows in shell+home).
- Every interactive element in **TabBar, Sidebar, Home, and the mobile bottom bar** has: a hover state, a visible **focus-visible** ring, and `prefers-reduced-motion` support.
- Desktop Home shows Calm depth + micro-interactions; widgets lift on hover; empty & loading states exist.
- Mobile: a persistent **bottom tab bar** with 4 working destinations, ≥44px targets, safe-area inset; Home reflows to a single-column stack; primary nav reachable by thumb; content never hidden behind the bar.
- `npm run typecheck`, `npm run build`, and `npm test` all pass; no regressions to existing behavior (tab/board/widget logic unchanged).

## Testing approach

- **Unit (vitest):** mobile view-routing helpers; any new pure logic.
- **Manual / visual:** desktop shell + home (hover, focus, reduced-motion via OS setting); mobile at ≤560px (bottom bar, home stack, safe areas) in browser device mode.
- **A11y spot-check:** keyboard-only traversal of shell + home + bottom bar; AA contrast on `--text-secondary/-tertiary` against surfaces.

## Risks & notes

- **Don't over-animate** — Calm means subtle. Cap hover lift at ~2px and keep durations ≤240ms.
- **Contrast:** verify muted text tiers meet WCAG AA on `--surface-0/1/2`.
- **Mobile home reflow** is the one non-trivial refactor (canvas → stack); keep it a separate, well-isolated render path so the desktop dashboard is untouched.
- **Tab set** (Home/Boards/Search/New) is the assumed default; trivially adjustable before build.
