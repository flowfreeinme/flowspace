# Widget Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the 8 inline widget render functions from the 1,245-line `HomeScreen.tsx` monolith into 8 fully self-contained React components, each with their own state and file.

**Architecture:** Each widget is a default export in `src/components/widgets/`, receives only a typed `config` prop, reads from Zustand stores directly, and owns all its local state and side effects. `HomeScreen.tsx` becomes a ~160-line grid orchestrator. Migration is incremental — one widget per commit so any step can be reverted safely.

**Tech Stack:** React 18, TypeScript, Zustand stores (`useWorkspace`, `useCalendar`, `useAuth`, `useFocusTimer`), Tailwind CSS, Vitest (`npm test`), Lucide React icons, `@/` path alias maps to `src/`

---

## File Map

| Action | Path |
|---|---|
| Create | `src/components/widgets/WidgetShell.tsx` |
| Create | `src/components/widgets/FocusQueueWidget.tsx` |
| Create | `src/components/widgets/RecentWorkWidget.tsx` |
| Create | `src/components/widgets/QuickCaptureWidget.tsx` |
| Create | `src/components/widgets/TodayWidget.tsx` |
| Create | `src/components/widgets/FocusTimerWidget.tsx` |
| Create | `src/components/widgets/WeatherWidget.tsx` |
| Create | `src/components/widgets/ProPlannerWidget.tsx` |
| Create | `src/components/widgets/CalendarWidget.tsx` |
| Modify | `src/components/HomeScreen.tsx` (7 incremental passes) |

---

### Task 1: Extract WidgetShell

**Files:**
- Create: `src/components/widgets/WidgetShell.tsx`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Verify baseline tests pass**

```bash
npm test
```
Expected: all tests pass. If any fail, fix before proceeding.

- [ ] **Step 2: Create `src/components/widgets/WidgetShell.tsx`**

```tsx
import { X } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import WidgetSettingsPopover from './settings/WidgetSettingsPopover'
import type { HomeWidget } from '@/types'
import type { HomeWidgetResizeCorner } from '@/lib/homeCenter'

interface WidgetShellProps {
  widget: HomeWidget
  editingHome: boolean
  isResizing: boolean
  openSettings: boolean
  onOpenSettings: () => void
  onCloseSettings: () => void
  onStartResize: (e: React.PointerEvent<HTMLButtonElement>, corner: HomeWidgetResizeCorner) => void
  onRemove: () => void
  settingsForm: React.ReactNode
  children: React.ReactNode
}

const RESIZE_HANDLES: Array<{
  corner: HomeWidgetResizeCorner
  className: string
  cursorClass: string
  label: string
}> = [
  { corner: 'nw', className: 'left-1 top-1', cursorClass: 'cursor-nwse-resize', label: 'Resize from top left' },
  { corner: 'ne', className: 'right-1 top-1', cursorClass: 'cursor-nesw-resize', label: 'Resize from top right' },
  { corner: 'sw', className: 'bottom-1 left-1', cursorClass: 'cursor-nesw-resize', label: 'Resize from bottom left' },
  { corner: 'se', className: 'bottom-1 right-1', cursorClass: 'cursor-nwse-resize', label: 'Resize from bottom right' },
]

function widgetGridStyle(widget: HomeWidget, isMobile: boolean): React.CSSProperties {
  if (isMobile) {
    return {
      gridColumn: '1 / -1',
      gridRow: `span ${Math.min(12, Math.max(3, widget.h))}`,
    }
  }
  return {
    gridColumn: `${widget.x + 1} / span ${widget.w}`,
    gridRow: `${widget.y + 1} / span ${widget.h}`,
  }
}

export default function WidgetShell({
  widget,
  editingHome,
  isResizing,
  openSettings,
  onOpenSettings,
  onCloseSettings,
  onStartResize,
  onRemove,
  settingsForm,
  children,
}: WidgetShellProps) {
  const isMobile = useIsMobile()

  function handleClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!editingHome) return
    if (event.target instanceof HTMLElement && event.target.closest('[data-home-widget-edit-control="true"]')) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <section
      onClickCapture={handleClickCapture}
      className={`relative min-h-0 overflow-hidden rounded-2xl border bg-surface-1 shadow-sm transition-colors ${
        editingHome ? 'select-none border-accent/45 ring-1 ring-accent/20' : 'border-surface-3'
      } ${isResizing ? 'z-20 border-accent ring-2 ring-accent/30' : ''}`}
      style={widgetGridStyle(widget, isMobile)}
    >
      <div
        className="absolute right-2 top-2 z-50 flex items-center gap-1 group/widget"
        data-home-widget-edit-control="true"
      >
        <WidgetSettingsPopover
          open={openSettings}
          onOpen={onOpenSettings}
          onClose={onCloseSettings}
        >
          {settingsForm}
        </WidgetSettingsPopover>
        {editingHome && widget.type !== 'calendar' && (
          <button
            type="button"
            data-home-widget-edit-control="true"
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-surface-4 bg-surface-0/90 text-gray-400 shadow-xl backdrop-blur transition-colors hover:bg-red-500/15 hover:text-red-200"
            title="Remove widget"
            aria-label="Remove widget"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {editingHome && (
        <>
          <div className="pointer-events-none absolute inset-0 z-30 rounded-2xl border border-accent/80 ring-2 ring-accent/15" />
          {RESIZE_HANDLES.map(handle => (
            <button
              key={handle.corner}
              type="button"
              data-home-widget-edit-control="true"
              onPointerDown={event => onStartResize(event, handle.corner)}
              className={`absolute z-50 h-6 w-6 touch-none rounded-md border-2 border-surface-0 bg-accent shadow-lg shadow-accent/25 transition-transform hover:scale-110 active:scale-95 md:h-5 md:w-5 ${handle.className} ${handle.cursorClass}`}
              title={handle.label}
              aria-label={handle.label}
            />
          ))}
        </>
      )}

      {children}
    </section>
  )
}
```

- [ ] **Step 3: Replace inline WidgetShell in `HomeScreen.tsx`**

Add the import at the top of `HomeScreen.tsx` (after existing imports):
```tsx
import WidgetShell from './widgets/WidgetShell'
```

Delete the following three inline function components from `HomeScreen.tsx` (they are now in `WidgetShell.tsx`):
- The `WidgetControls` function (lines that define `function WidgetControls(...)`)
- The `WidgetResizeHandles` function
- The `WidgetShell` function

Update the grid loop in `HomeScreen.tsx` JSX. Replace:
```tsx
{widgets.map(widget => (
  <WidgetShell key={widget.id} widget={widget}>
    {renderWidget(widget)}
  </WidgetShell>
))}
```
With:
```tsx
{widgets.map(widget => (
  <WidgetShell
    key={widget.id}
    widget={widget}
    editingHome={editingHome}
    isResizing={activeResizeWidgetId === widget.id}
    openSettings={openSettingsWidget === widget.id}
    onOpenSettings={() => setOpenSettingsWidget(widget.id)}
    onCloseSettings={() => setOpenSettingsWidget(null)}
    onStartResize={(e, corner) => startWidgetResize(e, widget, corner)}
    onRemove={() => removeHomeCenterWidget(widget.id)}
    settingsForm={renderSettingsForm(widget)}
  >
    {renderWidget(widget)}
  </WidgetShell>
))}
```

Also remove these now-unused imports from `HomeScreen.tsx`: `ChevronLeft`, `ChevronRight` (they move to CalendarWidget later, but keep them for now — only remove what's actually unused after this step).

Remove the `handleWidgetClickCapture` function from `HomeScreen.tsx` (it moved into `WidgetShell`).

Remove the `startWidgetResize` local variable for `isMobile` from `WidgetShell`-related code — `WidgetShell` now calls `useIsMobile()` itself.

- [ ] **Step 4: Run tests and verify**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 5: Manual smoke test**

Start the dev server (`npm run dev`), open the home screen. Verify:
- All widgets render
- Edit mode toggle works (click "Edit home center" at bottom)
- Resize handles appear in edit mode
- Settings gear opens settings popover
- Remove button appears and removes widgets in edit mode

- [ ] **Step 6: Commit**

```bash
git add src/components/widgets/WidgetShell.tsx src/components/HomeScreen.tsx
git commit -m "refactor: extract WidgetShell to widgets/WidgetShell.tsx"
```

---

### Task 2: Extract FocusQueueWidget, RecentWorkWidget, QuickCaptureWidget

**Files:**
- Create: `src/components/widgets/FocusQueueWidget.tsx`
- Create: `src/components/widgets/RecentWorkWidget.tsx`
- Create: `src/components/widgets/QuickCaptureWidget.tsx`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Create `src/components/widgets/FocusQueueWidget.tsx`**

```tsx
import { Target } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import type { FocusQueueConfig } from '@/types/widgetSettings'

export default function FocusQueueWidget({ config }: { config: FocusQueueConfig }) {
  const { pages, openTab } = useWorkspace()

  const visiblePages = Object.values(pages).filter(p => !p.folder && !p.archived)
  const filteredPages = visiblePages
    .filter(p => {
      if (config.filter === 'pages') return !p.boardMode
      if (config.filter === 'boards') return p.boardMode
      return true
    })
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt))
    .slice(0, config.itemCount)

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        <Target size={14} className="text-accent" />
        {config.title}
      </div>
      <div className="space-y-2 overflow-hidden">
        {filteredPages.length === 0 ? (
          <p className="text-sm leading-relaxed text-gray-500">Open or edit a board to seed your focus queue.</p>
        ) : filteredPages.map((p, index) => (
          <button
            key={p.id}
            onClick={() => openTab(p.id)}
            className="flex w-full items-center gap-2 rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-left transition-colors hover:border-accent/40"
          >
            <span className="text-xs text-gray-600">{index + 1}</span>
            <span className="truncate text-sm text-gray-200">{p.icon} {p.title || 'Untitled'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/widgets/RecentWorkWidget.tsx`**

```tsx
import { History } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import type { RecentWorkConfig } from '@/types/widgetSettings'

export default function RecentWorkWidget({ config }: { config: RecentWorkConfig }) {
  const { pages, openTab } = useWorkspace()

  const visiblePages = Object.values(pages).filter(p => !p.folder && !p.archived)
  const filteredPages = visiblePages
    .filter(p => {
      if (config.filter === 'pages') return !p.boardMode
      if (config.filter === 'boards') return p.boardMode
      return true
    })
    .sort((a, b) => {
      if (config.sortBy === 'lastModified') return b.updatedAt - a.updatedAt
      return (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt)
    })
    .slice(0, config.itemCount)

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        <History size={14} className="text-accent" />
        {config.title}
      </div>
      <div className="space-y-1.5 overflow-hidden">
        {filteredPages.length === 0 ? (
          <p className="text-sm text-gray-500">Your recent boards and pages will appear here.</p>
        ) : filteredPages.map(p => (
          <button
            key={p.id}
            onClick={() => openTab(p.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
          >
            <span>{p.icon}</span>
            <span className="truncate text-sm text-gray-300">{p.title || 'Untitled'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/widgets/QuickCaptureWidget.tsx`**

Note: the "New Event" button opens an EventModal. `EventModal` uses fixed positioning internally so it renders correctly even when imported inside a widget that has `overflow: hidden`.

```tsx
import { useState } from 'react'
import { useWorkspace } from '@/stores/workspace'
import EventModal from '../EventModal'
import type { QuickCaptureConfig } from '@/types/widgetSettings'

export default function QuickCaptureWidget({ config }: { config: QuickCaptureConfig }) {
  const { createPage, createBoard, openTab } = useWorkspace()
  const [showNewEvent, setShowNewEvent] = useState(false)

  const enabledButtons = config.buttons.filter(b => b.enabled)
  const colCount = Math.max(1, enabledButtons.length)

  return (
    <>
      <div
        className="h-full p-3"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, gap: '0.5rem' }}
      >
        {enabledButtons.map(btn => {
          if (btn.id === 'board') return (
            <button
              key="board"
              onClick={() => { const id = createBoard(null); openTab(id) }}
              className="rounded-xl border border-surface-3 bg-surface-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent/40 hover:text-white"
            >
              {btn.label}
            </button>
          )
          if (btn.id === 'page') return (
            <button
              key="page"
              onClick={() => { const id = createPage(null); openTab(id) }}
              className="rounded-xl border border-surface-3 bg-surface-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent/40 hover:text-white"
            >
              {btn.label}
            </button>
          )
          return (
            <button
              key="event"
              onClick={() => setShowNewEvent(true)}
              className="rounded-xl border border-surface-3 bg-surface-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent/40 hover:text-white"
            >
              {btn.label}
            </button>
          )
        })}
      </div>
      {showNewEvent && (
        <EventModal
          defaultDate={new Date()}
          onClose={() => setShowNewEvent(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Wire up in `HomeScreen.tsx`**

Add imports:
```tsx
import FocusQueueWidget from './widgets/FocusQueueWidget'
import RecentWorkWidget from './widgets/RecentWorkWidget'
import QuickCaptureWidget from './widgets/QuickCaptureWidget'
```

In `renderWidget`, replace the three inline function calls:
```tsx
// Replace:
if (widget.type === 'focus') return renderFocusWidget()
if (widget.type === 'recent') return renderRecentWidget()
if (widget.type === 'quickCapture') return renderQuickCaptureWidget()

// With:
if (widget.type === 'focus') return <FocusQueueWidget config={getWidgetSettings('focus', widgetSettings)} />
if (widget.type === 'recent') return <RecentWorkWidget config={getWidgetSettings('recent', widgetSettings)} />
if (widget.type === 'quickCapture') return <QuickCaptureWidget config={getWidgetSettings('quickCapture', widgetSettings)} />
```

Delete from `HomeScreen.tsx`:
- `renderFocusWidget()` function body
- `renderRecentWidget()` function body
- `renderQuickCaptureWidget()` function body
- The `openNewBoard` and `openNewPage` helper functions (now in QuickCaptureWidget)
- `recentPages` and `focusPages` derived values — they are now computed inside the widgets
- Do NOT remove `visiblePages` yet — it is still used by `generateDayPlan` in `HomeScreen` until ProPlannerWidget is extracted in Task 6

Remove the now-moved state/logic from HomeScreen that only supported these widgets. Also remove the import for `EventModal` from HomeScreen **only if** it is no longer used elsewhere (it is still used by CalendarWidget below — keep it for now).

- [ ] **Step 5: Run tests and manual smoke test**

```bash
npm test
```
Expected: all tests pass.

Open dev server. Verify Focus Queue, Recent Work, and Quick Capture widgets render and function. Test "New Event" button on Quick Capture opens the event modal.

- [ ] **Step 6: Commit**

```bash
git add src/components/widgets/FocusQueueWidget.tsx src/components/widgets/RecentWorkWidget.tsx src/components/widgets/QuickCaptureWidget.tsx src/components/HomeScreen.tsx
git commit -m "refactor: extract FocusQueueWidget, RecentWorkWidget, QuickCaptureWidget"
```

---

### Task 3: Extract TodayWidget

**Files:**
- Create: `src/components/widgets/TodayWidget.tsx`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Create `src/components/widgets/TodayWidget.tsx`**

TodayWidget owns its own 1-second clock interval. The `HomeScreen` header also has a `now` interval — these are independent and stay in sync naturally.

```tsx
import { useState, useEffect } from 'react'
import { Clock3 } from 'lucide-react'
import { useCalendar } from '@/stores/calendar'
import type { TodayConfig } from '@/types/widgetSettings'
import type { CalendarEvent } from '@/types/calendar'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) { return String(n).padStart(2, '0') }

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function TodayWidget({ config }: { config: TodayConfig }) {
  const [now, setNow] = useState(new Date())
  const { events } = useCalendar()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const today = new Date()
  const todayM = today.getMonth()
  const todayD = today.getDate()
  const hours = now.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12

  const nextEvent = events
    .filter(e => e.end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        <Clock3 size={14} className="text-accent" />
        Today
      </div>
      <p className="text-base font-medium text-gray-400">{config.greeting}</p>
      <p className="text-2xl font-semibold text-white">{DAYS[today.getDay()]}, {MONTHS[todayM]} {todayD}</p>
      {config.showClock && (
        <p className="mt-1 text-sm text-gray-500">{displayHour}:{pad(now.getMinutes())} {ampm}</p>
      )}
      {config.showNextEvent && (
        <div className="mt-auto rounded-xl border border-surface-3 bg-surface-2 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-600">Next</p>
          <p className="truncate text-sm font-medium text-gray-200">
            {nextEvent ? nextEvent.title : 'No upcoming events'}
          </p>
          {nextEvent && <p className="text-xs text-gray-500">{formatEventTime(nextEvent)}</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in `HomeScreen.tsx`**

Add import:
```tsx
import TodayWidget from './widgets/TodayWidget'
```

In `renderWidget`, replace:
```tsx
// Replace:
if (widget.type === 'today') return renderTodayWidget()
// With:
if (widget.type === 'today') return <TodayWidget config={getWidgetSettings('today', widgetSettings)} />
```

Delete from `HomeScreen.tsx`:
- `renderTodayWidget()` function body
- `nextEvent` derived value — TodayWidget now computes this internally from `events`
- `formatEventTime` helper function — same, moved to TodayWidget
- Do NOT remove `upcomingEvents` — it is still used by `generateDayPlan` in HomeScreen until ProPlannerWidget is extracted in Task 6

- [ ] **Step 3: Run tests and manual smoke test**

```bash
npm test
```
Expected: all tests pass.

Open dev server. Verify Today widget shows current date, time, and next event. Verify the header clock in HomeScreen still ticks independently.

- [ ] **Step 4: Commit**

```bash
git add src/components/widgets/TodayWidget.tsx src/components/HomeScreen.tsx
git commit -m "refactor: extract TodayWidget with own clock interval"
```

---

### Task 4: Extract FocusTimerWidget

**Files:**
- Create: `src/components/widgets/FocusTimerWidget.tsx`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Create `src/components/widgets/FocusTimerWidget.tsx`**

FocusTimerWidget has no local state — all timer state lives in the `focusTimer` Zustand store.

```tsx
import { Minus, Pause, Play, RotateCcw, Timer, Plus } from 'lucide-react'
import { useFocusTimer } from '@/stores/focusTimer'
import {
  formatFocusTimerSeconds,
  MAX_FOCUS_TIMER_MINUTES,
  MIN_FOCUS_TIMER_MINUTES,
} from '@/lib/focusTimer'
import type { FocusTimerConfig } from '@/types/widgetSettings'

export default function FocusTimerWidget({ config }: { config: FocusTimerConfig }) {
  const {
    durationMinutes,
    draftMinutes,
    remainingSeconds,
    running,
    alarmActive,
    setDraftMinutes,
    applyDraft,
    configure,
    adjust,
    reset,
    toggle,
    stopAlarm,
  } = useFocusTimer()

  const totalSeconds = Math.max(1, durationMinutes * 60)
  const elapsedPercent = Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))

  const timerStatus = alarmActive
    ? 'Timer is up'
    : remainingSeconds === 0
      ? 'Sprint complete'
      : running
        ? 'Focus mode active'
        : `${durationMinutes} minute sprint`

  const timerBadgeClass = alarmActive
    ? 'border-red-400/30 bg-red-500/10 text-red-200'
    : running
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : 'border-surface-4 bg-surface-2 text-gray-500'
  const timerBadgeLabel = alarmActive ? 'Up' : running ? 'Live' : 'Ready'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-surface-1 via-surface-1 to-emerald-500/10 p-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-300">
          <Timer size={13} />
          Max focus
        </div>
        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${timerBadgeClass}`}>
          {timerBadgeLabel}
        </span>
      </div>

      <div className="my-auto min-h-0 py-1.5">
        <div className="flex items-end justify-between gap-2">
          <p className="text-3xl font-semibold leading-none text-white tabular-nums md:text-4xl">
            {formatFocusTimerSeconds(remainingSeconds)}
          </p>
          <p className="pb-0.5 text-[11px] font-medium text-gray-500">{timerStatus}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${elapsedPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-auto shrink-0 space-y-1.5">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.min(4, config.presets.length + 1)}, minmax(0, 1fr))` }}
        >
          {config.presets.map(preset => (
            <button
              key={preset.minutes}
              onClick={() => configure(preset.minutes)}
              data-home-widget-edit-control="true"
              className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                durationMinutes === preset.minutes
                  ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'
                  : 'border-surface-3 bg-surface-2 text-gray-500 hover:border-emerald-400/25 hover:text-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <label
            data-home-widget-edit-control="true"
            className="flex min-w-0 items-center gap-1 rounded-lg border border-surface-3 bg-surface-2 px-1.5 py-1 text-[11px] text-gray-500 focus-within:border-emerald-400/40"
          >
            <input
              type="number"
              min={MIN_FOCUS_TIMER_MINUTES}
              max={MAX_FOCUS_TIMER_MINUTES}
              inputMode="numeric"
              value={draftMinutes}
              onChange={event => setDraftMinutes(event.target.value)}
              onBlur={applyDraft}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
              className="min-w-0 flex-1 bg-transparent text-right text-xs font-semibold text-white tabular-nums outline-none"
              aria-label="Custom focus timer minutes"
            />
            <span>m</span>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          {alarmActive ? (
            <button
              onClick={stopAlarm}
              data-home-widget-edit-control="true"
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-400"
            >
              Stop alarm
            </button>
          ) : (
            <button
              onClick={toggle}
              data-home-widget-edit-control="true"
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-surface-0 transition-colors hover:bg-emerald-400"
            >
              {running ? <Pause size={13} /> : <Play size={13} />}
              {running ? 'Pause' : 'Start'}
            </button>
          )}
          <button data-home-widget-edit-control="true" onClick={reset} className="home-widget-control border border-surface-3 bg-surface-2" title="Reset timer">
            <RotateCcw size={13} />
          </button>
          <button data-home-widget-edit-control="true" onClick={() => adjust(-5)} className="home-widget-control border border-surface-3 bg-surface-2" title="Shorter sprint">
            <Minus size={13} />
          </button>
          <button data-home-widget-edit-control="true" onClick={() => adjust(5)} className="home-widget-control border border-surface-3 bg-surface-2" title="Longer sprint">
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire up in `HomeScreen.tsx`**

Add import:
```tsx
import FocusTimerWidget from './widgets/FocusTimerWidget'
```

In `renderWidget`, replace:
```tsx
// Replace:
if (widget.type === 'focusTimer') return renderFocusTimerWidget()
// With:
if (widget.type === 'focusTimer') return <FocusTimerWidget config={getWidgetSettings('focusTimer', widgetSettings)} />
```

Delete from `HomeScreen.tsx`:
- `renderFocusTimerWidget()` function body
- All `useFocusTimer()` destructured values (the entire `useFocusTimer()` hook call)
- `toggleFocusTimer` wrapper function
- Imports no longer needed: `Pause`, `Play`, `RotateCcw`, `Minus`, `Timer` (check each is not used elsewhere before removing)
- Imports from `@/lib/focusTimer`: `FOCUS_TIMER_PRESETS`, `formatFocusTimerSeconds`, `MAX_FOCUS_TIMER_MINUTES`, `MIN_FOCUS_TIMER_MINUTES`
- Import of `useFocusTimer` from `@/stores/focusTimer`

- [ ] **Step 3: Run tests and manual smoke test**

```bash
npm test
```
Expected: all tests pass.

Open dev server. Verify Focus Timer widget shows countdown, start/pause/reset buttons work, preset buttons work, custom minutes input works, alarm state works.

- [ ] **Step 4: Commit**

```bash
git add src/components/widgets/FocusTimerWidget.tsx src/components/HomeScreen.tsx
git commit -m "refactor: extract FocusTimerWidget"
```

---

### Task 5: Extract WeatherWidget

**Files:**
- Create: `src/components/widgets/WeatherWidget.tsx`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Create `src/components/widgets/WeatherWidget.tsx`**

WeatherWidget owns all weather state, geolocation, and city search. The weather location is persisted to `localStorage` under key `flowspace_weather_location`.

```tsx
import { useState, useEffect } from 'react'
import { CloudSun, Droplets, Loader2, LocateFixed, MapPin, Search, Wind } from 'lucide-react'
import {
  buildWeatherForecastUrl,
  buildWeatherGeocodingUrl,
  formatWeatherLocationLabel,
  parseGeocodingResults,
  parseWeatherForecast,
  type WeatherLocation,
  type WeatherSummary,
} from '@/lib/weather'
import type { WeatherConfig } from '@/types/widgetSettings'

const WEATHER_LOCATION_STORAGE_KEY = 'flowspace_weather_location'

function loadSavedWeatherLocation(): WeatherLocation | null {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY)
    if (!raw) return null
    const location = JSON.parse(raw) as WeatherLocation
    if (typeof location.name !== 'string' || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') return null
    return location
  } catch {
    return null
  }
}

function saveWeatherLocation(location: WeatherLocation) {
  try { localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, JSON.stringify(location)) } catch {}
}

export default function WeatherWidget({ config }: { config: WeatherConfig }) {
  const [weatherLocation, setWeatherLocation] = useState<WeatherLocation | null>(() => loadSavedWeatherLocation())
  const [weather, setWeather] = useState<WeatherSummary | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherLocating, setWeatherLocating] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [weatherQuery, setWeatherQuery] = useState('')

  useEffect(() => {
    if (weatherLocation) return
    detectWeatherLocation()
  }, [])

  useEffect(() => {
    if (!weatherLocation) return
    let cancelled = false

    async function loadWeather() {
      setWeatherLoading(true)
      setWeatherError(null)
      try {
        const res = await fetch(buildWeatherForecastUrl(weatherLocation!))
        if (!res.ok) throw new Error('Weather service unavailable.')
        const data = await res.json()
        if (!cancelled) setWeather(parseWeatherForecast(data))
      } catch (err) {
        if (!cancelled) setWeatherError(err instanceof Error ? err.message : 'Weather failed to load.')
      } finally {
        if (!cancelled) setWeatherLoading(false)
      }
    }

    loadWeather()
    return () => { cancelled = true }
  }, [weatherLocation])

  function detectWeatherLocation() {
    if (!navigator.geolocation) {
      setWeatherError('Choose a city to show weather.')
      return
    }
    setWeatherLocating(true)
    setWeatherError(null)
    navigator.geolocation.getCurrentPosition(
      position => {
        const location: WeatherLocation = {
          name: 'Current location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        saveWeatherLocation(location)
        setWeatherLocation(location)
        setWeatherLocating(false)
      },
      () => {
        setWeatherError('Location access was blocked. Search for a city instead.')
        setWeatherLocating(false)
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 30, timeout: 8000 },
    )
  }

  async function searchWeatherLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = weatherQuery.trim()
    if (query.length < 2) { setWeatherError('Enter a city or zip code.'); return }
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch(buildWeatherGeocodingUrl(query))
      if (!res.ok) throw new Error('Location search failed.')
      const results = parseGeocodingResults(await res.json())
      const location = results[0]
      if (!location) throw new Error('No matching location found.')
      saveWeatherLocation(location)
      setWeatherLocation(location)
      setWeatherQuery('')
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : 'Location search failed.')
    } finally {
      setWeatherLoading(false)
    }
  }

  const locationLabel = weatherLocation ? formatWeatherLocationLabel(weatherLocation) : 'Finding your location'
  const toC = (f: number) => Math.round((f - 32) * 5 / 9)
  const fmt = (f: number) => config.unit === 'C' ? toC(f) : Math.round(f)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-surface-1 via-surface-1 to-sky-500/10 p-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-sky-300">
          <CloudSun size={13} />
          Weather
        </div>
        <button
          type="button"
          data-home-widget-edit-control="true"
          onClick={detectWeatherLocation}
          disabled={weatherLocating || weatherLoading}
          className="flex h-7 items-center gap-1 rounded-lg border border-surface-3 bg-surface-2 px-2 text-[11px] text-gray-400 transition-colors hover:border-sky-400/30 hover:text-sky-200 disabled:opacity-60"
          title="Use my location"
        >
          {weatherLocating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
          Local
        </button>
      </div>

      <div className="my-auto min-h-0 py-2">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-500">
          <MapPin size={12} className="shrink-0 text-sky-300" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {weatherLoading && !weather ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={15} className="animate-spin text-sky-300" />
            Loading weather
          </div>
        ) : weather ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-4xl font-semibold leading-none text-white tabular-nums md:text-5xl">
                  {fmt(weather.temperature)}°{config.unit}
                </p>
                {config.showFeelsLike && (
                  <p className="mt-1 truncate text-xs font-medium text-gray-500">
                    Feels {fmt(weather.feelsLike)}° · H {fmt(weather.high)}° / L {fmt(weather.low)}°
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl leading-none">{weather.condition.icon}</p>
                <p className="mt-1 max-w-[7rem] truncate text-xs font-medium text-sky-200">{weather.condition.label}</p>
              </div>
            </div>

            {(config.showHumidity || config.showWind || config.showPrecipitation) && (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {config.showHumidity && (
                  <div className="rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-600">
                      <Droplets size={10} /> Humid
                    </div>
                    <p className="text-xs font-semibold text-gray-200">{weather.humidity}%</p>
                  </div>
                )}
                {config.showWind && (
                  <div className="rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-600">
                      <Wind size={10} /> Wind
                    </div>
                    <p className="text-xs font-semibold text-gray-200">
                      {config.unit === 'C' ? `${Math.round(weather.windSpeed * 1.60934)} km/h` : `${weather.windSpeed} mph`}
                    </p>
                  </div>
                )}
                {config.showPrecipitation && (
                  <div className="rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">Rain</div>
                    <p className="text-xs font-semibold text-gray-200">{weather.precipitation}"</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-gray-500">Allow location access or search for a city to show weather.</p>
        )}
      </div>

      <form
        data-home-widget-edit-control="true"
        onSubmit={searchWeatherLocation}
        className="mt-auto flex shrink-0 items-center gap-1.5"
      >
        <input
          value={weatherQuery}
          onChange={event => setWeatherQuery(event.target.value)}
          placeholder="City or zip"
          className="min-w-0 flex-1 rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5 text-xs text-white outline-none transition-colors placeholder:text-gray-600 focus:border-sky-400/40"
          aria-label="Weather location"
        />
        <button
          type="submit"
          disabled={weatherLoading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-surface-0 transition-colors hover:bg-sky-400 disabled:opacity-60"
          title="Search location"
        >
          {weatherLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
        </button>
      </form>

      {weatherError && (
        <p className="mt-1.5 shrink-0 truncate text-[11px] text-yellow-200">{weatherError}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in `HomeScreen.tsx`**

Add import:
```tsx
import WeatherWidget from './widgets/WeatherWidget'
```

In `renderWidget`, replace:
```tsx
// Replace:
return renderWeatherWidget()
// With:
return <WeatherWidget config={getWidgetSettings('weather', widgetSettings)} />
```

Delete from `HomeScreen.tsx`:
- `renderWeatherWidget()` function body
- `weatherLocation`, `weatherQuery`, `weather`, `weatherLoading`, `weatherLocating`, `weatherError` state declarations
- `loadSavedWeatherLocation`, `saveWeatherLocation`, `detectWeatherLocation`, `searchWeatherLocation` functions
- Both weather-related `useEffect` hooks (the one that calls `detectWeatherLocation` and the one that calls `loadWeather`)
- `hasWeatherWidget` derived value
- `WEATHER_LOCATION_STORAGE_KEY` constant
- Imports no longer needed: `buildWeatherForecastUrl`, `buildWeatherGeocodingUrl`, `formatWeatherLocationLabel`, `parseGeocodingResults`, `parseWeatherForecast`, and the `WeatherLocation`/`WeatherSummary` type imports from `@/lib/weather`
- Lucide imports no longer used: `CloudSun`, `Droplets`, `LocateFixed`, `MapPin`, `Search`, `Wind` (verify each is not used elsewhere)

- [ ] **Step 3: Run tests and manual smoke test**

```bash
npm test
```
Expected: all tests pass.

Open dev server. Verify Weather widget loads, geolocation works, city search works, unit toggle (F/C) respects config.

- [ ] **Step 4: Commit**

```bash
git add src/components/widgets/WeatherWidget.tsx src/components/HomeScreen.tsx
git commit -m "refactor: extract WeatherWidget with self-contained weather state"
```

---

### Task 6: Extract ProPlannerWidget

**Files:**
- Create: `src/components/widgets/ProPlannerWidget.tsx`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Create `src/components/widgets/ProPlannerWidget.tsx`**

```tsx
import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { useCalendar } from '@/stores/calendar'
import { useAuth } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { buildDayPlannerPrompt, buildDayPlannerWorkspaceContext, createFallbackDayPlan } from '@/lib/dayPlanner'
import type { ProPlannerConfig } from '@/types/widgetSettings'

export default function ProPlannerWidget({ config }: { config: ProPlannerConfig }) {
  const { pages } = useWorkspace()
  const { events } = useCalendar()
  const { user } = useAuth()
  const [dayPlan, setDayPlan] = useState<string | null>(null)
  const [dayPlanLoading, setDayPlanLoading] = useState(false)
  const [dayPlanError, setDayPlanError] = useState<string | null>(null)

  const now = new Date()
  const visiblePages = Object.values(pages).filter(p => !p.folder && !p.archived)
  const upcomingEvents = events
    .filter(e => e.end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  async function generateDayPlan() {
    if (!user) {
      setDayPlanError('Sign in to generate an AI day plan.')
      return
    }
    setDayPlanLoading(true)
    setDayPlanError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sign in again to use the AI day planner.')

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: buildDayPlannerPrompt(now) }],
          workspaceContext: buildDayPlannerWorkspaceContext({ now, pages, events }),
        }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'AI day planner failed.')
      if (typeof data.message !== 'string') throw new Error('AI day planner returned an invalid response.')
      setDayPlan(data.message)
    } catch (err) {
      setDayPlan(createFallbackDayPlan({ now, pages: visiblePages, events: upcomingEvents }))
      setDayPlanError(err instanceof Error ? `AI unavailable: ${err.message}` : 'AI unavailable. Showing a local plan.')
    } finally {
      setDayPlanLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-br from-surface-1 via-surface-1 to-accent/10 p-4">
      <div className="shrink-0">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
          <Sparkles size={14} />
          AI planner
        </div>
        <p className="text-base font-semibold text-white">AI day planner</p>
        {!dayPlan && (
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {config.workStart}–{config.workEnd} · {config.focusStyle.replace('-', ' ')}
            {config.customInstructions ? ` · ${config.customInstructions}` : ''}
          </p>
        )}
      </div>
      {dayPlan && (
        <div className="my-3 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-surface-3 bg-surface-0/40 px-3 py-2 text-xs leading-relaxed text-gray-300">
          {dayPlan}
        </div>
      )}
      {dayPlanError && (
        <p className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-1.5 text-[11px] leading-snug text-yellow-200">
          {dayPlanError}
        </p>
      )}
      <button
        onClick={generateDayPlan}
        disabled={dayPlanLoading}
        className="mt-auto flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/10 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-60"
      >
        {dayPlanLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {dayPlan ? 'Refresh plan' : 'Generate plan'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wire up in `HomeScreen.tsx`**

Add import:
```tsx
import ProPlannerWidget from './widgets/ProPlannerWidget'
```

In `renderWidget`, replace:
```tsx
// Replace:
if (widget.type === 'proPlanner') return renderProPlannerWidget()
// With:
if (widget.type === 'proPlanner') return <ProPlannerWidget config={getWidgetSettings('proPlanner', widgetSettings)} />
```

Delete from `HomeScreen.tsx`:
- `renderProPlannerWidget()` function body
- `dayPlan`, `dayPlanLoading`, `dayPlanError` state declarations
- `generateDayPlan` function
- Remove `upcomingEvents` derived value — ProPlannerWidget now computes it internally
- Remove `visiblePages` derived value — no longer needed in HomeScreen
- Check if `useAuth` is still needed — if `user` is only used in the planner now, remove the `useAuth` hook call and import
- Imports no longer needed: `buildDayPlannerPrompt`, `buildDayPlannerWorkspaceContext`, `createFallbackDayPlan` from `@/lib/dayPlanner`
- Lucide: `Sparkles` (verify not used elsewhere)
- `supabase` import (verify not used elsewhere in HomeScreen)

- [ ] **Step 3: Run tests and manual smoke test**

```bash
npm test
```
Expected: all tests pass.

Open dev server. Verify AI planner widget shows work hours config, generate button triggers fetch, fallback plan shows on error.

- [ ] **Step 4: Commit**

```bash
git add src/components/widgets/ProPlannerWidget.tsx src/components/HomeScreen.tsx
git commit -m "refactor: extract ProPlannerWidget with self-contained AI fetch"
```

---

### Task 7: Extract CalendarWidget

**Files:**
- Create: `src/components/widgets/CalendarWidget.tsx`
- Modify: `src/components/HomeScreen.tsx`

- [ ] **Step 1: Create `src/components/widgets/CalendarWidget.tsx`**

CalendarWidget owns all calendar view state and modals. It calls `onSelectDay`/`onSelectWeek` when the user navigates to a fullscreen view (those views live at the HomeScreen level).

```tsx
import { useState, useEffect, useRef } from 'react'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { useCalendar } from '@/stores/calendar'
import { useAuth } from '@/stores/auth'
import CalendarImport from '../CalendarImport'
import EventModal from '../EventModal'
import type { CalendarEvent } from '@/types/calendar'
import type { CalendarConfig } from '@/types/widgetSettings'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

interface CalendarWidgetProps {
  config: CalendarConfig
  onSelectDay: (date: Date) => void
  onSelectWeek: (date: Date) => void
}

export default function CalendarWidget({ config, onSelectDay, onSelectWeek }: CalendarWidgetProps) {
  const { pages, openTab } = useWorkspace()
  const { events, loadEvents } = useCalendar()
  const { user } = useAuth()

  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth()
  const todayD = today.getDate()

  const [viewYear, setViewYear] = useState(todayY)
  const [viewMonth, setViewMonth] = useState(todayM)
  const [showImport, setShowImport] = useState(false)
  const [showCalendarMenu, setShowCalendarMenu] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEventDate, setNewEventDate] = useState<Date | null>(null)
  const calendarMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) loadEvents(user.id)
  }, [user])

  useEffect(() => {
    if (!showCalendarMenu) return
    function closeMenu(e: MouseEvent) {
      if (!calendarMenuRef.current?.contains(e.target as Node)) setShowCalendarMenu(false)
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowCalendarMenu(false)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showCalendarMenu])

  function openNewEvent(date = today) {
    setNewEventDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    setShowNewEvent(true)
    setShowCalendarMenu(false)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function goToday() { setViewMonth(todayM); setViewYear(todayY) }

  function pagesForDay(day: number) {
    return Object.values(pages).filter(p => {
      const d = new Date(p.createdAt)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day
    })
  }

  function eventsForDay(day: number) {
    return events.filter(e => {
      const d = new Date(e.start)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day
    })
  }

  const weekOffset = config.weekStartsOn === 'monday' ? 1 : 0
  const calDays = weekOffset === 1
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : DAYS
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate()
  const calFirstDay = (new Date(viewYear, viewMonth, 1).getDay() - weekOffset + 7) % 7
  const calCells: { day: number; curr: boolean; dow: number }[] = []
  for (let i = calFirstDay - 1; i >= 0; i--) calCells.push({ day: daysInPrev - i, curr: false, dow: (weekOffset + calCells.length) % 7 })
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ day: d, curr: true, dow: (weekOffset + calCells.length) % 7 })
  while (calCells.length % 7 !== 0) calCells.push({ day: calCells.length - daysInMonth - calFirstDay + 1, curr: false, dow: (weekOffset + calCells.length) % 7 })

  const visibleDays = config.showWeekends ? calDays : calDays.filter(d => d !== 'Sat' && d !== 'Sun')
  const colCount = config.showWeekends ? 7 : 5

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">{MONTHS[viewMonth]} {viewYear}</h2>
            {(viewMonth !== todayM || viewYear !== todayY) && (
              <button onClick={goToday} className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[11px] text-accent transition-colors hover:bg-accent/30">
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative" ref={calendarMenuRef}>
              <button
                onClick={() => setShowCalendarMenu(v => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500 active:bg-blue-700"
                title="Calendar actions"
                aria-label="Calendar actions"
                aria-expanded={showCalendarMenu}
              >
                <Plus size={18} strokeWidth={2.6} />
              </button>
              {showCalendarMenu && (
                <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-surface-4 bg-surface-2 shadow-2xl">
                  <button
                    onClick={() => { setShowImport(true); setShowCalendarMenu(false) }}
                    className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-3"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-4 text-blue-300">
                      <CalendarDays size={15} />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">Import calendar</span>
                      <span className="block text-[11px] leading-snug text-gray-500">Google Calendar or .ics file</span>
                    </span>
                  </button>
                  <button
                    onClick={() => openNewEvent()}
                    className="flex w-full items-start gap-3 border-t border-surface-4/70 px-3 py-3 text-left transition-colors hover:bg-surface-3"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300">
                      <CalendarPlus size={15} />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">Create event</span>
                      <span className="block text-[11px] leading-snug text-gray-500">Add a new event for today</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button onClick={prevMonth} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-surface-3 hover:text-white">
              <ChevronLeft size={15} />
            </button>
            <button onClick={nextMonth} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-surface-3 hover:text-white">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="grid shrink-0 border-b border-surface-3" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
          {visibleDays.map(d => (
            <div key={d} className="py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-600">{d}</div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
          {calCells.filter(cell => {
            if (config.showWeekends) return true
            const dow = cell.dow % 7
            if (weekOffset === 1) return dow < 5
            return dow >= 1 && dow <= 5
          }).map((cell, i, arr) => {
            const isToday = cell.curr && cell.day === todayD && viewMonth === todayM && viewYear === todayY
            const dayPages = cell.curr ? pagesForDay(cell.day) : []
            const dayEvents = cell.curr ? eventsForDay(cell.day) : []
            const isLastRow = i >= arr.length - colCount
            const isLastCol = (i + 1) % colCount === 0

            return (
              <div
                key={i}
                onClick={() => cell.curr && onSelectWeek(new Date(viewYear, viewMonth, cell.day))}
                className={`relative min-h-0 overflow-hidden p-2 ${!isLastRow ? 'border-b border-surface-3' : ''} ${!isLastCol ? 'border-r border-surface-3' : ''} ${cell.curr ? 'cursor-pointer bg-surface-1 hover:bg-surface-2/50' : 'bg-surface-0/50'} group transition-colors`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isToday ? 'bg-accent font-bold text-white' : cell.curr ? 'text-gray-300 group-hover:bg-surface-3' : 'text-gray-700'
                  }`}>
                    {cell.day}
                  </span>
                  {cell.curr && (
                    <button
                      onClick={e => { e.stopPropagation(); openNewEvent(new Date(viewYear, viewMonth, cell.day)) }}
                      className="rounded p-0.5 text-gray-600 opacity-0 transition-all hover:bg-surface-4 hover:text-white group-hover:opacity-100"
                      title="New event"
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 4).map(ev => (
                    <button
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); setEditEvent(ev) }}
                      className="w-full truncate rounded px-1.5 py-1 text-left text-xs transition-opacity hover:opacity-80"
                      style={{ backgroundColor: `${ev.color}22`, color: ev.color }}
                      title={ev.title}
                    >
                      {(!ev.allDay && config.showEventTimes) ? `${new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ` : ''}
                      {ev.title}
                    </button>
                  ))}
                  {dayPages.slice(0, 2).map(p => (
                    <button
                      key={p.id}
                      onClick={() => openTab(p.id)}
                      className="w-full truncate rounded bg-accent/20 px-1.5 py-0.5 text-left text-xs text-accent transition-colors hover:bg-accent/30"
                    >
                      {p.icon} {p.title || 'Untitled'}
                    </button>
                  ))}
                  {(dayEvents.length + dayPages.length) > 6 && (
                    <p className="px-1 text-xs text-gray-600">+{dayEvents.length + dayPages.length - 6} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showImport && <CalendarImport onClose={() => setShowImport(false)} />}
      {editEvent && <EventModal event={editEvent} onClose={() => setEditEvent(null)} />}
      {showNewEvent && newEventDate && (
        <EventModal
          defaultDate={newEventDate}
          onClose={() => { setShowNewEvent(false); setNewEventDate(null) }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Wire up in `HomeScreen.tsx`**

Add import:
```tsx
import CalendarWidget from './widgets/CalendarWidget'
```

In `renderWidget`, replace:
```tsx
// Replace:
if (widget.type === 'calendar') return renderCalendarWidget()
// With:
if (widget.type === 'calendar') return (
  <CalendarWidget
    config={getWidgetSettings('calendar', widgetSettings)}
    onSelectDay={setSelectedDay}
    onSelectWeek={setSelectedWeek}
  />
)
```

Delete from `HomeScreen.tsx`:
- `renderCalendarWidget()` function body
- `viewYear`, `viewMonth` state
- `showImport`, `showCalendarMenu`, `editEvent`, `showNewEvent`, `newEventDate` state
- `calendarMenuRef` ref
- `prevMonth`, `nextMonth`, `goToday`, `openNewEvent`, `handleDayClick`, `pagesForDay`, `eventsForDay` functions
- The `cells` calendar grid computation block
- `firstDay`, `daysInMonth`, `daysInPrev` derived values
- `useCalendar()` hook call and import (if `events` / `loadEvents` are no longer used in HomeScreen)
- `CalendarImport`, `EventModal` imports from HomeScreen (they moved to CalendarWidget)
- Lucide: `CalendarDays`, `CalendarPlus`, `ChevronLeft`, `ChevronRight`
- `DAYS`, `MONTHS` constants (if only used by CalendarWidget)
- `showImport && <CalendarImport>` and event modal JSX at bottom of return

- [ ] **Step 3: Run tests and manual smoke test**

```bash
npm test
```
Expected: all tests pass.

Open dev server. Full calendar smoke test:
- Calendar renders month grid
- Prev/next month navigation works
- Today button appears when off current month
- Click a day opens WeekView
- Create event from menu and from day cell
- Import calendar opens import dialog
- Weekend toggle (via settings) hides Sat/Sun columns
- Edit mode still shows resize handles on calendar widget

- [ ] **Step 4: Final HomeScreen cleanup**

At this point `HomeScreen.tsx` should be ~160 lines. Do a final pass:
- Remove any remaining unused imports (check TypeScript errors or use your editor's "unused imports" warning)
- Verify the file has no dead code

Check line count:
```bash
wc -l src/components/HomeScreen.tsx
```
Expected: ~160 lines (±20).

- [ ] **Step 5: Run full tests one final time**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/widgets/CalendarWidget.tsx src/components/HomeScreen.tsx
git commit -m "refactor: extract CalendarWidget — HomeScreen is now a thin orchestrator"
```
