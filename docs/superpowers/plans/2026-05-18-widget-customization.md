# Widget Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-widget settings to all 8 home center widgets via a gear icon that opens a floating popover with widget-specific options, persisted alongside the home center layout.

**Architecture:** Settings are stored as `widgetSettings: Partial<Record<HomeWidgetType, WidgetConfig>>` inside `HomeCenterConfig` (extending the existing layout persist path). A shared `WidgetSettingsPopover` component wraps each widget's settings form. The `HomeScreen` resolves each widget's config by merging stored settings with defaults before passing them to widget renderers.

**Tech Stack:** React + TypeScript, Zustand (`useWorkspace`), Tailwind CSS (matching existing dark theme), Vitest for unit tests.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/types/widgetSettings.ts` | All 8 config interfaces + `WidgetConfig` union |
| Create | `src/lib/widgetDefaults.ts` | Default config object per widget type |
| Modify | `src/types/index.ts` | Add `widgetSettings` to `HomeCenterConfig` |
| Modify | `src/lib/homeCenter.ts` | Add `getWidgetSettings<T>()` helper |
| Modify | `src/stores/workspace.ts` | Add `updateWidgetSettings()` action |
| Create | `src/components/widgets/settings/WidgetSettingsPopover.tsx` | Gear icon + floating popover wrapper |
| Create | `src/components/widgets/settings/TodaySettings.tsx` | Today settings form |
| Create | `src/components/widgets/settings/FocusQueueSettings.tsx` | Focus Queue settings form |
| Create | `src/components/widgets/settings/RecentWorkSettings.tsx` | Recent Work settings form |
| Create | `src/components/widgets/settings/QuickCaptureSettings.tsx` | Quick Capture settings form with reorder |
| Create | `src/components/widgets/settings/ProPlannerSettings.tsx` | AI Day Planner settings form |
| Create | `src/components/widgets/settings/WeatherSettings.tsx` | Weather settings form |
| Create | `src/components/widgets/settings/CalendarSettings.tsx` | Calendar settings form |
| Create | `src/components/widgets/settings/FocusTimerSettings.tsx` | Focus Timer settings form with preset editor |
| Modify | `src/components/HomeScreen.tsx` | Gear icon per widget, settings state, pass configs to renderers |

---

## Task 1: Types, defaults, and store foundation

**Files:**
- Create: `src/types/widgetSettings.ts`
- Create: `src/lib/widgetDefaults.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/homeCenter.ts`
- Modify: `src/stores/workspace.ts`

- [ ] **Step 1: Write failing tests for `getWidgetSettings`**

Create `src/lib/widgetDefaults.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getWidgetSettings } from './homeCenter'
import { DEFAULT_WIDGET_SETTINGS } from './widgetDefaults'
import type { WeatherConfig, TodayConfig } from '@/types/widgetSettings'

describe('getWidgetSettings', () => {
  it('returns full defaults when widgetSettings is undefined', () => {
    const result = getWidgetSettings<WeatherConfig>('weather', undefined)
    expect(result.unit).toBe('F')
    expect(result.showHumidity).toBe(true)
  })

  it('merges stored partial config over defaults', () => {
    const stored = { unit: 'C' as const }
    const result = getWidgetSettings<WeatherConfig>('weather', { weather: stored })
    expect(result.unit).toBe('C')
    expect(result.showHumidity).toBe(true) // default preserved
  })

  it('returns today defaults with correct greeting', () => {
    const result = getWidgetSettings<TodayConfig>('today', undefined)
    expect(result.greeting).toBe('Good morning')
    expect(result.showClock).toBe(true)
  })

  it('returns stored config when full config provided', () => {
    const full = { ...DEFAULT_WIDGET_SETTINGS.today, greeting: 'Yo' }
    const result = getWidgetSettings<TodayConfig>('today', { today: full })
    expect(result.greeting).toBe('Yo')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/michael/flowspace && npm test -- widgetDefaults
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create `src/types/widgetSettings.ts`**

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
  itemCount: number
  filter: 'all' | 'pages' | 'boards'
  pinnedIds: string[]
}

export interface RecentWorkConfig {
  title: string
  itemCount: number
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
  buttons: QuickCaptureButton[]
}

export interface ProPlannerConfig {
  workStart: string
  workEnd: string
  focusStyle: 'deep-work' | 'meetings' | 'balanced'
  customInstructions: string
  includedCalendarIds: string[]
  refreshMode: 'manual' | 'auto'
  autoRefreshTime: string
}

export interface FocusTimerPreset {
  label: string
  minutes: number
}

export interface FocusTimerConfig {
  presets: FocusTimerPreset[]
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
  visibleCalendarIds: string[]
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

- [ ] **Step 4: Create `src/lib/widgetDefaults.ts`**

```ts
import type {
  TodayConfig, FocusQueueConfig, RecentWorkConfig, QuickCaptureConfig,
  ProPlannerConfig, FocusTimerConfig, WeatherConfig, CalendarConfig,
} from '@/types/widgetSettings'
import type { HomeWidgetType } from '@/types'

export const DEFAULT_WIDGET_SETTINGS: Record<HomeWidgetType, object> = {
  calendar: {
    weekStartsOn: 'sunday',
    showWeekends: true,
    visibleCalendarIds: [],
    showEventTimes: true,
  } satisfies CalendarConfig,

  today: {
    greeting: 'Good morning',
    dateFormat: 'weekday-month-day',
    showClock: true,
    showNextEvent: true,
    showWeatherSummary: false,
    showPagesCreatedToday: true,
  } satisfies TodayConfig,

  focus: {
    title: 'Focus Queue',
    itemCount: 3,
    filter: 'all',
    pinnedIds: [],
  } satisfies FocusQueueConfig,

  recent: {
    title: 'Recent Work',
    itemCount: 5,
    filter: 'all',
    sortBy: 'lastOpened',
    excludedFolderIds: [],
  } satisfies RecentWorkConfig,

  quickCapture: {
    buttons: [
      { id: 'board', label: 'Board', enabled: true },
      { id: 'page', label: 'Page', enabled: true },
      { id: 'event', label: 'Event', enabled: true },
    ],
  } satisfies QuickCaptureConfig,

  proPlanner: {
    workStart: '09:00',
    workEnd: '17:00',
    focusStyle: 'balanced',
    customInstructions: '',
    includedCalendarIds: [],
    refreshMode: 'manual',
    autoRefreshTime: '08:00',
  } satisfies ProPlannerConfig,

  focusTimer: {
    presets: [
      { label: '25m', minutes: 25 },
      { label: '50m', minutes: 50 },
      { label: '90m', minutes: 90 },
    ],
    breakEnabled: false,
    breakMinutes: 5,
    autoStart: false,
    completionSound: 'chime',
    dailyGoal: 0,
  } satisfies FocusTimerConfig,

  weather: {
    unit: 'F',
    showHumidity: true,
    showWind: true,
    showPrecipitation: true,
    showUvIndex: false,
    showFeelsLike: true,
    showSunriseSunset: false,
    forecastDays: 1,
  } satisfies WeatherConfig,
}
```

- [ ] **Step 5: Add `widgetSettings` to `HomeCenterConfig` in `src/types/index.ts`**

Find `HomeCenterConfig`:
```ts
export interface HomeCenterConfig {
  widgets: HomeWidget[]
}
```

Change to:
```ts
export interface HomeCenterConfig {
  widgets: HomeWidget[]
  widgetSettings?: Partial<Record<HomeWidgetType, object>>
}
```

- [ ] **Step 6: Add `getWidgetSettings` to `src/lib/homeCenter.ts`**

Add after the existing imports at the top of the file:
```ts
import { DEFAULT_WIDGET_SETTINGS } from './widgetDefaults'
```

Add at the end of the file:
```ts
export function getWidgetSettings<T extends object>(
  type: HomeWidgetType,
  stored: Partial<Record<HomeWidgetType, object>> | undefined,
): T {
  const defaults = DEFAULT_WIDGET_SETTINGS[type] as T
  const override = stored?.[type] as Partial<T> | undefined
  if (!override) return defaults
  return { ...defaults, ...override }
}
```

- [ ] **Step 7: Add `updateWidgetSettings` to `src/stores/workspace.ts`**

In the store interface (where `updateHomeWidgets`, `addHomeCenterWidget`, etc. are declared), add:
```ts
updateWidgetSettings: (type: HomeWidgetType, patch: Partial<object>) => void
```

In the store implementation (near `addHomeCenterWidget` around line 499), add:
```ts
updateWidgetSettings(type, patch) {
  set(s => {
    const hc = s.homeCenter ?? { widgets: [] }
    const current = hc.widgetSettings?.[type] ?? {}
    return {
      homeCenter: {
        ...hc,
        widgetSettings: {
          ...hc.widgetSettings,
          [type]: { ...current, ...patch },
        },
      },
    }
  })
  useWorkspace.getState().persist()
},
```

Also add the import for `HomeWidgetType` if not already present at the top of `workspace.ts`:
```ts
import type { HomeWidget, HomeWidgetType, HomeCenterConfig } from '@/types'
```

- [ ] **Step 8: Run tests**

```bash
cd /Users/michael/flowspace && npm test -- widgetDefaults
```

Expected: 4 tests PASS

- [ ] **Step 9: Verify TypeScript**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
cd /Users/michael/flowspace && git add src/types/widgetSettings.ts src/lib/widgetDefaults.ts src/lib/widgetDefaults.test.ts src/types/index.ts src/lib/homeCenter.ts src/stores/workspace.ts && git commit -m "feat: add widget settings types, defaults, and store action"
```

---

## Task 2: WidgetSettingsPopover shared component

**Files:**
- Create: `src/components/widgets/settings/WidgetSettingsPopover.tsx`

- [ ] **Step 1: Create `src/components/widgets/settings/WidgetSettingsPopover.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { Settings } from 'lucide-react'

interface WidgetSettingsPopoverProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  children: React.ReactNode
}

export default function WidgetSettingsPopover({
  open, onOpen, onClose, children,
}: WidgetSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div className="relative" data-home-widget-edit-control="true">
      <button
        ref={buttonRef}
        onClick={e => { e.stopPropagation(); open ? onClose() : onOpen() }}
        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 opacity-0 transition-opacity hover:bg-surface-3 hover:text-gray-300 group-hover/widget:opacity-100"
        title="Widget settings"
        aria-label="Widget settings"
      >
        <Settings size={13} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-surface-4 bg-surface-2 p-3 shadow-2xl"
          data-home-widget-edit-control="true"
          onPointerDown={e => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/widgets/settings/WidgetSettingsPopover.tsx && git commit -m "feat: add WidgetSettingsPopover shared component"
```

---

## Task 3: Today, Focus Queue, and Recent Work settings forms

**Files:**
- Create: `src/components/widgets/settings/TodaySettings.tsx`
- Create: `src/components/widgets/settings/FocusQueueSettings.tsx`
- Create: `src/components/widgets/settings/RecentWorkSettings.tsx`

- [ ] **Step 1: Create `src/components/widgets/settings/TodaySettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { TodayConfig } from '@/types/widgetSettings'

interface TodaySettingsProps { config: TodayConfig }

export default function TodaySettings({ config }: TodaySettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<TodayConfig>) => updateWidgetSettings('today', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Today</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Greeting</label>
        <input
          defaultValue={config.greeting}
          onBlur={e => patch({ greeting: e.target.value })}
          maxLength={40}
          className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
          placeholder="Good morning"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Date format</label>
        <select
          value={config.dateFormat}
          onChange={e => patch({ dateFormat: e.target.value as TodayConfig['dateFormat'] })}
          className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none"
        >
          <option value="weekday-month-day">Wednesday, May 18</option>
          <option value="month-day-year">May 18, 2026</option>
          <option value="mm-dd-yyyy">05/18/2026</option>
        </select>
      </div>

      {([
        ['showClock', 'Show clock'],
        ['showNextEvent', 'Show next event'],
        ['showWeatherSummary', 'Show weather summary'],
        ['showPagesCreatedToday', 'Show pages created today'],
      ] as [keyof TodayConfig, string][]).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between text-xs text-gray-300">
          {label}
          <input
            type="checkbox"
            checked={config[key] as boolean}
            onChange={e => patch({ [key]: e.target.checked })}
            className="accent-accent"
          />
        </label>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/widgets/settings/FocusQueueSettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { FocusQueueConfig } from '@/types/widgetSettings'

interface FocusQueueSettingsProps { config: FocusQueueConfig }

export default function FocusQueueSettings({ config }: FocusQueueSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<FocusQueueConfig>) => updateWidgetSettings('focus', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Focus Queue</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Widget title</label>
        <input
          defaultValue={config.title}
          onBlur={e => patch({ title: e.target.value })}
          maxLength={30}
          className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Items shown: {config.itemCount}</label>
        <input
          type="range" min={3} max={8} value={config.itemCount}
          onChange={e => patch({ itemCount: Number(e.target.value) })}
          className="w-full accent-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Show</label>
        <div className="flex gap-2">
          {(['all', 'pages', 'boards'] as const).map(v => (
            <button
              key={v}
              onClick={() => patch({ filter: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors ${config.filter === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/widgets/settings/RecentWorkSettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { RecentWorkConfig } from '@/types/widgetSettings'

interface RecentWorkSettingsProps { config: RecentWorkConfig }

export default function RecentWorkSettings({ config }: RecentWorkSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<RecentWorkConfig>) => updateWidgetSettings('recent', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Recent Work</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Widget title</label>
        <input
          defaultValue={config.title}
          onBlur={e => patch({ title: e.target.value })}
          maxLength={30}
          className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Items shown: {config.itemCount}</label>
        <input
          type="range" min={3} max={10} value={config.itemCount}
          onChange={e => patch({ itemCount: Number(e.target.value) })}
          className="w-full accent-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Show</label>
        <div className="flex gap-2">
          {(['all', 'pages', 'boards'] as const).map(v => (
            <button key={v} onClick={() => patch({ filter: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors ${config.filter === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Sort by</label>
        <div className="flex gap-2">
          {([['lastOpened', 'Last opened'], ['lastModified', 'Last modified']] as const).map(([v, label]) => (
            <button key={v} onClick={() => patch({ sortBy: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.sortBy === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/widgets/settings/TodaySettings.tsx src/components/widgets/settings/FocusQueueSettings.tsx src/components/widgets/settings/RecentWorkSettings.tsx && git commit -m "feat: add Today, FocusQueue, and RecentWork settings forms"
```

---

## Task 4: Quick Capture, Pro Planner, Weather, and Calendar settings forms

**Files:**
- Create: `src/components/widgets/settings/QuickCaptureSettings.tsx`
- Create: `src/components/widgets/settings/ProPlannerSettings.tsx`
- Create: `src/components/widgets/settings/WeatherSettings.tsx`
- Create: `src/components/widgets/settings/CalendarSettings.tsx`

- [ ] **Step 1: Create `src/components/widgets/settings/QuickCaptureSettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { QuickCaptureConfig, QuickCaptureButton } from '@/types/widgetSettings'

interface QuickCaptureSettingsProps { config: QuickCaptureConfig }

export default function QuickCaptureSettings({ config }: QuickCaptureSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<QuickCaptureConfig>) => updateWidgetSettings('quickCapture', p)

  function toggleButton(id: QuickCaptureButton['id']) {
    patch({ buttons: config.buttons.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b) })
  }

  function renameButton(id: QuickCaptureButton['id'], label: string) {
    patch({ buttons: config.buttons.map(b => b.id === id ? { ...b, label } : b) })
  }

  function moveButton(index: number, dir: -1 | 1) {
    const next = [...config.buttons]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    patch({ buttons: next })
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Quick Capture</p>
      <p className="text-[11px] text-gray-500">Toggle, rename, or reorder buttons.</p>

      <div className="space-y-2">
        {config.buttons.map((btn, i) => (
          <div key={btn.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={btn.enabled}
              onChange={() => toggleButton(btn.id)}
              className="accent-accent shrink-0"
            />
            <input
              defaultValue={btn.label}
              onBlur={e => renameButton(btn.id, e.target.value || btn.id)}
              maxLength={12}
              className="min-w-0 flex-1 rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
            />
            <button onClick={() => moveButton(i, -1)} disabled={i === 0}
              className="text-gray-600 hover:text-gray-300 disabled:opacity-30 text-xs">↑</button>
            <button onClick={() => moveButton(i, 1)} disabled={i === config.buttons.length - 1}
              className="text-gray-600 hover:text-gray-300 disabled:opacity-30 text-xs">↓</button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/widgets/settings/ProPlannerSettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { ProPlannerConfig } from '@/types/widgetSettings'

interface ProPlannerSettingsProps { config: ProPlannerConfig }

export default function ProPlannerSettings({ config }: ProPlannerSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<ProPlannerConfig>) => updateWidgetSettings('proPlanner', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">AI Day Planner</p>

      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-gray-400">Work start</label>
          <input type="time" defaultValue={config.workStart}
            onBlur={e => patch({ workStart: e.target.value })}
            className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none colorScheme-dark" />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-gray-400">Work end</label>
          <input type="time" defaultValue={config.workEnd}
            onBlur={e => patch({ workEnd: e.target.value })}
            className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none colorScheme-dark" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Focus style</label>
        <div className="flex gap-1">
          {([['deep-work', 'Deep work'], ['meetings', 'Meetings'], ['balanced', 'Balanced']] as const).map(([v, label]) => (
            <button key={v} onClick={() => patch({ focusStyle: v })}
              className={`flex-1 rounded-md border px-1.5 py-1 text-[11px] transition-colors ${config.focusStyle === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Custom instructions <span className="text-gray-600">({config.customInstructions.length}/200)</span></label>
        <textarea
          defaultValue={config.customInstructions}
          onBlur={e => patch({ customInstructions: e.target.value.slice(0, 200) })}
          rows={3} maxLength={200} placeholder="Prioritize creative work in the morning…"
          className="w-full resize-none rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Refresh</label>
        <div className="flex gap-2 items-center">
          {(['manual', 'auto'] as const).map(v => (
            <button key={v} onClick={() => patch({ refreshMode: v })}
              className={`rounded-md border px-2 py-1 text-xs capitalize transition-colors ${config.refreshMode === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v}
            </button>
          ))}
          {config.refreshMode === 'auto' && (
            <input type="time" defaultValue={config.autoRefreshTime}
              onBlur={e => patch({ autoRefreshTime: e.target.value })}
              className="rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none" />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/widgets/settings/WeatherSettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { WeatherConfig } from '@/types/widgetSettings'

interface WeatherSettingsProps { config: WeatherConfig }

export default function WeatherSettings({ config }: WeatherSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<WeatherConfig>) => updateWidgetSettings('weather', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Weather</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Temperature unit</label>
        <div className="flex gap-2">
          {(['F', 'C'] as const).map(v => (
            <button key={v} onClick={() => patch({ unit: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.unit === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              °{v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Forecast</label>
        <div className="flex gap-2">
          {([1, 3] as const).map(v => (
            <button key={v} onClick={() => patch({ forecastDays: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.forecastDays === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v === 1 ? 'Today only' : '3-day'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Show details</label>
        {([
          ['showHumidity', 'Humidity'],
          ['showWind', 'Wind'],
          ['showPrecipitation', 'Precipitation'],
          ['showFeelsLike', 'Feels like'],
          ['showUvIndex', 'UV index'],
          ['showSunriseSunset', 'Sunrise / sunset'],
        ] as [keyof WeatherConfig, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between text-xs text-gray-300">
            {label}
            <input type="checkbox" checked={config[key] as boolean}
              onChange={e => patch({ [key]: e.target.checked })} className="accent-accent" />
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/widgets/settings/CalendarSettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { CalendarConfig } from '@/types/widgetSettings'

interface CalendarSettingsProps { config: CalendarConfig }

export default function CalendarSettings({ config }: CalendarSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<CalendarConfig>) => updateWidgetSettings('calendar', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Calendar</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Week starts on</label>
        <div className="flex gap-2">
          {([['sunday', 'Sunday'], ['monday', 'Monday']] as const).map(([v, label]) => (
            <button key={v} onClick={() => patch({ weekStartsOn: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.weekStartsOn === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {([
        ['showWeekends', 'Show weekends'],
        ['showEventTimes', 'Show event times'],
      ] as [keyof CalendarConfig, string][]).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between text-xs text-gray-300">
          {label}
          <input type="checkbox" checked={config[key] as boolean}
            onChange={e => patch({ [key]: e.target.checked })} className="accent-accent" />
        </label>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/widgets/settings/QuickCaptureSettings.tsx src/components/widgets/settings/ProPlannerSettings.tsx src/components/widgets/settings/WeatherSettings.tsx src/components/widgets/settings/CalendarSettings.tsx && git commit -m "feat: add QuickCapture, ProPlanner, Weather, and Calendar settings forms"
```

---

## Task 5: Focus Timer settings form

**Files:**
- Create: `src/components/widgets/settings/FocusTimerSettings.tsx`

- [ ] **Step 1: Create `src/components/widgets/settings/FocusTimerSettings.tsx`**

```tsx
import { useWorkspace } from '@/stores/workspace'
import type { FocusTimerConfig, FocusTimerPreset } from '@/types/widgetSettings'

interface FocusTimerSettingsProps { config: FocusTimerConfig }

export default function FocusTimerSettings({ config }: FocusTimerSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<FocusTimerConfig>) => updateWidgetSettings('focusTimer', p)

  function updatePreset(index: number, changes: Partial<FocusTimerPreset>) {
    const next = config.presets.map((p, i) => i === index ? { ...p, ...changes } : p)
    patch({ presets: next })
  }

  function addPreset() {
    if (config.presets.length >= 6) return
    patch({ presets: [...config.presets, { label: 'Custom', minutes: 30 }] })
  }

  function removePreset(index: number) {
    if (config.presets.length <= 1) return
    patch({ presets: config.presets.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Focus Timer</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Presets</label>
        <div className="space-y-1.5">
          {config.presets.map((preset, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                defaultValue={preset.label} onBlur={e => updatePreset(i, { label: e.target.value || `${preset.minutes}m` })}
                maxLength={10}
                className="w-20 rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
                placeholder="Label"
              />
              <input
                type="number" min={1} max={180} defaultValue={preset.minutes}
                onBlur={e => {
                  const v = Math.min(180, Math.max(1, Number(e.target.value) || 1))
                  updatePreset(i, { minutes: v })
                }}
                className="w-16 rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
              />
              <span className="text-xs text-gray-600">min</span>
              <button onClick={() => removePreset(i)} disabled={config.presets.length <= 1}
                className="ml-auto text-xs text-gray-600 hover:text-red-400 disabled:opacity-30">✕</button>
            </div>
          ))}
          {config.presets.length < 6 && (
            <button onClick={addPreset} className="text-xs text-gray-500 hover:text-gray-300">+ Add preset</button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="flex items-center justify-between text-xs text-gray-300">
          Break timer
          <input type="checkbox" checked={config.breakEnabled}
            onChange={e => patch({ breakEnabled: e.target.checked })} className="accent-accent" />
        </label>
        {config.breakEnabled && (
          <div className="flex gap-1 pl-2">
            {([5, 10, 15] as const).map(v => (
              <button key={v} onClick={() => patch({ breakMinutes: v })}
                className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.breakMinutes === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
                {v}m
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center justify-between text-xs text-gray-300">
        Auto-start next session
        <input type="checkbox" checked={config.autoStart}
          onChange={e => patch({ autoStart: e.target.checked })} className="accent-accent" />
      </label>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Completion sound</label>
        <div className="flex gap-1">
          {(['off', 'chime', 'bell'] as const).map(v => (
            <button key={v} onClick={() => patch({ completionSound: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors ${config.completionSound === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Daily goal</label>
        <div className="flex gap-1">
          {([0, 2, 4, 6, 8] as const).map(v => (
            <button key={v} onClick={() => patch({ dailyGoal: v })}
              className={`flex-1 rounded-md border px-1 py-1 text-xs transition-colors ${config.dailyGoal === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v === 0 ? 'Off' : v}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/widgets/settings/FocusTimerSettings.tsx && git commit -m "feat: add FocusTimer settings form with preset editor"
```

---

## Task 6: Wire gear icons and settings into HomeScreen

**Files:**
- Modify: `src/components/HomeScreen.tsx`

This is the integration task. Read `HomeScreen.tsx` in full before making changes — it is large (~1112 lines).

- [ ] **Step 1: Add imports to `HomeScreen.tsx`**

After the existing imports block, add:

```tsx
import { getWidgetSettings } from '@/lib/homeCenter'
import WidgetSettingsPopover from './widgets/settings/WidgetSettingsPopover'
import TodaySettings from './widgets/settings/TodaySettings'
import FocusQueueSettings from './widgets/settings/FocusQueueSettings'
import RecentWorkSettings from './widgets/settings/RecentWorkSettings'
import QuickCaptureSettings from './widgets/settings/QuickCaptureSettings'
import ProPlannerSettings from './widgets/settings/ProPlannerSettings'
import FocusTimerSettings from './widgets/settings/FocusTimerSettings'
import WeatherSettings from './widgets/settings/WeatherSettings'
import CalendarSettings from './widgets/settings/CalendarSettings'
import type {
  TodayConfig, FocusQueueConfig, RecentWorkConfig, QuickCaptureConfig,
  ProPlannerConfig, FocusTimerConfig, WeatherConfig, CalendarConfig,
} from '@/types/widgetSettings'
```

- [ ] **Step 2: Add `openSettingsWidget` state**

Near the other `useState` declarations (around line 149 where `editingHome` is declared), add:

```ts
const [openSettingsWidget, setOpenSettingsWidget] = useState<string | null>(null)
```

- [ ] **Step 3: Read `widgetSettings` from store**

Near where `const widgets = normalizeHomeWidgets(homeCenter?.widgets)` is (around line 304), add:

```ts
const widgetSettings = homeCenter?.widgetSettings
```

- [ ] **Step 4: Add gear icon to `WidgetControls`**

`WidgetControls` currently only renders the remove button (and returns null for calendar). Update it to also render the settings gear. Find the `WidgetControls` function (around line 484):

```tsx
function WidgetControls({ widget }: { widget: HomeWidget }) {
  if (widget.type === 'calendar') {
    return (
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 group/widget">
        <WidgetSettingsPopover
          open={openSettingsWidget === widget.id}
          onOpen={() => setOpenSettingsWidget(widget.id)}
          onClose={() => setOpenSettingsWidget(null)}
        >
          {renderSettingsForm(widget)}
        </WidgetSettingsPopover>
      </div>
    )
  }
  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-1 group/widget" data-home-widget-edit-control="true">
      <WidgetSettingsPopover
        open={openSettingsWidget === widget.id}
        onOpen={() => setOpenSettingsWidget(widget.id)}
        onClose={() => setOpenSettingsWidget(null)}
      >
        {renderSettingsForm(widget)}
      </WidgetSettingsPopover>
      <button
        data-home-widget-edit-control="true"
        onClick={() => removeHomeCenterWidget(widget.id)}
        className="home-widget-control border border-surface-3 bg-surface-2"
        title="Remove widget"
        aria-label="Remove widget"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Add `renderSettingsForm` helper**

Add after `WidgetControls` (before `WidgetResizeHandles`):

```tsx
function renderSettingsForm(widget: HomeWidget) {
  const ws = widgetSettings
  if (widget.type === 'today') return <TodaySettings config={getWidgetSettings<TodayConfig>('today', ws)} />
  if (widget.type === 'focus') return <FocusQueueSettings config={getWidgetSettings<FocusQueueConfig>('focus', ws)} />
  if (widget.type === 'recent') return <RecentWorkSettings config={getWidgetSettings<RecentWorkConfig>('recent', ws)} />
  if (widget.type === 'quickCapture') return <QuickCaptureSettings config={getWidgetSettings<QuickCaptureConfig>('quickCapture', ws)} />
  if (widget.type === 'proPlanner') return <ProPlannerSettings config={getWidgetSettings<ProPlannerConfig>('proPlanner', ws)} />
  if (widget.type === 'focusTimer') return <FocusTimerSettings config={getWidgetSettings<FocusTimerConfig>('focusTimer', ws)} />
  if (widget.type === 'weather') return <WeatherSettings config={getWidgetSettings<WeatherConfig>('weather', ws)} />
  if (widget.type === 'calendar') return <CalendarSettings config={getWidgetSettings<CalendarConfig>('calendar', ws)} />
  return null
}
```

- [ ] **Step 6: Pass resolved configs to widget renderers**

In `HomeScreen`, each `renderXxxWidget()` function currently reads data directly from store/state. Update the key renderers to also receive their config:

Find `renderTodayWidget` and change it to read from config:

```ts
// Near the top of renderTodayWidget, add:
const todayConfig = getWidgetSettings<TodayConfig>('today', widgetSettings)
// Then use todayConfig.greeting, todayConfig.showClock, etc. throughout the function
```

For **Focus Queue** (`renderFocusWidget`):
```ts
const focusConfig = getWidgetSettings<FocusQueueConfig>('focus', widgetSettings)
// Use focusConfig.title, focusConfig.itemCount, focusConfig.filter, focusConfig.pinnedIds
```

For **Recent Work** (`renderRecentWidget`):
```ts
const recentConfig = getWidgetSettings<RecentWorkConfig>('recent', widgetSettings)
// Use recentConfig.title, recentConfig.itemCount, recentConfig.filter, recentConfig.sortBy
```

For **Quick Capture** (`renderQuickCaptureWidget`):
```ts
const quickConfig = getWidgetSettings<QuickCaptureConfig>('quickCapture', widgetSettings)
// Render only buttons where quickConfig.buttons.find(b => b.id === 'board')?.enabled etc.
// Use custom labels from quickConfig.buttons
// Render in order of quickConfig.buttons array
```

For **Weather** (`renderWeatherWidget`):
```ts
const weatherConfig = getWidgetSettings<WeatherConfig>('weather', widgetSettings)
// Use weatherConfig.unit to format temperatures
// Show/hide stats based on weatherConfig.showHumidity etc.
// Use weatherConfig.forecastDays to control forecast display
```

For **Calendar** (`renderCalendarWidget`):
```ts
const calendarConfig = getWidgetSettings<CalendarConfig>('calendar', widgetSettings)
// Pass weekStartsOn, showWeekends, showEventTimes to the calendar render logic
```

For **Focus Timer** (`renderFocusTimerWidget`):
```ts
const timerConfig = getWidgetSettings<FocusTimerConfig>('focusTimer', widgetSettings)
// Replace FOCUS_TIMER_PRESETS usage with timerConfig.presets
// Each preset button: timerConfig.presets.map(p => ...)
```

For **AI Planner** (`renderProPlannerWidget`):
```ts
const plannerConfig = getWidgetSettings<ProPlannerConfig>('proPlanner', widgetSettings)
// Pass workStart, workEnd, focusStyle, customInstructions to the planner API call if present
```

**Important:** For each renderer, read the existing implementation carefully and integrate the config values naturally — don't replace logic that currently works, just make it read from config instead of hardcoded values.

- [ ] **Step 7: Make gear icon visible outside edit mode (on hover)**

The `WidgetControls` is currently only rendered when `editingHome` is true (line 545: `{editingHome && <WidgetControls widget={widget} />}`). To show the gear icon on hover even when not editing, update `WidgetShell`:

Find in `WidgetShell`:
```tsx
{editingHome && <WidgetControls widget={widget} />}
```

Change to:
```tsx
<WidgetControls widget={widget} />
```

And update `WidgetControls` to conditionally show the remove button only in edit mode. In the `WidgetControls` function, wrap the remove button in `{editingHome && ...}`:

```tsx
{editingHome && (
  <button
    data-home-widget-edit-control="true"
    onClick={() => removeHomeCenterWidget(widget.id)}
    className="home-widget-control border border-surface-3 bg-surface-2"
    title="Remove widget"
    aria-label="Remove widget"
  >
    ✕
  </button>
)}
```

This keeps the gear icon always accessible on hover while the remove button only appears in edit mode.

- [ ] **Step 8: Close settings popover on edit mode drag start**

In `handleWidgetDragStart` (wherever viewport mousedown begins a drag in edit mode), add:
```ts
setOpenSettingsWidget(null)
```

- [ ] **Step 9: Verify TypeScript**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 10: Run all tests**

```bash
cd /Users/michael/flowspace && npm test 2>&1 | tail -15
```

Expected: all tests pass (including the 4 widgetDefaults tests)

- [ ] **Step 11: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/HomeScreen.tsx && git commit -m "feat: wire widget settings gear icons and configs into HomeScreen"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Per-widget gear icon (hover, always in edit mode) | Task 6 Step 7 |
| Floating settings popover, closes on outside click / Escape | Task 2 |
| `widgetSettings` added to `HomeCenterConfig` | Task 1 Step 5 |
| `updateWidgetSettings` store action with debounced persist | Task 1 Step 7 |
| `getWidgetSettings` merges stored + defaults | Task 1 Step 6 |
| Today: greeting, date format, show/hide toggles | Task 3 Step 1 |
| Focus Queue: title, item count, filter, pinned IDs | Task 3 Step 2 |
| Recent Work: title, item count, filter, sort by | Task 3 Step 3 |
| Quick Capture: toggle/rename/reorder buttons | Task 4 Step 1 |
| AI Day Planner: work hours, focus style, instructions, refresh | Task 4 Step 2 |
| Weather: unit, forecast days, show/hide stats | Task 4 Step 3 |
| Calendar: week start, weekends, event times | Task 4 Step 4 |
| Focus Timer: preset editor, break, auto-start, sound, goal | Task 5 |
| Configs passed to widget renderers (settings take effect) | Task 6 Step 6 |
| Weather location unchanged (existing localStorage flow) | Not touched — correct |
| FocusTimer presets migrated from hardcoded to config | Task 5 + Task 6 Step 6 |
| Immediate apply, 400ms debounce persist | Task 1 Step 7 (`persist()` is called immediately after `set()` — workspace store debounces internally) |
| One popover open at a time | Task 6 Step 2 (`openSettingsWidget` is a single string) |
