import { describe, expect, it } from 'vitest'
import {
  addHomeWidget,
  autoArrangeHomeWidgets,
  DEFAULT_HOME_WIDGETS,
  HOME_WIDGET_CATALOG,
  mergeHomeWidgets,
  moveHomeWidget,
  normalizeHomeWidgets,
  resizeHomeWidget,
  resizeHomeWidgetFromCorner,
} from './homeCenter'

describe('home center layout helpers', () => {
  it('uses the calendar as the default full-size widget', () => {
    expect(normalizeHomeWidgets(undefined)).toEqual(DEFAULT_HOME_WIDGETS)
  })

  it('adds opt-in widgets and keeps the calendar large but not blocking them', () => {
    const widgets = addHomeWidget(DEFAULT_HOME_WIDGETS, 'today')

    expect(widgets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 12 }),
      expect.objectContaining({ id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 }),
    ]))
  })

  it('does not add duplicate widgets', () => {
    const once = addHomeWidget(DEFAULT_HOME_WIDGETS, 'today')
    const twice = addHomeWidget(once, 'today')

    expect(twice.filter(widget => widget.type === 'today')).toHaveLength(1)
  })

  it('merges template widgets without replacing an existing home layout', () => {
    const current = [
      DEFAULT_HOME_WIDGETS[0],
      { id: 'today', type: 'today' as const, x: 8, y: 0, w: 4, h: 3 },
    ]
    const template = [
      { id: 'calendar', type: 'calendar' as const, x: 0, y: 0, w: 8, h: 8 },
      { id: 'today', type: 'today' as const, x: 8, y: 0, w: 4, h: 3 },
      { id: 'weather', type: 'weather' as const, x: 4, y: 8, w: 4, h: 4 },
    ]

    const merged = mergeHomeWidgets(current, template)

    expect(merged.find(widget => widget.type === 'today')).toMatchObject({ x: 8, y: 0 })
    expect(merged.find(widget => widget.type === 'weather')).toMatchObject({ x: 4, y: 8, w: 4, h: 4 })
    expect(merged.filter(widget => widget.type === 'today')).toHaveLength(1)
  })

  it('offers the max focus timer as an opt-in home widget', () => {
    expect(HOME_WIDGET_CATALOG).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'focusTimer', title: 'Max focus timer' }),
    ]))

    const widgets = addHomeWidget(DEFAULT_HOME_WIDGETS, 'focusTimer' as never)

    expect(widgets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'focusTimer', type: 'focusTimer', w: 4, h: 4 }),
    ]))
  })

  it('offers weather as an opt-in home widget', () => {
    expect(HOME_WIDGET_CATALOG).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'weather', title: 'Weather' }),
    ]))

    const widgets = addHomeWidget(DEFAULT_HOME_WIDGETS, 'weather' as never)

    expect(widgets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'weather', type: 'weather', w: 4, h: 4 }),
    ]))
  })

  it('keeps move and resize operations inside the home grid', () => {
    const moved = moveHomeWidget(DEFAULT_HOME_WIDGETS, 'calendar', 20, 20)
    expect(moved[0]).toMatchObject({ x: 0, y: 0, w: 12, h: 12 })

    const resized = resizeHomeWidget(DEFAULT_HOME_WIDGETS, 'calendar', -20, -20)
    expect(resized[0]).toMatchObject({ w: 4, h: 3 })
  })

  it('resizes widgets from a corner while preserving the opposite corner', () => {
    const widgets = [
      DEFAULT_HOME_WIDGETS[0],
      { id: 'today', type: 'today' as const, x: 4, y: 4, w: 4, h: 3 },
    ]

    const resized = resizeHomeWidgetFromCorner(widgets, 'today', 'nw', -2, -1)

    expect(resized.find(widget => widget.id === 'today')).toMatchObject({
      x: 2,
      y: 3,
      w: 6,
      h: 4,
    })
  })

  it('keeps corner resize inside the grid and above minimum widget size', () => {
    const widgets = [
      DEFAULT_HOME_WIDGETS[0],
      { id: 'today', type: 'today' as const, x: 4, y: 4, w: 4, h: 3 },
    ]

    const resized = resizeHomeWidgetFromCorner(widgets, 'today', 'nw', 20, 20)

    expect(resized.find(widget => widget.id === 'today')).toMatchObject({
      x: 4,
      y: 4,
      w: 4,
      h: 3,
    })
  })

  it('auto-arranges active widgets into a non-overlapping spacious layout', () => {
    const messy = [
      { id: 'calendar', type: 'calendar' as const, x: 4, y: 8, w: 4, h: 3 },
      { id: 'today', type: 'today' as const, x: 4, y: 8, w: 4, h: 3 },
      { id: 'weather', type: 'weather' as const, x: 4, y: 8, w: 4, h: 3 },
      { id: 'focusTimer', type: 'focusTimer' as const, x: 4, y: 8, w: 4, h: 3 },
      { id: 'focus', type: 'focus' as const, x: 4, y: 8, w: 4, h: 3 },
      { id: 'recent', type: 'recent' as const, x: 4, y: 8, w: 4, h: 3 },
      { id: 'quickCapture', type: 'quickCapture' as const, x: 4, y: 8, w: 4, h: 3 },
      { id: 'proPlanner', type: 'proPlanner' as const, x: 4, y: 8, w: 4, h: 3 },
    ]

    const arranged = autoArrangeHomeWidgets(messy)

    expect(arranged.map(widget => widget.type)).toEqual([
      'calendar',
      'today',
      'weather',
      'focusTimer',
      'focus',
      'recent',
      'quickCapture',
      'proPlanner',
    ])
    expect(arranged.find(widget => widget.type === 'calendar')).toMatchObject({ x: 0, y: 0, w: 8, h: 8 })

    for (let i = 0; i < arranged.length; i++) {
      for (let j = i + 1; j < arranged.length; j++) {
        const a = arranged[i]
        const b = arranged[j]
        const overlaps = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        expect(overlaps, `${a.type} overlaps ${b.type}`).toBe(false)
      }
    }
  })

  it('auto-arranges the full widget set into tidy dashboard zones', () => {
    const arranged = autoArrangeHomeWidgets([
      DEFAULT_HOME_WIDGETS[0],
      { id: 'quickCapture', type: 'quickCapture' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'proPlanner', type: 'proPlanner' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'recent', type: 'recent' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'focus', type: 'focus' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'weather', type: 'weather' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'focusTimer', type: 'focusTimer' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'today', type: 'today' as const, x: 0, y: 0, w: 4, h: 3 },
    ])

    expect(arranged).toEqual([
      expect.objectContaining({ id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 8 }),
      expect.objectContaining({ id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 }),
      expect.objectContaining({ id: 'weather', type: 'weather', x: 8, y: 3, w: 4, h: 3 }),
      expect.objectContaining({ id: 'focusTimer', type: 'focusTimer', x: 8, y: 6, w: 4, h: 3 }),
      expect.objectContaining({ id: 'focus', type: 'focus', x: 0, y: 8, w: 4, h: 4 }),
      expect.objectContaining({ id: 'recent', type: 'recent', x: 4, y: 8, w: 4, h: 4 }),
      expect.objectContaining({ id: 'quickCapture', type: 'quickCapture', x: 8, y: 9, w: 4, h: 3 }),
      expect.objectContaining({ id: 'proPlanner', type: 'proPlanner', x: 0, y: 12, w: 8, h: 4 }),
    ])
  })

  it('auto-arranges by filling available upper gaps before adding lower rows', () => {
    const arranged = autoArrangeHomeWidgets([
      DEFAULT_HOME_WIDGETS[0],
      { id: 'today', type: 'today' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'focus', type: 'focus' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'recent', type: 'recent' as const, x: 0, y: 0, w: 4, h: 3 },
      { id: 'proPlanner', type: 'proPlanner' as const, x: 0, y: 0, w: 4, h: 3 },
    ])

    expect(arranged).toEqual([
      expect.objectContaining({ type: 'calendar', x: 0, y: 0, w: 8, h: 8 }),
      expect.objectContaining({ type: 'today', x: 8, y: 0, w: 4, h: 3 }),
      expect.objectContaining({ type: 'focus', x: 8, y: 3, w: 4, h: 4 }),
      expect.objectContaining({ type: 'recent', x: 8, y: 7, w: 4, h: 4 }),
      expect.objectContaining({ type: 'proPlanner', x: 0, y: 8, w: 8, h: 4 }),
    ])
  })
})
