import type { HomeWidget, HomeWidgetType } from '@/types'
import type { WidgetConfigMap } from '@/types/widgetSettings'
import { DEFAULT_WIDGET_SETTINGS } from './widgetDefaults'

export const HOME_GRID_COLUMNS = 12
export const HOME_GRID_ROWS = 20
export const MIN_HOME_WIDGET_WIDTH = 4
export const MIN_HOME_WIDGET_HEIGHT = 3

export type HomeWidgetResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

export const DEFAULT_HOME_WIDGETS: HomeWidget[] = [
  { id: 'calendar', type: 'calendar', x: 0, y: 0, w: 12, h: 12 },
]

const WIDGET_DEFAULTS: Record<HomeWidgetType, HomeWidget> = {
  calendar: DEFAULT_HOME_WIDGETS[0],
  today: { id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 },
  focus: { id: 'focus', type: 'focus', x: 8, y: 3, w: 4, h: 4 },
  recent: { id: 'recent', type: 'recent', x: 8, y: 7, w: 4, h: 3 },
  quickCapture: { id: 'quickCapture', type: 'quickCapture', x: 8, y: 10, w: 4, h: 2 },
  proPlanner: { id: 'proPlanner', type: 'proPlanner', x: 0, y: 9, w: 4, h: 3 },
  focusTimer: { id: 'focusTimer', type: 'focusTimer', x: 8, y: 0, w: 4, h: 4 },
  weather: { id: 'weather', type: 'weather', x: 8, y: 4, w: 4, h: 4 },
  aiBriefing: { id: 'aiBriefing', type: 'aiBriefing', x: 4, y: 0, w: 4, h: 5 },
}

const AUTO_ARRANGE_ORDER: HomeWidgetType[] = [
  'calendar',
  'today',
  'weather',
  'focusTimer',
  'focus',
  'recent',
  'quickCapture',
  'proPlanner',
  'aiBriefing',
]

const AUTO_ARRANGE_SIZES: Record<HomeWidgetType, Pick<HomeWidget, 'w' | 'h'>> = {
  calendar: { w: 8, h: 8 },
  today: { w: 4, h: 3 },
  weather: { w: 4, h: 3 },
  focusTimer: { w: 4, h: 3 },
  focus: { w: 4, h: 4 },
  recent: { w: 4, h: 4 },
  quickCapture: { w: 4, h: 3 },
  proPlanner: { w: 8, h: 4 },
  aiBriefing: { w: 4, h: 5 },
}

export const HOME_WIDGET_CATALOG: Array<{
  type: HomeWidgetType
  title: string
  description: string
}> = [
  { type: 'today', title: 'Today strip', description: 'Current day, time, and your next event.' },
  { type: 'focus', title: 'Focus queue', description: 'Suggested boards and pages to keep moving.' },
  { type: 'recent', title: 'Recent work', description: 'Fast access to recently updated work.' },
  { type: 'quickCapture', title: 'Quick capture', description: 'Create a board, page, note, or event.' },
  { type: 'proPlanner', title: 'AI day planner', description: 'Generate a quick plan from calendar and workspace context.' },
  { type: 'focusTimer', title: 'Max focus timer', description: 'Run deep-work sprints from your home center.' },
  { type: 'weather', title: 'Weather', description: 'Show local conditions or pin any city.' },
  { type: 'aiBriefing', title: 'AI Briefing', description: 'See what to work on next and pending actions across your workspace.' },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function clampWidget(widget: HomeWidget): HomeWidget {
  const w = clamp(widget.w, MIN_HOME_WIDGET_WIDTH, HOME_GRID_COLUMNS)
  const h = clamp(widget.h, MIN_HOME_WIDGET_HEIGHT, HOME_GRID_ROWS)
  const maxY = widget.type === 'calendar' && w === HOME_GRID_COLUMNS && h === 12
    ? 0
    : HOME_GRID_ROWS - h
  return {
    ...widget,
    w,
    h,
    x: clamp(widget.x, 0, HOME_GRID_COLUMNS - w),
    y: clamp(widget.y, 0, maxY),
  }
}

function overlaps(a: HomeWidget, b: HomeWidget) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
}

function findOpenWidgetSlot(widgets: HomeWidget[], template: HomeWidget) {
  const candidate = clampWidget(template)
  if (!widgets.some(widget => overlaps(widget, candidate))) return candidate

  for (let y = 0; y <= HOME_GRID_ROWS - candidate.h; y++) {
    for (let x = 0; x <= HOME_GRID_COLUMNS - candidate.w; x++) {
      const next = { ...candidate, x, y }
      if (!widgets.some(widget => overlaps(widget, next))) return next
    }
  }

  return clampWidget({ ...candidate, x: 0, y: HOME_GRID_ROWS - candidate.h })
}

export function normalizeHomeWidgets(widgets?: HomeWidget[]) {
  if (!widgets?.length) return DEFAULT_HOME_WIDGETS

  const seen = new Set<HomeWidgetType>()
  const normalized = widgets.flatMap(widget => {
    if (seen.has(widget.type)) return []
    seen.add(widget.type)
    return clampWidget({ ...widget, id: widget.type })
  })

  if (!seen.has('calendar')) return DEFAULT_HOME_WIDGETS
  return normalized.sort((a, b) => (a.type === 'calendar' ? -1 : b.type === 'calendar' ? 1 : a.y - b.y || a.x - b.x))
}

function makeRoomForSideRail(widgets: HomeWidget[]) {
  return widgets.map(widget => {
    if (widget.type !== 'calendar') return widget
    if (widget.x === 0 && widget.y === 0 && widget.w === 12 && widget.h === 12) {
      return { ...widget, w: 8, h: 12 }
    }
    return widget
  })
}

export function addHomeWidget(widgets: HomeWidget[], type: HomeWidgetType) {
  const normalized = normalizeHomeWidgets(widgets)
  if (normalized.some(widget => widget.type === type)) return normalized

  const adjusted = type === 'calendar' ? normalized : makeRoomForSideRail(normalized)
  return normalizeHomeWidgets([...adjusted, findOpenWidgetSlot(adjusted, WIDGET_DEFAULTS[type])])
}

export function mergeHomeWidgets(current: HomeWidget[], incoming: HomeWidget[]) {
  const normalizedCurrent = normalizeHomeWidgets(current)
  if (!incoming.length) return normalizedCurrent

  const hasNewSideWidget = incoming.some(widget => widget.type !== 'calendar' && !normalizedCurrent.some(currentWidget => currentWidget.type === widget.type))
  const adjustedCurrent = hasNewSideWidget ? makeRoomForSideRail(normalizedCurrent) : normalizedCurrent
  const existingTypes = new Set(adjustedCurrent.map(widget => widget.type))
  const missingIncoming = incoming.filter(widget => !existingTypes.has(widget.type))

  return normalizeHomeWidgets([...adjustedCurrent, ...missingIncoming])
}

export function autoArrangeHomeWidgets(widgets: HomeWidget[]) {
  const normalized = normalizeHomeWidgets(widgets)
  if (normalized.length === 1) return DEFAULT_HOME_WIDGETS

  const present = new Map(normalized.map(widget => [widget.type, widget]))
  const arranged: HomeWidget[] = []

  for (const type of AUTO_ARRANGE_ORDER) {
    const widget = present.get(type)
    if (!widget) continue
    const size = AUTO_ARRANGE_SIZES[type]
    const template = type === 'calendar'
      ? { ...widget, x: 0, y: 0, ...size }
      : { ...widget, x: 0, y: 0, ...size }
    arranged.push(type === 'calendar' ? clampWidget(template) : findOpenWidgetSlot(arranged, template))
  }

  return arranged
}

export function removeHomeWidget(widgets: HomeWidget[], id: string) {
  const normalized = normalizeHomeWidgets(widgets)
  if (id === 'calendar') return normalized
  return normalizeHomeWidgets(normalized.filter(widget => widget.id !== id))
}

export function getWidgetSettings<K extends HomeWidgetType>(
  type: K,
  stored: Partial<{ [P in keyof WidgetConfigMap]: Partial<WidgetConfigMap[P]> }> | undefined,
): WidgetConfigMap[K] {
  const defaults = DEFAULT_WIDGET_SETTINGS[type] as WidgetConfigMap[K]
  const override = stored?.[type]
  if (!override) return defaults
  return { ...defaults, ...override }
}

export function moveHomeWidget(widgets: HomeWidget[], id: string, dx: number, dy: number) {
  return normalizeHomeWidgets(widgets.map(widget => (
    widget.id === id ? clampWidget({ ...widget, x: widget.x + dx, y: widget.y + dy }) : widget
  )))
}

export function resizeHomeWidget(widgets: HomeWidget[], id: string, dw: number, dh: number) {
  return normalizeHomeWidgets(widgets.map(widget => (
    widget.id === id ? clampWidget({ ...widget, w: widget.w + dw, h: widget.h + dh }) : widget
  )))
}

export function pushCascadeHomeWidgets(widgets: HomeWidget[], movedId: string): HomeWidget[] {
  let result = widgets.map(w => ({ ...w }))
  let changed = true

  while (changed) {
    changed = false
    for (const widget of result) {
      if (widget.id === movedId) continue
      const blockers = result.filter(w => w.id !== widget.id && overlaps(w, widget))
      if (!blockers.length) continue
      const requiredY = Math.max(...blockers.map(w => w.y + w.h))
      if (widget.y < requiredY) {
        const clamped = clamp(requiredY, 0, HOME_GRID_ROWS - widget.h)
        result = result.map(w => w.id === widget.id ? { ...w, y: clamped } : w)
        changed = true
      }
    }
  }

  return normalizeHomeWidgets(result)
}

export function resizeHomeWidgetFromCorner(
  widgets: HomeWidget[],
  id: string,
  corner: HomeWidgetResizeCorner,
  dx: number,
  dy: number,
) {
  return normalizeHomeWidgets(widgets.map(widget => {
    if (widget.id !== id) return widget

    const next = { ...widget }

    if (corner.includes('w')) {
      const nextX = clamp(next.x + dx, 0, next.x + next.w - MIN_HOME_WIDGET_WIDTH)
      next.w += next.x - nextX
      next.x = nextX
    } else {
      next.w = clamp(next.w + dx, MIN_HOME_WIDGET_WIDTH, HOME_GRID_COLUMNS - next.x)
    }

    if (corner.includes('n')) {
      const nextY = clamp(next.y + dy, 0, next.y + next.h - MIN_HOME_WIDGET_HEIGHT)
      next.h += next.y - nextY
      next.y = nextY
    } else {
      next.h = clamp(next.h + dy, MIN_HOME_WIDGET_HEIGHT, HOME_GRID_ROWS - next.y)
    }

    return clampWidget(next)
  }))
}
