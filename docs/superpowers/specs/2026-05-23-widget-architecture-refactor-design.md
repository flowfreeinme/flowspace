# HomeScreen Widget Architecture Refactor

**Date:** 2026-05-23  
**Scope:** Refactor only — zero behavior changes  
**Follow-on specs:** unimplemented-config-options, drag-to-reposition, new-widgets

---

## Problem

`HomeScreen.tsx` is 1,245 lines. It contains 8 inline widget render functions, ~25 `useState` hooks, ~8 `useEffect` hooks, and three inline components (`WidgetShell`, `WidgetControls`, `WidgetResizeHandles`). Widget-specific state (weather loading, day plan, calendar view month) is tangled with grid/orchestration state (edit mode, resize drag). This makes widget-specific bugs hard to isolate and new widget features risky to add.

## Goal

Extract each widget into a fully self-contained React component with its own state, effects, and fetches. `HomeScreen.tsx` becomes a thin grid orchestrator (~200 lines). Each widget lives in its own file and can be changed, debugged, or extended without touching any other widget.

---

## New File Structure

```
src/components/widgets/
  WidgetShell.tsx           ← extracted from inline components in HomeScreen
  CalendarWidget.tsx        ← was renderCalendarWidget()
  TodayWidget.tsx           ← was renderTodayWidget()
  FocusQueueWidget.tsx      ← was renderFocusWidget()
  RecentWorkWidget.tsx      ← was renderRecentWidget()
  QuickCaptureWidget.tsx    ← was renderQuickCaptureWidget()
  ProPlannerWidget.tsx      ← was renderProPlannerWidget()
  FocusTimerWidget.tsx      ← was renderFocusTimerWidget()
  WeatherWidget.tsx         ← was renderWeatherWidget()
  settings/                 ← unchanged
    CalendarSettings.tsx
    FocusQueueSettings.tsx
    FocusTimerSettings.tsx
    ProPlannerSettings.tsx
    QuickCaptureSettings.tsx
    RecentWorkSettings.tsx
    TodaySettings.tsx
    WeatherSettings.tsx
    WidgetSettingsPopover.tsx
```

---

## HomeScreen After Refactor

### Retains
- `editingHome`, `openSettingsWidget`, `widgetResizeDrag`, `activeResizeWidgetId` state
- Resize drag pointer event handlers (window-level `pointermove`/`pointerup`)
- `selectedDay`, `selectedWeek` state + early-return rendering of `DayView` / `WeekView`
- Header (greeting text + large live clock with `now` interval)
- Edit mode toolbar (widget catalog add buttons, Reset, Done)
- 12×12 CSS grid loop: renders `<WidgetShell>` + widget component per entry in `widgets`
- `renderSettingsForm(widget)` dispatch → imports settings form components
- `renderWidget(widget)` dispatch → imports widget components

### Removes
All of the following move into their respective widget files:
- Weather state: `weatherLocation`, `weather`, `weatherLoading`, `weatherError`, `weatherQuery`, `weatherLocating`
- Day plan state: `dayPlan`, `dayPlanLoading`, `dayPlanError`
- Calendar view state: `viewYear`, `viewMonth`, `showCalendarMenu`, `showImport`, `editEvent`, `showNewEvent`, `newEventDate`
- Helper functions: `loadSavedWeatherLocation`, `saveWeatherLocation`, `detectWeatherLocation`, `searchWeatherLocation`, `generateDayPlan`, `prevMonth`, `nextMonth`, `goToday`, `pagesForDay`, `eventsForDay`, `openNewEvent`, `handleDayClick`

---

## WidgetShell Interface

`WidgetShell` is extracted to `widgets/WidgetShell.tsx`. It wraps widget content and provides grid positioning, edit-mode styling, resize handles, and the settings gear + remove button. `WidgetControls` and `WidgetResizeHandles` remain as internal components within `WidgetShell.tsx`.

```ts
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
```

---

## Widget Props

Each widget receives only its config. Stores are read directly inside each component.

```ts
// No local state — read workspace store directly
function FocusQueueWidget({ config }: { config: FocusQueueConfig })
function RecentWorkWidget({ config }: { config: RecentWorkConfig })
function QuickCaptureWidget({ config }: { config: QuickCaptureConfig })
function FocusTimerWidget({ config }: { config: FocusTimerConfig })

// Minimal local state (own clock interval)
function TodayWidget({ config }: { config: TodayConfig })

// Significant local state
function WeatherWidget({ config }: { config: WeatherConfig })
function ProPlannerWidget({ config }: { config: ProPlannerConfig })

// Local state + navigation callbacks (fullscreen DayView/WeekView live in HomeScreen)
function CalendarWidget({
  config,
  onSelectDay,
  onSelectWeek,
}: {
  config: CalendarConfig
  onSelectDay: (date: Date) => void
  onSelectWeek: (date: Date) => void
})
```

`CalendarWidget` needs `onSelectDay` / `onSelectWeek` because clicking a calendar day replaces the entire HomeScreen with `DayView` or `WeekView` — a screen-level transition that must remain in `HomeScreen`.

---

## State Ownership Map

| State | Before | After |
|---|---|---|
| `weatherLocation`, `weather`, loading, error, query, locating | HomeScreen | WeatherWidget |
| `dayPlan`, `dayPlanLoading`, `dayPlanError` | HomeScreen | ProPlannerWidget |
| `viewYear`, `viewMonth` | HomeScreen | CalendarWidget |
| `showCalendarMenu`, `showImport` | HomeScreen | CalendarWidget |
| `editEvent`, `showNewEvent`, `newEventDate` | HomeScreen | CalendarWidget |
| `editingHome` | HomeScreen | HomeScreen (stays) |
| `openSettingsWidget` | HomeScreen | HomeScreen (stays) |
| `widgetResizeDrag`, `activeResizeWidgetId` | HomeScreen | HomeScreen (stays) |
| `selectedDay`, `selectedWeek` | HomeScreen | HomeScreen (stays) |
| `now` (header clock) | HomeScreen | HomeScreen (stays); TodayWidget gets its own |

---

## Migration Order

Each step is one commit. After each step the home screen must be manually verified to look and function identically.

1. **Extract `WidgetShell`** — move `WidgetShell`, `WidgetControls`, `WidgetResizeHandles` to `widgets/WidgetShell.tsx`. Update HomeScreen to import it. No behavior change.

2. **Extract stateless widgets** — `FocusQueueWidget`, `RecentWorkWidget`, `QuickCaptureWidget`. These have no local state; just move the render body and store reads into new files.

3. **Extract `TodayWidget`** — moves its own `now` clock interval (1-second `setInterval`) into the component.

4. **Extract `FocusTimerWidget`** — reads from `focusTimer` store; no local state to move.

5. **Extract `WeatherWidget`** — moves weather state, `loadSavedWeatherLocation`/`saveWeatherLocation`, `detectWeatherLocation`, `searchWeatherLocation`, and the two weather `useEffect` hooks.

6. **Extract `ProPlannerWidget`** — moves `dayPlan` state, `generateDayPlan`, and the AI fetch logic.

7. **Extract `CalendarWidget`** — moves calendar view state, all calendar helper functions, `CalendarImport`, `EventModal`, and the calendar menu. Adds `onSelectDay`/`onSelectWeek` callback props.

After step 7, `HomeScreen.tsx` is ~200 lines with zero widget business logic.

---

## Behavior Contract

This is a pure refactor. No visual or functional changes. Each migration step should pass a manual smoke test:

- Home screen renders correctly
- Affected widget displays data and responds to interaction
- Edit mode (resize, remove, settings gear) works on all widgets
- Mobile layout unchanged

---

## What This Enables

| Follow-on work | Why this unblocks it |
|---|---|
| Unimplemented config options (spec B) | Each widget is now independently editable |
| Drag-to-reposition (spec C) | HomeScreen is simple enough to add pointer drag logic cleanly |
| New widget types (spec D) | Adding a widget = one new file + one line in `renderWidget()` |
