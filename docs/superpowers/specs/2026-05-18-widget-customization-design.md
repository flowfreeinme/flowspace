# Widget Customization Design

**Date:** 2026-05-18  
**Status:** Approved  

## Goal

Add per-widget settings to all 8 home center widgets. Each widget gets a gear icon that opens a floating settings popover with options specific to that widget. Settings persist alongside the home center layout.

---

## Settings Per Widget

### Today
- Custom greeting text (string, default: "Good morning")
- Date format: "Weekday, Month Day" | "Month Day, Year" | "MM/DD/YYYY"
- Show/hide: clock, next event, weather summary, pages created today

### Focus Queue
- Custom widget title (string, default: "Focus Queue")
- Item count: 3–8 (default: 3)
- Filter: pages only | boards only | both
- Pinned item IDs: up to 3 pages/boards always shown at top

### Recent Work
- Custom widget title (string, default: "Recent Work")
- Item count: 3–10 (default: 5)
- Filter: pages only | boards only | both
- Sort by: last opened | last modified
- Excluded folder IDs (multi-select from workspace folders)

### Quick Capture
- Per-button toggle: Board on/off, Page on/off, Event on/off
- Per-button custom label (string, max 12 chars)
- Button order: drag-to-reorder (stored as ordered array of button IDs)

### AI Day Planner
- Work start time (time string, default: "09:00")
- Work end time (time string, default: "17:00")
- Focus style: "deep work" | "meetings" | "balanced" (default: "balanced")
- Custom instructions (textarea, max 200 chars, e.g. "Prioritize creative work in the morning")
- Calendar inclusion: array of calendar IDs to include (default: all)
- Refresh mode: "manual" | "auto" (default: "manual")
- Auto-refresh time (time string, only used when mode is "auto", default: "08:00")

### Focus Timer
- Custom presets: ordered array of `{ label: string, minutes: number }`, 1–6 presets (default: 15/25/45/90)
- Break timer: on/off (default: off)
- Break duration: 5 | 10 | 15 minutes (default: 5)
- Auto-start next session: on/off (default: off)
- Completion sound: "off" | "chime" | "bell" (default: "chime")
- Daily session goal: 0 (disabled) | 2 | 4 | 6 | 8 sessions (default: 0)

### Weather
- Temperature unit: "F" | "C" (default: "F")
- Show/hide: humidity, wind speed, precipitation, UV index, feels-like, sunrise/sunset
- Forecast days: 1 | 3 (default: 1)

### Calendar
- Week starts on: "sunday" | "monday" (default: "sunday")
- Show weekends: on/off (default: on)
- Visible calendar IDs: array (default: all)
- Show event times: on/off (default: on)

---

## Data Shape

### Type definitions (`src/types/widgetSettings.ts`)

One interface per widget, plus a discriminated union:

```ts
export interface TodayConfig {
  greeting: string
  dateFormat: 'weekday-month-day' | 'month-day-year' | 'mm-dd-yyyy'
  showClock: boolean
  showNextEvent: boolean
  showWeatherSummary: boolean
  showPagesCreatedToday: boolean
}

export interface FocusQueueConfig {
  title: string
  itemCount: number           // 3–8
  filter: 'all' | 'pages' | 'boards'
  pinnedIds: string[]         // up to 3
}

export interface RecentWorkConfig {
  title: string
  itemCount: number           // 3–10
  filter: 'all' | 'pages' | 'boards'
  sortBy: 'lastOpened' | 'lastModified'
  excludedFolderIds: string[]
}

export interface QuickCaptureButton {
  id: 'board' | 'page' | 'event'
  label: string
  enabled: boolean
}

export interface QuickCaptureConfig {
  buttons: QuickCaptureButton[]   // ordered array
}

export interface ProPlannerConfig {
  workStart: string               // "HH:MM"
  workEnd: string                 // "HH:MM"
  focusStyle: 'deep-work' | 'meetings' | 'balanced'
  customInstructions: string      // max 200 chars
  includedCalendarIds: string[]   // empty = all
  refreshMode: 'manual' | 'auto'
  autoRefreshTime: string         // "HH:MM", only used when refreshMode = 'auto'
}

export interface FocusTimerPreset {
  label: string
  minutes: number
}

export interface FocusTimerConfig {
  presets: FocusTimerPreset[]     // 1–6 items
  breakEnabled: boolean
  breakMinutes: 5 | 10 | 15
  autoStart: boolean
  completionSound: 'off' | 'chime' | 'bell'
  dailyGoal: 0 | 2 | 4 | 6 | 8
}

export interface WeatherConfig {
  unit: 'F' | 'C'
  showHumidity: boolean
  showWind: boolean
  showPrecipitation: boolean
  showUvIndex: boolean
  showFeelsLike: boolean
  showSunriseSunset: boolean
  forecastDays: 1 | 3
}

export interface CalendarConfig {
  weekStartsOn: 'sunday' | 'monday'
  showWeekends: boolean
  visibleCalendarIds: string[]    // empty = all
  showEventTimes: boolean
}

export type WidgetConfig =
  | TodayConfig
  | FocusQueueConfig
  | RecentWorkConfig
  | QuickCaptureConfig
  | ProPlannerConfig
  | FocusTimerConfig
  | WeatherConfig
  | CalendarConfig
```

### Store shape (`src/types/index.ts`)

```ts
// Add to HomeCenterConfig:
widgetSettings: Partial<Record<HomeWidgetType, WidgetConfig>>
```

Missing entries fall back to defaults from `src/lib/widgetDefaults.ts`.

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/types/widgetSettings.ts` | All 8 config interfaces + WidgetConfig union |
| `src/lib/widgetDefaults.ts` | Default config object per widget type |
| `src/components/widgets/settings/WidgetSettingsPopover.tsx` | Shared gear icon + floating popover wrapper |
| `src/components/widgets/settings/TodaySettings.tsx` | Today settings form |
| `src/components/widgets/settings/FocusQueueSettings.tsx` | Focus Queue settings form |
| `src/components/widgets/settings/RecentWorkSettings.tsx` | Recent Work settings form |
| `src/components/widgets/settings/QuickCaptureSettings.tsx` | Quick Capture settings form (with reorder) |
| `src/components/widgets/settings/ProPlannerSettings.tsx` | AI Day Planner settings form |
| `src/components/widgets/settings/FocusTimerSettings.tsx` | Focus Timer settings form (with preset editor) |
| `src/components/widgets/settings/WeatherSettings.tsx` | Weather settings form |
| `src/components/widgets/settings/CalendarSettings.tsx` | Calendar settings form |

### Changed files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `widgetSettings` to `HomeCenterConfig` |
| `src/lib/homeCenter.ts` | `getWidgetSettings<T>(type)` helper (merges stored config with defaults) |
| `src/stores/workspace.ts` | Add `updateWidgetSettings(type, patch)` — shallow-merges patch, debounce-persists |
| `src/components/HomeScreen.tsx` | Gear icon per widget on hover (always in edit mode); `openSettingsWidget` state; pass resolved config to each widget renderer |

---

## UI Behavior

**Gear icon:** Appears on widget hover via CSS opacity transition. Always visible in edit mode. Positioned top-right of each widget, inside the widget bounds (not overlapping resize handles).

**Popover:** Floating panel anchored to the gear icon, `position: fixed`, 280px wide, `z-index` above widgets. Closes on outside click or Escape. Only one popover open at a time.

**Immediate apply:** Changes take effect as the user interacts (toggle flips, input blurs). No save button. `updateWidgetSettings` debounces persist at 400ms.

**Settings form style:** Matches existing dark theme — same tokens as workflow block popover. Toggle switches for boolean options, segmented controls for short enums, number inputs with min/max, text inputs with char limits.

---

## Persistence

`widgetSettings` is stored inside `HomeCenterConfig` in the workspace state, alongside `widgets` (layout). Same Supabase + localStorage persist path as existing layout. Migration: existing configs without `widgetSettings` default to `{}` (all defaults apply).

---

## Implementation Notes

**Weather location** is already stored in `localStorage` via `WEATHER_LOCATION_STORAGE_KEY` and managed by the existing location search UI inside the weather widget. It is not moved into `widgetSettings` — it stays as-is.

**FocusTimer preset migration:** The existing `FOCUS_TIMER_PRESETS` constant (15/25/45/90) becomes the default value in `widgetDefaults.ts` for `FocusTimerConfig.presets`. Users who have never customized presets see the same presets as before. The hardcoded constant is removed once settings are wired.

**Picker UI for IDs (Focus Queue pinned items, Recent Work excluded folders, AI Planner calendars, Calendar visible calendars):** Each of these renders as a searchable multi-select within the settings popover, populated from the live workspace state. No separate modal — the list renders inline in the popover with checkboxes or a compact tag picker.

---

## Out of Scope

- Per-widget color/theme overrides (visual styling)
- Widget-level notifications or reminders
- Import/export of widget configs
- Sharing configs across devices (already handled by Supabase sync)
