# Mobile Polish Design

**Date:** 2026-05-05  
**Status:** Approved

## Goal

Make Flowspace fully usable on mobile browsers without breaking the desktop experience. New features added to content components should automatically work on both platforms with no extra work.

## Decisions

| Area | Choice | Rationale |
|------|--------|-----------|
| Navigation | Hamburger drawer | Familiar, preserves full content area |
| Tab switching | Pill dropdown in header | Compact, no wasted vertical space |
| Board layout | Stacked collapsible columns | All cards visible, no horizontal scroll confusion |
| Zoom controls | Always-visible ± buttons in board toolbar | Cross-platform, works on both desktop and mobile |
| Implementation | `useIsMobile` hook + shell split | Minimal divergence, shared content components |

## Architecture

```
App
├── useIsMobile()  ← single source of truth
├── isMobile → <MobileShell>
└── !isMobile → <DesktopShell>  (current layout, unchanged)
      └── both render the same:
            PageView / BoardView / HomeScreen / CommandPalette / ToastStack
```

Only the **shell layer** diverges between platforms. All content components are shared and untouched except for minor responsive Tailwind tweaks.

## Components

### `src/hooks/useIsMobile.ts` (new)
- Wraps `window.matchMedia('(max-width: 768px)')`
- Listens to `change` events, returns live boolean
- Used by `App.tsx` only — no other component needs it

### `src/components/MobileShell.tsx` (new)
Renders the mobile layout:

**Header bar (fixed, 48px tall):**
- Left: ☰ hamburger button → opens/closes drawer
- Center: current page title pill — if a tab is active, shows `{icon} {title} ▾`; tapping opens a dropdown listing all open tabs plus a "New page" option; if on home, shows "Home"
- Right: `<NotificationsMenu>` + `<AvatarMenu>` (reused as-is)

**Drawer (overlay):**
- Slides in from left over the content (does not push)
- Renders `<Sidebar>` unchanged inside
- Backdrop (semi-transparent) closes drawer on tap
- Z-index above content, below modals

**Content area:**
- Full screen below the header
- Renders `<PageView>`, `<BoardView>`, or `<HomeScreen>` depending on active tab — same logic as desktop

### `src/components/DesktopShell.tsx` (new, extracted)
Extracts the current desktop layout out of `App.tsx` into its own component. No behavior changes — just a clean extraction so `App.tsx` delegates to one of the two shells.

### `App.tsx` (modified)
- Imports `useIsMobile`
- Renders `<MobileShell>` or `<DesktopShell>` based on the hook
- All other logic (auth, workspace init, keyboard shortcuts, realtime channels) stays in `App.tsx` — keyboard shortcuts are no-ops on mobile but harmless

### `src/components/BoardView.tsx` (modified)
- Accepts or reads `isMobile` to switch column layout
- Desktop: existing horizontal flex layout (unchanged)
- Mobile: columns stack vertically as collapsible sections (chevron toggle, all columns expanded by default)
- **Zoom controls:** Add ± buttons to the board toolbar. These are always rendered on both platforms. They adjust a `zoom` state (0.75 / 1 / 1.25 / 1.5) applied as `transform: scale(zoom)` on the board content wrapper.

### Minor responsive tweaks (existing components)
- `PageView`: add `px-4 md:px-12` for comfortable mobile padding
- `BlockEditor`: touch targets for block handles — minimum 44px height on mobile via `min-h-[44px] md:min-h-0`
- `HomeScreen`: stack cards vertically on small screens if currently in a grid

## What Stays the Same

- All Supabase sync / cloud storage logic — untouched
- `BlockEditor` core editing behavior
- `CommandPalette` — still triggered by Cmd+K; on mobile it can be triggered from the header or left dormant (no change needed now)
- `ContextMenu` (right-click) — still works on desktop; on mobile right-click doesn't exist but that's an existing gap, not in scope here
- All modals (`ShareModal`, `PropertiesModal`, etc.) — they're already fixed-position overlays, work fine on mobile

## Out of Scope

- Long-press context menu on mobile (separate task)
- Drag-and-drop card reordering on mobile touch
- Offline / PWA support
- Command palette mobile trigger

## Implementation Order

1. `useIsMobile` hook
2. Extract `DesktopShell` from `App.tsx`
3. Build `MobileShell`
4. Wire up in `App.tsx`
5. `BoardView` stacked columns + zoom controls
6. Minor responsive tweaks (padding, touch targets)
