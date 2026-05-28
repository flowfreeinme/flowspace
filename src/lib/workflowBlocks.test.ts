import { describe, it, expect } from 'vitest'
import {
  parseKanban, parseFlowchart, parseTimeline,
  defaultKanban, defaultFlowchart, defaultTimeline,
  daysBetween, barOffsetPct, barWidthPct,
  addFlowchartNode, connectFlowchartNodes, clientPointToFlowchartPosition,
  getTimelineItems,
} from './workflowBlocks'

describe('parseKanban', () => {
  it('returns valid data for well-formed JSON', () => {
    const data = { x: 10, y: 20, width: 520, height: 360, columns: [] }
    expect(parseKanban(JSON.stringify(data))).toEqual(data)
  })
  it('returns a numeric-x fallback for garbage input', () => {
    const result = parseKanban('not json')
    expect(typeof result.x).toBe('number')
    expect(Array.isArray(result.columns)).toBe(true)
  })
})

describe('parseFlowchart', () => {
  it('returns valid data for well-formed JSON', () => {
    const data = { x: 5, y: 5, width: 520, height: 360, nodes: [], edges: [] }
    expect(parseFlowchart(JSON.stringify(data))).toEqual(data)
  })
  it('returns fallback arrays for empty object', () => {
    const result = parseFlowchart('{}')
    expect(Array.isArray(result.nodes)).toBe(true)
    expect(Array.isArray(result.edges)).toBe(true)
  })
})

describe('parseTimeline', () => {
  it('returns valid data for well-formed JSON', () => {
    const data = { x: 0, y: 0, width: 520, height: 360, groups: [], dateRange: { start: '2026-01-01', end: '2026-02-01' } }
    expect(parseTimeline(JSON.stringify(data))).toEqual(data)
  })
  it('returns dateRange with ISO date strings for bad input', () => {
    const result = parseTimeline('bad')
    expect(result.dateRange.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.dateRange.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('preserves item time and location fields', () => {
    const data = {
      x: 0,
      y: 0,
      width: 520,
      height: 360,
      groups: [{
        id: 'g1',
        label: 'Schedule',
        bars: [{
          id: 'b1',
          label: 'Studio',
          start: '2026-05-21',
          end: '2026-05-21',
          startTime: '09:30',
          endTime: '10:15',
          location: 'Library',
          color: '#7c6af7',
        }],
      }],
      dateRange: { start: '2026-05-01', end: '2026-05-31' },
    }
    expect(parseTimeline(JSON.stringify(data)).groups[0].bars[0]).toMatchObject({
      startTime: '09:30',
      endTime: '10:15',
      location: 'Library',
    })
  })
})

describe('defaultKanban', () => {
  it('places block at given coordinates with 3 columns', () => {
    const data = defaultKanban(100, 200)
    expect(data.x).toBe(100)
    expect(data.y).toBe(200)
    expect(data.columns).toHaveLength(3)
    expect(data.columns[0].title).toBe('To Do')
  })
})

describe('defaultFlowchart', () => {
  it('places block at given coordinates with a start node', () => {
    const data = defaultFlowchart(50, 80)
    expect(data.x).toBe(50)
    expect(data.y).toBe(80)
    expect(data.nodes[0].type).toBe('start')
  })
})

describe('flowchart editing helpers', () => {
  it('adds a node at a clamped canvas position', () => {
    const data = { x: 0, y: 0, width: 240, height: 120, nodes: [], edges: [] }
    const result = addFlowchartNode(data, { type: 'process', label: 'Draft', x: 999, y: -20 }, () => 'node-1', { width: 240, height: 120 })
    expect(result.nodes).toEqual([{ id: 'node-1', type: 'process', label: 'Draft', x: 120, y: 0 }])
  })

  it('places a new toolbar node away from existing nodes', () => {
    const data = {
      x: 0, y: 0, width: 520, height: 320,
      nodes: [{ id: 'start', label: 'Start', type: 'start' as const, x: 210, y: 50 }],
      edges: [],
    }
    const result = addFlowchartNode(data, { type: 'process' }, () => 'step-1', { width: 520, height: 320 })
    const node = result.nodes[1]
    const isSeparated =
      node.x + 120 <= 210 ||
      node.x >= 210 + 120 ||
      node.y + 44 <= 50 ||
      node.y >= 50 + 44
    expect(isSeparated).toBe(true)
  })

  it('converts client coordinates into zoom-correct flowchart coordinates', () => {
    const result = clientPointToFlowchartPosition(250, 180, { left: 100, top: 80 }, 0.5)
    expect(result).toEqual({ x: 240, y: 178 })
  })

  it('connects two nodes once and ignores duplicate edges', () => {
    const data = {
      x: 0, y: 0, width: 520, height: 360,
      nodes: [
        { id: 'a', label: 'A', type: 'start' as const, x: 0, y: 0 },
        { id: 'b', label: 'B', type: 'process' as const, x: 180, y: 0 },
      ],
      edges: [],
    }
    const once = connectFlowchartNodes(data, 'a', 'b')
    const twice = connectFlowchartNodes(once, 'a', 'b')
    expect(twice.edges).toEqual([{ from: 'a', to: 'b' }])
  })
})

describe('defaultTimeline', () => {
  it('places block at given coordinates with one group', () => {
    const data = defaultTimeline(0, 100)
    expect(data.y).toBe(100)
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0].label).toBe('Schedule')
  })
})

describe('getTimelineItems', () => {
  it('returns timeline bars in chronological date and time order', () => {
    const data = {
      x: 0,
      y: 0,
      width: 520,
      height: 360,
      dateRange: { start: '2026-05-01', end: '2026-05-31' },
      groups: [{
        id: 'g1',
        label: 'Schedule',
        bars: [
          { id: 'late', label: 'Late', start: '2026-05-22', end: '2026-05-22', startTime: '15:00', color: '#7c6af7' },
          { id: 'early', label: 'Early', start: '2026-05-21', end: '2026-05-21', startTime: '08:30', color: '#22c55e' },
          { id: 'mid', label: 'Mid', start: '2026-05-21', end: '2026-05-21', startTime: '13:00', color: '#f59e0b' },
        ],
      }],
    }
    expect(getTimelineItems(data).map(item => item.bar.id)).toEqual(['early', 'mid', 'late'])
  })
})

describe('daysBetween', () => {
  it('returns correct number of days', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7)
  })
  it('returns 0 for invalid dates instead of NaN', () => {
    expect(daysBetween('bad', 'date')).toBe(0)
  })
  it('returns negative for reversed dates', () => {
    expect(daysBetween('2026-01-08', '2026-01-01')).toBe(-7)
  })
})

describe('barOffsetPct', () => {
  it('returns 0 when bar starts at range start', () => {
    expect(barOffsetPct('2026-01-01', '2026-01-01', 30)).toBe(0)
  })
  it('clamps to 0 when bar starts before range', () => {
    expect(barOffsetPct('2025-12-01', '2026-01-01', 30)).toBe(0)
  })
})

describe('barWidthPct', () => {
  it('returns correct percentage for a 7-day bar in 30-day range', () => {
    expect(barWidthPct('2026-01-01', '2026-01-08', 30)).toBeCloseTo(23.33, 1)
  })
  it('returns minimum 1% for zero-duration bar', () => {
    expect(barWidthPct('2026-01-01', '2026-01-01', 30)).toBe(1)
  })
})
