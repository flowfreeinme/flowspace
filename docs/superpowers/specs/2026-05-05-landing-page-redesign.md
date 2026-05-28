# Landing Page Redesign — FlowSpace

**Date:** 2026-05-05  
**File:** `src/components/LandingPage.tsx`

## Goal

Full overhaul of the FlowSpace launch page. Direction: Bold + Modern SaaS — ambitious and feature-rich like a product that has a lot to show, but clean and conversion-focused like a product people actually trust. Every layer changes: structure, copy, visual design, and the hero mockup.

---

## Page Structure (ordered)

| # | Section | Status |
|---|---------|--------|
| 1 | Nav | Refine — add "How it works" anchor |
| 2 | Hero | New headline + rich desktop/mobile illustrated mockup |
| 3 | Trust strip | New — 3 power stats + "Works everywhere" note |
| 4 | How it works | New — 3-step process section |
| 5 | Feature callouts | Replace feature grid with 4 large alternating panels |
| 6 | Feature grid | Smaller secondary grid (6 cards, remaining features) |
| 7 | Plans | Same structure, refined copy |
| 8 | FAQ | Trimmed to 6 questions |
| 9 | CTA | Stronger final push |
| 10 | Footer | Unchanged |

---

## Section Specs

### 1. Nav

Same layout (logo left, Sign in + Get started right). Add a `How it works` text link between the two buttons — anchors to `#how-it-works`. No other changes.

### 2. Hero

**Headline:**
```
One workspace.
Everything in it.
```
Second line in accent color (`text-accent`), same style as current.

**Subheading:**
```
Stop stitching tools together. FlowSpace brings boards, calendar, 
files, drawing, and AI into a single place that actually works.
```

**CTAs:** Same as current ("Create my workspace →" primary, "Sign in" ghost).

**Quick perks row:** Same 4 items, same style.

**Product preview mockup** — full redesign, described below.

#### Hero Mockup Layout

Replace the current single-panel mockup with a two-panel layout inside the existing browser-chrome wrapper:

- **Left panel (≈65% width):** Desktop board view — richer than current. Show:
  - Tab bar with 4 tabs (🏠 Home, 🚀 Project Plan active, ✅ My Tasks, 📅 Calendar)
  - Sidebar: boards list + shared section + user avatar at bottom
  - Canvas: 3 columns (Backlog / In Progress / Done), each with 2–3 cards. Cards show a title line + short description line + a colored tag. One card has a presence avatar ring (showing collaboration). One card has a small AI sparkle badge.
  - Bottom-right: floating AI panel — small card showing "✦ Ask AI" prompt with a one-line response visible.

- **Right panel (≈35% width, rounded, slightly overlapping left):** Mobile view — shows `MobileShell` layout:
  - Hamburger header with FlowSpace logo
  - Same active board (Project Plan) rendered in mobile card stack
  - Bottom tab bar (Home / Calendar / Boards / Settings)
  - Subtle drop shadow to lift it off the desktop panel

Both panels share the same `bg-surface-1 border border-surface-3 rounded-2xl` styling.  
The overall container gets a gradient glow: `shadow-[0_0_80px_rgba(99,102,241,0.15)]`.

### 3. Trust Strip

Replaces the current "Works for" section. A single full-width row inside a subtle border:

```
∞ boards & cards     |     Live real-time sync     |     Works on desktop & mobile
```

Each stat: large accent value + small gray label. Dividers between. No card background — raw row on `bg-surface-0`.

### 4. How It Works (NEW)

**Anchor:** `id="how-it-works"`

**Heading:** `How FlowSpace works`  
**Subheading:** `From blank canvas to organized workspace in minutes.`

Three numbered steps in a horizontal row (stacks vertically on mobile):

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 01 | 🗂️ | Create a board | Double-click the canvas to drop a card. Right-click to add a section. Build any layout — no templates required. |
| 02 | ⚡ | Invite your team | Share a board by email in one click. Changes appear live for everyone — no refresh, no sync button. |
| 03 | ☁️ | Work from anywhere | Your workspace saves automatically. Open FlowSpace on desktop or mobile and pick up exactly where you left off. |

Step numbers are large (`text-4xl font-bold text-accent/30`) positioned top-left of each card. Cards use `bg-surface-1 border border-surface-3 rounded-2xl`.

### 5. Feature Callouts (4 panels)

Replace the current 10-card grid entirely. Four large alternating panels — left/right image+text layout (image side alternates each row). On mobile, image always stacks above text.

Each panel: `py-16`, full width up to `max-w-5xl`, with a detailed illustrated mini-mockup on one side and copy on the other.

**Panel 1 — Visual boards** (mockup left, text right)
- Title: `See all your work at once`
- Body: `FlowSpace's freeform canvas puts everything in front of you. Drag cards anywhere, group them into sections, draw connections — your layout, your rules. No rigid columns forcing your thinking into boxes.`
- Mockup: board canvas with 3 sections, colored cards, lasso selection ring around a group

**Panel 2 — Real-time collaboration** (text left, mockup right)
- Title: `Your team, in the same room`
- Body: `Share any board and edit it together live. Presence avatars show who's active. Changes appear the moment they happen — no "did you see my update?" messages.`
- Mockup: board with 3 colored presence avatar rings on cards, live cursor indicator, notification badge

**Panel 3 — Built-in calendar** (mockup left, text right)
- Title: `Deadlines that live with your work`
- Body: `Month, week, and day views in one place. Connect Google Calendar or import any ICS file. Your events stay next to your boards — no tab switching.`
- Mockup: month calendar view with colored event blocks and a "Today" highlight

**Panel 4 — AI assistant** (text left, mockup right)
- Title: `An assistant that knows your board`
- Body: `Right-click any board and ask the AI to reorganize it, generate a full plan from scratch, or answer a question about your work. It reads your sections and cards — so its suggestions actually fit.`
- Badge: `Pro` pill (accent colored)
- Mockup: AI panel open on a board with a visible prompt + response card

### 6. Secondary Feature Grid

6-card grid (2 cols mobile, 3 cols desktop). Same card style as current. Features included:

1. Freehand drawing
2. File attachments
3. Invite & access control
4. Lasso selection
5. Live notifications
6. Two-factor authentication (move from pricing list)

**Section heading:** `And everything else you need`  
**Subheading:** `No add-ons. No integrations. Built in.`

### 7. Plans

Same two-card layout (Essentials + Pro). Changes:

- **Essentials:** Remove "Two-factor authentication" from feature list (move to grid above). Add "Mobile-ready — works on any device" as a feature item.
- **Pro:** Keep "COMING SOON" badge. Button copy stays "Launching soon". No price shown.
- **Section heading:** `Two plans. Start for free.`
- **Subheading:** Remove current "Start with everything you need. Unlock AI when you're ready." — replace with: `Everything you need is in Essentials. Pro adds AI when you're ready for it.`

### 8. FAQ (trimmed to 6)

Keep these 6, in this order:

1. What is FlowSpace?
2. Can FlowSpace replace my current task and project tools?
3. How does the AI assistant work?
4. How does board sharing work?
5. Does it work on mobile?
6. Is my data secure?

Remove the remaining 6 (productivity benefit, visual working, real-time team productivity, Google Calendar, file types, AI details — these are covered by the callout sections).

### 9. CTA

Same two-column layout. Update left-side heading:
```
Ready to replace five tools with one?
```
Remove the CORE_FEATURES repeat list from left column. Replace with 3 short punchy lines:
```
✦ Boards, calendar, files, and AI — all in one place.
✦ Real-time collaboration from day one.
✦ Works on desktop and mobile.
```

Right side unchanged (logo, "One workspace. Everything in it.", primary + ghost CTA).

### 10. Footer

Unchanged.

---

## Visual Design Notes

- **No new colors** — use existing `accent`, `surface-0/1/2/3/4` tokens throughout
- **Gradient glow on hero mockup** only — don't add glows elsewhere
- **Feature callout panels** use the same card tokens, no new styles needed
- **Mobile panel in hero** uses a slightly smaller font scale (`text-[8px]` for labels) to fit proportionally
- **How it works step numbers** at `text-5xl font-black text-accent/20` — decorative, not dominant
- All illustrated mockups are HTML/CSS (no images), same approach as current mockup

---

## Copy Changes Summary

| Location | Old | New |
|----------|-----|-----|
| Hero headline | "Think visually. Work together." | "One workspace. Everything in it." |
| Hero subheading | "A workspace that keeps up with how you actually think…" | "Stop stitching tools together…" |
| Plans heading | "Two plans, built to grow with you" | "Two plans. Start for free." |
| CTA left heading | "Your workspace is one click away." | "Ready to replace five tools with one?" |
| Features heading | "Built around how you actually work" | (removed — replaced by callout panels) |

---

## Out of Scope

- No new routes or pages
- No pricing numbers for Pro
- No testimonials (no user base yet)
- No video or GIF embeds
- No changes to `AuthPage.tsx`, `HomeScreen.tsx`, or any app components
