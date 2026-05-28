# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul `LandingPage.tsx` with new headline, rich desktop+mobile hero mockup, How It Works section, 4 feature callout panels, trimmed FAQ, and updated CTA copy.

**Architecture:** All changes are in a single file — `src/components/LandingPage.tsx`. No new routes, no new files, no changes to any other component. New local helper components (`FeatureCallout`) are defined inside the same file. This is a purely visual/copy change; no state, no data fetching.

**Tech Stack:** React 18, TypeScript, TailwindCSS (custom tokens: `accent`, `accent-hover`, `surface-0` through `surface-4`), lucide-react, Vite dev server (`bun dev` → http://localhost:5173)

> **Note on testing:** This is a pure UI component. There are no unit tests. Each task's verification step is to open the browser, scroll to the section, and confirm it renders correctly. TypeScript (`bun run build`) is used to verify no type errors.

---

## Files

- **Modify:** `src/components/LandingPage.tsx` — all changes land here

---

### Task 1: Update all data constants

Replace the top-level data arrays with updated content. No visual changes yet — just the data.

**Files:**
- Modify: `src/components/LandingPage.tsx` (top of file, constants only)

- [ ] **Step 1: Open the dev server**

```bash
cd /Users/michael/flowspace && bun dev
```

Open http://localhost:5173 and confirm the current landing page loads.

- [ ] **Step 2: Replace constants block**

Find the section from line 8 (`const FEATURES`) to line 136 (end of FAQ array) and replace with:

```tsx
const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '🗂️',
    title: 'Create a board',
    desc: 'Double-click the canvas to drop a card. Right-click to add a section. Build any layout — no templates required.',
  },
  {
    step: '02',
    icon: '⚡',
    title: 'Invite your team',
    desc: 'Share a board by email in one click. Changes appear live for everyone — no refresh, no sync button.',
  },
  {
    step: '03',
    icon: '☁️',
    title: 'Work from anywhere',
    desc: 'Your workspace saves automatically. Open FlowSpace on desktop or mobile and pick up exactly where you left off.',
  },
]

const SECONDARY_FEATURES = [
  {
    icon: '🎨',
    title: 'Freehand drawing',
    desc: 'Sketch anything directly on a board using the Draw tool. Saved as an image block — keep it, move it, or delete it.',
  },
  {
    icon: '📎',
    title: 'File attachments',
    desc: 'Drop images and files onto any board. Images render inline with a crop tool. Any other file type uploads as a downloadable attachment.',
  },
  {
    icon: '🔗',
    title: 'Invite & access control',
    desc: 'Share boards by email with a single click. Remove access at any time — changes take effect immediately.',
  },
  {
    icon: '🪄',
    title: 'Lasso selection',
    desc: 'Draw a freehand loop around any group of cards to select, move, or resize them together.',
  },
  {
    icon: '🔔',
    title: 'Live notifications',
    desc: 'Invites, access changes, and board activity appear in your bell the moment they happen.',
  },
  {
    icon: '🔒',
    title: 'Two-factor authentication',
    desc: 'Add an extra layer of security to your account. Enable 2FA from account settings in seconds.',
  },
]

const CORE_FEATURES = [
  'Unlimited boards, cards & sections',
  'Real-time collaboration & presence',
  'Built-in calendar (Google + ICS)',
  'Freehand drawing & file attachments',
  'Invite & access control',
  'Live notifications',
  'Cloud sync across devices',
  'Mobile-ready — works on any device',
]

const PRO_FEATURES = [
  'Everything in Essentials',
  'Unlimited AI discussions per day',
  'Priority support',
  'More AI features as they ship',
]

const FAQ = [
  {
    q: 'What is FlowSpace?',
    a: 'FlowSpace is a visual workspace built around boards, cards, and real-time collaboration. It combines a freeform canvas, a built-in calendar, drawing tools, file attachments, and an AI assistant — all in one place.',
  },
  {
    q: 'Can FlowSpace replace my current task and project tools?',
    a: 'For most workflows, yes. Boards handle project tracking and daily tasks. The built-in calendar covers scheduling and deadlines. File attachments mean you never need to context-switch to find a document. And real-time collaboration replaces the need for separate team tools.',
  },
  {
    q: 'How does the AI assistant work?',
    a: 'Right-click any board and choose "Ask AI." You can ask it questions about your work, or tell it to reorganize and reformat your board — it will create sections and cards automatically. The AI is powered by Claude and understands your board\'s context.',
  },
  {
    q: 'How does board sharing work?',
    a: 'Right-click any board in your sidebar and choose Share. Enter the email address of the person you want to collaborate with. They\'ll get an instant notification to accept or decline. Once accepted, the board appears in their sidebar and both of you can edit it live.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'Yes. FlowSpace is fully responsive and works in any modern mobile browser. The mobile layout has a dedicated navigation drawer and tab bar optimized for touch.',
  },
  {
    q: 'Is my data secure?',
    a: 'Every workspace is private to your account, protected by row-level security — no one else can read your data. Passwords are never stored in plain text, and you can enable two-factor authentication in your account settings.',
  },
]
```

- [ ] **Step 3: Verify build has no type errors**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing bundle size warnings).

- [ ] **Step 4: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/LandingPage.tsx && git commit -m "refactor: update landing page data constants for redesign"
```

---

### Task 2: Nav + Hero headline

Update the nav to add a "How it works" anchor, and replace the hero headline, subheading, and badge copy.

**Files:**
- Modify: `src/components/LandingPage.tsx` (nav section ~line 162, hero section ~line 181)

- [ ] **Step 1: Update the Nav**

Find the `{/* Nav */}` block and replace it:

```tsx
{/* Nav */}
<nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
  <span className="text-xl font-bold text-white tracking-tight">✦ FlowSpace</span>
  <div className="flex items-center gap-4">
    <a
      href="#how-it-works"
      className="text-sm text-gray-500 hover:text-white transition-colors hidden sm:block"
    >
      How it works
    </a>
    <button
      onClick={onGetStarted}
      className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
    >
      Sign in
    </button>
    <button
      onClick={onGetStarted}
      className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
    >
      Get started
    </button>
  </div>
</nav>
```

- [ ] **Step 2: Update the Hero section copy**

Find the `{/* Hero */}` section and replace the badge, h1, and p:

```tsx
{/* Hero */}
<section className="text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
  <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs font-medium px-3 py-1.5 rounded-full mb-10">
    ✦ Boards · Calendar · AI · Real-time collaboration
  </div>
  <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.08] mb-6 tracking-tight">
    One workspace.<br />
    <span className="text-accent">Everything in it.</span>
  </h1>
  <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
    Stop stitching tools together. FlowSpace brings boards, calendar,
    files, drawing, and AI into a single place that actually works.
  </p>
  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
    <button
      onClick={onGetStarted}
      className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white px-10 py-3.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
    >
      Create my workspace →
    </button>
    <button
      onClick={onGetStarted}
      className="w-full sm:w-auto border border-surface-4 hover:border-surface-3 text-gray-300 hover:text-white px-10 py-3.5 rounded-xl text-sm font-medium transition-colors"
    >
      Sign in
    </button>
  </div>
  {/* Quick perks */}
  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
    {['Unlimited boards & cards', 'Real-time collaboration', 'Built-in calendar', 'Works on any device'].map(p => (
      <span key={p} className="flex items-center gap-1.5 text-xs text-gray-500">
        <Check size={11} className="text-accent shrink-0" />
        {p}
      </span>
    ))}
  </div>
</section>
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:5173. Confirm:
- Nav shows "How it works" link between logo and sign-in
- Hero headline reads "One workspace." / "Everything in it." (second line in accent purple)
- Subheading reads "Stop stitching tools together…"

- [ ] **Step 4: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/LandingPage.tsx && git commit -m "feat: update nav and hero headline for landing page redesign"
```

---

### Task 3: Hero mockup — desktop panel

Replace the entire `{/* App preview */}` section with a richer desktop board view.

**Files:**
- Modify: `src/components/LandingPage.tsx` (app preview section, ~line 219)

- [ ] **Step 1: Replace the App preview section**

Find the `{/* App preview */}` section and replace it entirely:

```tsx
{/* App preview */}
<section className="px-6 pb-20 max-w-5xl mx-auto">
  <div className="relative">
    {/* Glow */}
    <div className="absolute inset-x-0 -top-10 h-40 bg-accent/10 blur-3xl -z-10 rounded-full" />
    {/* Two-panel wrapper */}
    <div className="flex items-center gap-3">
      {/* Desktop panel */}
      <div className="flex-1 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 min-w-0">
        {/* Tab bar */}
        <div className="flex items-center h-10 bg-surface-1 border-b border-surface-3 px-3 gap-2">
          <div className="flex gap-1.5 mr-2 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          {['🏠', '🚀 Project Plan', '✅ My Tasks', '📅 Calendar'].map((t, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs shrink-0 ${
                i === 1 ? 'bg-surface-2 text-white border border-surface-3' : 'text-gray-600'
              }`}
            >
              {t}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5 pr-1 shrink-0">
            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-surface-1">M</div>
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-surface-1">A</div>
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-surface-1">J</div>
          </div>
        </div>
        {/* Body */}
        <div className="flex h-72">
          {/* Sidebar */}
          <div className="w-44 bg-surface-1 border-r border-surface-3 p-3 shrink-0 relative">
            <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-2">Boards</div>
            {[
              { label: '🚀 Project Plan', active: true },
              { label: '✅ My Tasks', active: false },
              { label: '📓 My Notes', active: false },
              { label: '💡 Ideas', active: false },
            ].map((p, i) => (
              <div key={i} className={`text-xs px-2 py-1.5 rounded-lg truncate mb-0.5 ${p.active ? 'bg-accent/20 text-accent' : 'text-gray-600'}`}>
                {p.label}
              </div>
            ))}
            <div className="border-t border-surface-3/50 my-2 mx-1" />
            <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-1.5">Shared</div>
            <div className="text-xs px-2 py-1.5 rounded-lg truncate text-gray-600">🎯 Design Sprint</div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-[9px] font-bold">M</div>
              <div className="text-[9px] text-gray-600">michael</div>
            </div>
          </div>
          {/* Canvas */}
          <div className="flex-1 p-4 relative overflow-hidden bg-surface-0/40">
            {/* Backlog column */}
            <div className="absolute top-4 left-4">
              <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Backlog</div>
              <div className="space-y-2">
                <div className="w-28 bg-surface-2 border border-surface-3 rounded-xl p-2.5">
                  <div className="h-1.5 w-20 bg-surface-4 rounded mb-1" />
                  <div className="h-1.5 w-14 bg-surface-4 rounded opacity-60 mb-1.5" />
                  <span className="text-[7px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">design</span>
                </div>
                <div className="w-28 bg-surface-2 border border-surface-3 rounded-xl p-2.5 opacity-60">
                  <div className="h-1.5 w-16 bg-surface-4 rounded mb-1" />
                  <div className="h-1.5 w-12 bg-surface-4 rounded opacity-60" />
                </div>
              </div>
            </div>
            {/* In Progress column */}
            <div className="absolute top-4 left-[136px]">
              <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">In Progress</div>
              <div className="space-y-2">
                <div className="w-32 bg-surface-2 border border-accent/40 rounded-xl p-2.5 relative">
                  <div className="h-1.5 w-24 bg-surface-4 rounded mb-1" />
                  <div className="h-1.5 w-16 bg-surface-4 rounded opacity-60 mb-1.5" />
                  <span className="text-[7px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">active</span>
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 ring-1 ring-surface-2 flex items-center justify-center text-white text-[7px] font-bold">A</div>
                </div>
                <div className="w-32 bg-surface-2 border border-surface-3 rounded-xl p-2.5 relative">
                  <div className="h-1.5 w-20 bg-surface-4 rounded mb-1" />
                  <div className="h-1.5 w-12 bg-surface-4 rounded opacity-60" />
                  <div className="absolute -top-1.5 -right-1.5 bg-surface-1 border border-accent/40 rounded-full w-4 h-4 flex items-center justify-center text-accent text-[8px]">✦</div>
                </div>
              </div>
            </div>
            {/* Done column */}
            <div className="absolute top-4 right-3">
              <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Done</div>
              <div className="space-y-2">
                {[{ w: 112, lines: [80, 56] }, { w: 112, lines: [64, 40] }].map((c, i) => (
                  <div key={i} className="bg-surface-2 border border-surface-3 rounded-xl p-2.5 opacity-35" style={{ width: c.w }}>
                    <div className="h-1.5 bg-surface-4 rounded mb-1" style={{ width: c.lines[0] }} />
                    <div className="h-1.5 bg-surface-4 rounded opacity-60" style={{ width: c.lines[1] }} />
                  </div>
                ))}
              </div>
            </div>
            {/* AI panel */}
            <div className="absolute bottom-3 right-3 bg-surface-2 border border-accent/30 rounded-xl px-3 py-2 shadow-xl flex items-start gap-2 w-48">
              <div className="text-accent text-[10px] mt-0.5 shrink-0">✦</div>
              <div className="min-w-0">
                <div className="h-1.5 w-28 bg-surface-4 rounded mb-1.5" />
                <div className="h-1.5 w-36 bg-accent/25 rounded mb-1" />
                <div className="h-1.5 w-24 bg-accent/25 rounded opacity-70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:5173 and scroll to the app preview. Confirm:
- 3-column board (Backlog / In Progress / Done)
- Green presence avatar on the active "In Progress" card
- AI sparkle badge on second In-Progress card
- Floating AI panel bottom-right with accent-colored lines
- User avatar at sidebar bottom

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/LandingPage.tsx && git commit -m "feat: richer desktop board mockup in hero"
```

---

### Task 4: Hero mockup — add mobile panel

Add the mobile panel alongside the desktop panel inside the same two-panel wrapper.

**Files:**
- Modify: `src/components/LandingPage.tsx` (inside the `{/* Two-panel wrapper */}` div from Task 3)

- [ ] **Step 1: Add mobile panel after the closing tag of the desktop panel div**

Find the closing `</div>` of the desktop panel (the one that closes `{/* Desktop panel */}`) and add this after it, before the closing `</div>` of the two-panel wrapper:

```tsx
{/* Mobile panel */}
<div className="hidden sm:flex w-36 shrink-0 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 flex-col -ml-3 self-center z-10" style={{ height: 260 }}>
  {/* Header */}
  <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-3 shrink-0">
    <span className="text-sm text-gray-400 font-medium leading-none">≡</span>
    <span className="text-[8px] font-bold text-white tracking-tight">✦ FlowSpace</span>
    <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-white text-[7px] font-bold">M</div>
  </div>
  {/* Content */}
  <div className="flex-1 p-2 overflow-hidden">
    <div className="text-[7px] font-semibold text-gray-600 uppercase tracking-widest mb-2">🚀 Project Plan</div>
    <div className="space-y-1.5">
      <div className="bg-surface-2 border border-accent/40 rounded-lg p-2">
        <div className="h-1.5 w-20 bg-accent/40 rounded mb-1" />
        <div className="h-1.5 w-14 bg-surface-4 rounded opacity-60" />
      </div>
      <div className="bg-surface-2 border border-surface-3 rounded-lg p-2">
        <div className="h-1.5 w-16 bg-surface-4 rounded mb-1" />
        <div className="h-1.5 w-10 bg-surface-4 rounded opacity-60" />
      </div>
      <div className="bg-surface-2 border border-surface-3 rounded-lg p-2 opacity-50">
        <div className="h-1.5 w-12 bg-surface-4 rounded mb-1" />
        <div className="h-1.5 w-8 bg-surface-4 rounded opacity-60" />
      </div>
    </div>
  </div>
  {/* Tab bar */}
  <div className="border-t border-surface-3 flex items-center justify-around py-2.5 px-2 shrink-0">
    {['🏠', '📅', '🗂️', '⚙️'].map((icon, i) => (
      <span key={i} className={`text-[12px] ${i === 2 ? '' : 'opacity-25'}`}>{icon}</span>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Verify in browser**

Resize the browser to at least 640px wide (sm breakpoint). Confirm:
- Mobile panel appears to the right of the desktop panel, slightly overlapping it
- Mobile panel shows header with hamburger + logo + avatar
- 3 stacked card rows visible
- Bottom tab bar with 4 icons, Boards (🗂️) highlighted

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/LandingPage.tsx && git commit -m "feat: add mobile panel alongside desktop in hero mockup"
```

---

### Task 5: Trust strip + How It Works

Add two new sections between the hero mockup and the feature content.

**Files:**
- Modify: `src/components/LandingPage.tsx` (after the app preview section, before the features/use-cases content)

- [ ] **Step 1: Replace the Use cases section with Trust strip + How It Works**

Find the `{/* Use cases */}` section (currently ~line 297) and replace it entirely with:

```tsx
{/* Trust strip */}
<section className="px-6 pb-16 max-w-5xl mx-auto">
  <div className="flex flex-col sm:flex-row items-stretch border border-surface-3 rounded-2xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-surface-3">
    {[
      { val: '∞', label: 'Boards & cards' },
      { val: 'Live', label: 'Real-time sync' },
      { val: 'Desktop + Mobile', label: 'Works everywhere' },
    ].map(s => (
      <div key={s.label} className="flex-1 text-center py-7 px-8 bg-surface-1/50">
        <p className="text-2xl font-bold text-accent mb-1">{s.val}</p>
        <p className="text-xs text-gray-500">{s.label}</p>
      </div>
    ))}
  </div>
</section>

{/* How it works */}
<section id="how-it-works" className="px-6 pb-28 max-w-5xl mx-auto">
  <h2 className="text-3xl font-bold text-center text-white mb-3 tracking-tight">
    How FlowSpace works
  </h2>
  <p className="text-gray-500 text-center mb-14 text-base">
    From blank canvas to organized workspace in minutes.
  </p>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
    {HOW_IT_WORKS.map(s => (
      <div key={s.step} className="bg-surface-1 border border-surface-3 rounded-2xl p-6 relative">
        <p className="text-5xl font-black text-accent/20 leading-none mb-4 select-none">{s.step}</p>
        <span className="text-2xl mb-3 block">{s.icon}</span>
        <h3 className="font-semibold text-white mb-2">{s.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Verify in browser**

Scroll to the new sections. Confirm:
- Trust strip shows 3 stats in a bordered row (∞ / Live / Desktop + Mobile)
- "How FlowSpace works" section shows 3 numbered step cards
- Cards show large faded step numbers (01, 02, 03) in accent color
- "How it works" nav link from the nav scrolls to this section (test anchor)

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/LandingPage.tsx && git commit -m "feat: add trust strip and how it works sections"
```

---

### Task 6: Feature callout panels

Add `FeatureCallout` local component and replace the current `{/* Features grid */}` section with 4 large alternating panels.

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Add the FeatureCallout component**

Add this component definition immediately before `export default function LandingPage` (after the `FAQItem` function):

```tsx
interface CalloutProps {
  icon: string
  title: string
  body: string
  badge?: string
  flip?: boolean
  mockup: React.ReactNode
}

function FeatureCallout({ icon, title, body, badge, flip = false, mockup }: CalloutProps) {
  return (
    <div className={`flex flex-col ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 lg:gap-16 items-center py-14 border-b border-surface-3/50 last:border-0`}>
      <div className="flex-1">
        <span className="text-3xl mb-4 block">{icon}</span>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
          {badge && (
            <span className="text-[10px] font-semibold bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-gray-400 leading-relaxed text-[15px]">{body}</p>
      </div>
      <div className="flex-1 w-full bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
        {mockup}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the features grid section with callout panels**

Find `{/* Features grid */}` and replace the entire section with:

```tsx
{/* Feature callouts */}
<section className="px-6 pb-10 max-w-5xl mx-auto">
  <h2 className="text-3xl font-bold text-center text-white mb-3 tracking-tight">
    Built around how you actually work
  </h2>
  <p className="text-gray-500 text-center mb-16 text-base">
    Everything you need in one place — no app switching, no duct tape.
  </p>

  <FeatureCallout
    icon="🗂️"
    title="See all your work at once"
    body="FlowSpace's freeform canvas puts everything in front of you. Drag cards anywhere, group them into sections, draw connections — your layout, your rules. No rigid columns forcing your thinking into boxes."
    mockup={
      <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
        <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">In Progress</div>
        <div className="flex gap-2.5">
          {[
            { w: 120, accent: false },
            { w: 140, accent: true },
            { w: 108, accent: false },
          ].map((c, i) => (
            <div key={i} className={`bg-surface-2 border ${c.accent ? 'border-accent/40' : 'border-surface-3'} rounded-xl p-2.5`} style={{ width: c.w }}>
              <div className="h-2 bg-surface-4 rounded mb-1.5" style={{ width: c.w * 0.75 }} />
              <div className="h-2 bg-surface-4 rounded opacity-60" style={{ width: c.w * 0.5 }} />
            </div>
          ))}
        </div>
        {/* Lasso ring */}
        <div className="absolute top-12 left-5 w-40 h-20 border-2 border-accent/50 rounded-[60%_40%_50%_50%/40%_60%_40%_60%] pointer-events-none" />
      </div>
    }
  />

  <FeatureCallout
    icon="⚡"
    title="Your team, in the same room"
    body="Share any board and edit it together live. Presence avatars show who's active. Changes appear the moment they happen — no 'did you see my update?' messages."
    flip
    mockup={
      <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
        <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Design Sprint</div>
        <div className="flex gap-2.5">
          {[
            { w: 120, avatar: 'M', color: 'bg-purple-500' },
            { w: 130, avatar: 'A', color: 'bg-green-500' },
            { w: 110, avatar: 'J', color: 'bg-blue-500' },
          ].map((c, i) => (
            <div key={i} className="bg-surface-2 border border-surface-3 rounded-xl p-2.5 relative" style={{ width: c.w }}>
              <div className="h-2 bg-surface-4 rounded mb-1.5" style={{ width: c.w * 0.7 }} />
              <div className="h-2 bg-surface-4 rounded opacity-60" style={{ width: c.w * 0.5 }} />
              <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${c.color} ring-2 ring-surface-1 flex items-center justify-center text-white text-[8px] font-bold`}>{c.avatar}</div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 right-4 bg-surface-2 border border-surface-3 rounded-xl px-3 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-gray-400">3 people online</span>
        </div>
      </div>
    }
  />

  <FeatureCallout
    icon="📅"
    title="Deadlines that live with your work"
    body="Month, week, and day views in one place. Connect Google Calendar or import any ICS file. Your events stay next to your boards — no tab switching."
    mockup={
      <div className="p-5 h-52 overflow-hidden bg-surface-0/40">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-[8px] text-gray-600 text-center font-semibold">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 1
            const isToday = day === 14
            const hasEvent = [2, 7, 14, 16, 21, 22, 28].includes(day)
            const eventColor = [7, 16].includes(day) ? 'bg-accent' : 'bg-blue-500'
            return (
              <div key={i} className={`aspect-square rounded flex flex-col items-center justify-start pt-0.5 ${isToday ? 'bg-accent/20 border border-accent/40' : ''}`}>
                <span className={`text-[8px] ${isToday ? 'text-accent font-bold' : day < 0 || day > 30 ? 'text-gray-700' : 'text-gray-500'}`}>
                  {day >= 0 && day <= 30 ? day + 1 : ''}
                </span>
                {hasEvent && day >= 0 && <div className={`w-1 h-1 rounded-full mt-0.5 ${eventColor}`} />}
              </div>
            )
          })}
        </div>
      </div>
    }
  />

  <FeatureCallout
    icon="✦"
    title="An assistant that knows your board"
    body="Right-click any board and ask the AI to reorganize it, generate a full plan from scratch, or answer a question about your work. It reads your sections and cards — so its suggestions actually fit."
    badge="Pro"
    flip
    mockup={
      <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
        <div className="absolute inset-x-5 bottom-4 bg-surface-2 border border-accent/30 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-3">
            <span className="text-accent text-sm">✦</span>
            <span className="text-[10px] font-semibold text-white">Ask AI</span>
          </div>
          <div className="text-[9px] text-gray-500 mb-2">Reorganize this board into priority order</div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-accent/25 rounded" />
            <div className="h-1.5 w-4/5 bg-accent/25 rounded" />
            <div className="h-1.5 w-3/5 bg-accent/20 rounded opacity-70" />
          </div>
        </div>
        <div className="absolute top-4 left-5 flex gap-2">
          {[80, 100, 72].map((w, i) => (
            <div key={i} className="bg-surface-2 border border-surface-3 rounded-xl p-2" style={{ width: w }}>
              <div className="h-1.5 bg-surface-4 rounded mb-1" style={{ width: w * 0.75 }} />
              <div className="h-1.5 bg-surface-4 rounded opacity-60" style={{ width: w * 0.5 }} />
            </div>
          ))}
        </div>
      </div>
    }
  />
</section>
```

- [ ] **Step 3: Verify in browser**

Scroll through the feature section. Confirm:
- 4 panels, alternating left/right layout on wide screens
- Boards panel: cards + lasso ring overlay
- Collaboration panel: 3 cards with colored presence avatars + "3 people online" indicator
- Calendar panel: 7-column grid with today highlighted in accent, event dots
- AI panel: floating ask-AI card with accent-colored response lines + Pro badge on heading
- On mobile (narrow), all panels stack vertically (mockup above text)

- [ ] **Step 4: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/LandingPage.tsx && git commit -m "feat: add 4 feature callout panels replacing feature grid"
```

---

### Task 7: Secondary grid, Plans, FAQ, CTA

Final pass — add the secondary 6-card grid, update plans copy, trim FAQ, and update CTA copy.

**Files:**
- Modify: `src/components/LandingPage.tsx`

- [ ] **Step 1: Add secondary features grid**

Add this section immediately after the closing `</section>` of the feature callouts:

```tsx
{/* Secondary features */}
<section className="px-6 pb-28 max-w-5xl mx-auto">
  <h2 className="text-2xl font-bold text-center text-white mb-2 tracking-tight">
    And everything else you need
  </h2>
  <p className="text-gray-500 text-center mb-10 text-sm">
    No add-ons. No integrations. Built in.
  </p>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {SECONDARY_FEATURES.map(f => (
      <div
        key={f.title}
        className="bg-surface-1 border border-surface-3 rounded-2xl p-5 hover:border-accent/30 transition-all duration-200"
      >
        <span className="text-2xl mb-3 block">{f.icon}</span>
        <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Update the Plans section headings**

Find `{/* Plans */}` and update the `h2` and `p` at the top:

```tsx
<h2 className="text-3xl font-bold text-center text-white mb-3 tracking-tight">
  Two plans. Start for free.
</h2>
<p className="text-gray-500 text-center mb-14 text-base">
  Everything you need is in Essentials. Pro adds AI when you're ready for it.
</p>
```

- [ ] **Step 3: Update the CTA section**

Find `{/* CTA */}` and update the left-column content inside it:

```tsx
{/* Left — brand & perks */}
<div className="p-10 lg:p-14 border-b border-surface-3 lg:border-b-0 lg:border-r">
  <p className="text-2xl font-bold text-white tracking-tight mb-3">
    Ready to replace five tools with one?
  </p>
  <p className="text-gray-400 text-sm leading-relaxed mb-8">
    Create your account in seconds and start building. Everything saves automatically — pick up from any device, any time.
  </p>
  <ul className="space-y-3">
    {[
      '✦ Boards, calendar, files, and AI — all in one place.',
      '✦ Real-time collaboration from day one.',
      '✦ Works on desktop and mobile.',
    ].map(line => (
      <li key={line} className="text-sm text-gray-300">{line}</li>
    ))}
  </ul>
</div>
```

Also update the right-column h2 to match the new headline:

```tsx
<h2 className="text-3xl font-bold text-white mb-3 tracking-tight leading-snug">
  One workspace.<br />Everything in it.
</h2>
```

- [ ] **Step 4: Delete the Stats section**

Find `{/* Stats */}` and delete the entire section (the bordered grid with Live / 10 MB / ∞ / 2FA). It's replaced by the trust strip near the hero.

- [ ] **Step 5: Final build check**

```bash
cd /Users/michael/flowspace && bun run build 2>&1 | tail -20
```

Expected: no TypeScript errors. Bundle size warning is acceptable.

- [ ] **Step 6: Full page visual verification**

Open http://localhost:5173. Scroll top to bottom and confirm:
- Nav: logo + "How it works" link + Sign in + Get started
- Hero: new headline + subheading + desktop/mobile mockup
- Trust strip: 3 stats
- How it works: 3 numbered steps
- Feature callouts: 4 alternating panels
- Secondary grid: 6 cards
- Plans: "Two plans. Start for free." heading, Essentials has "Mobile-ready" item, Pro still "Coming Soon"
- FAQ: exactly 6 questions
- CTA: "Ready to replace five tools with one?" heading, 3 bullet lines, right side uses new headline

- [ ] **Step 7: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/LandingPage.tsx && git commit -m "feat: secondary feature grid, updated plans/CTA copy, trimmed FAQ

Completes landing page redesign: secondary 6-card grid, plans heading
updated, CTA copy refreshed, old stats section removed."
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Nav ✓, Hero headline ✓, Hero mockup (desktop+mobile) ✓, Trust strip ✓, How it works ✓, Feature callouts (4 panels) ✓, Secondary grid ✓, Plans copy ✓, FAQ trimmed to 6 ✓, CTA copy ✓, Footer untouched ✓
- [x] **Placeholders:** None — all code is complete and runnable
- [x] **Type consistency:** `CalloutProps` defined in Task 6 Step 1 and used only in Task 6 Step 2. `HOW_IT_WORKS`, `SECONDARY_FEATURES`, `FAQ`, `CORE_FEATURES`, `PRO_FEATURES` all defined in Task 1 and referenced in their respective sections. No naming conflicts.
- [x] **Removed:** `USE_CASES` array and its section (replaced by trust strip + how-it-works). Old `FEATURES` array (replaced by `SECONDARY_FEATURES` and callout panels). Stats section (replaced by trust strip).
