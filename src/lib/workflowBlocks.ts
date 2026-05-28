import { v4 as uuid } from 'uuid'

export interface KanbanCard {
  id: string
  text: string
  assignee?: string
  status?: 'todo' | 'in-progress' | 'done'
}

export interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
}

export interface KanbanData {
  x: number; y: number; width: number; height: number
  columns: KanbanColumn[]
}

export interface FlowchartNode {
  id: string
  label: string
  type: 'process' | 'decision' | 'start' | 'end'
  x: number; y: number
}

export interface FlowchartEdge {
  from: string; to: string; label?: string
}

export interface FlowchartData {
  x: number; y: number; width: number; height: number
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
}

export interface TimelineBar {
  id: string
  label: string
  start: string
  end: string
  color: string
  startTime?: string
  endTime?: string
  location?: string
  notes?: string
}

export interface TimelineGroup {
  id: string; label: string; bars: TimelineBar[]
}

export interface TimelineData {
  x: number; y: number; width: number; height: number
  groups: TimelineGroup[]
  dateRange: { start: string; end: string }
}

export interface TimelineItem {
  groupId: string
  groupLabel: string
  bar: TimelineBar
}

export const WORKFLOW_W = 520
export const WORKFLOW_H = 360
export const FLOWCHART_NODE_W = 120
export const FLOWCHART_NODE_H = 44

export const TIMELINE_COLORS = [
  '#7c6af7', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#8b5cf6', '#f97316',
]

export function parseKanban(content: string): KanbanData {
  try {
    const d = JSON.parse(content) as KanbanData
    if (typeof d.x === 'number' && typeof d.y === 'number' && typeof d.width === 'number' && typeof d.height === 'number' && Array.isArray(d.columns)) return d
  } catch {}
  return { x: 0, y: 260, width: WORKFLOW_W, height: WORKFLOW_H, columns: [] }
}

export function parseFlowchart(content: string): FlowchartData {
  try {
    const d = JSON.parse(content) as FlowchartData
    if (typeof d.x === 'number' && typeof d.y === 'number' && typeof d.width === 'number' && typeof d.height === 'number' && Array.isArray(d.nodes) && Array.isArray(d.edges)) return d
  } catch {}
  return { x: 0, y: 260, width: WORKFLOW_W, height: WORKFLOW_H, nodes: [], edges: [] }
}

export function parseTimeline(content: string): TimelineData {
  try {
    const d = JSON.parse(content) as TimelineData
    if (typeof d.x === 'number' && typeof d.y === 'number' && typeof d.width === 'number' && typeof d.height === 'number' && Array.isArray(d.groups) && d.dateRange && typeof d.dateRange.start === 'string' && typeof d.dateRange.end === 'string') return d
  } catch {}
  const today = new Date().toISOString().slice(0, 10)
  const monthOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { x: 0, y: 260, width: WORKFLOW_W, height: WORKFLOW_H, groups: [], dateRange: { start: today, end: monthOut } }
}

export function defaultKanban(x: number, y: number): KanbanData {
  return {
    x, y, width: WORKFLOW_W, height: WORKFLOW_H,
    columns: [
      { id: uuid(), title: 'To Do', cards: [] },
      { id: uuid(), title: 'In Progress', cards: [] },
      { id: uuid(), title: 'Done', cards: [] },
    ],
  }
}

export function defaultFlowchart(x: number, y: number): FlowchartData {
  return {
    x, y, width: WORKFLOW_W, height: WORKFLOW_H,
    nodes: [{ id: uuid(), label: 'Start', type: 'start', x: 210, y: 50 }],
    edges: [],
  }
}

export interface FlowchartBounds {
  width: number
  height: number
}

export interface FlowchartNodeDraft {
  type?: FlowchartNode['type']
  label?: string
  x?: number
  y?: number
}

function defaultFlowchartNodeLabel(type: FlowchartNode['type']) {
  if (type === 'start') return 'Start'
  if (type === 'end') return 'End'
  if (type === 'decision') return 'Decision'
  return 'Step'
}

export function clampFlowchartNodePosition(
  x: number,
  y: number,
  bounds: FlowchartBounds,
) {
  const maxX = Math.max(0, bounds.width - FLOWCHART_NODE_W)
  const maxY = Math.max(0, bounds.height - FLOWCHART_NODE_H)
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
  }
}

export function nextFlowchartNodePosition(
  data: FlowchartData,
  bounds: FlowchartBounds = data,
) {
  const gapX = 40
  const gapY = 36
  const left = 24
  const top = 32
  const maxX = Math.max(0, bounds.width - FLOWCHART_NODE_W)
  const maxY = Math.max(0, bounds.height - FLOWCHART_NODE_H)

  for (let y = top; y <= maxY; y += FLOWCHART_NODE_H + gapY) {
    for (let x = left; x <= maxX; x += FLOWCHART_NODE_W + gapX) {
      const candidate = clampFlowchartNodePosition(x, y, bounds)
      const overlaps = data.nodes.some(node => (
        candidate.x < node.x + FLOWCHART_NODE_W &&
        candidate.x + FLOWCHART_NODE_W > node.x &&
        candidate.y < node.y + FLOWCHART_NODE_H &&
        candidate.y + FLOWCHART_NODE_H > node.y
      ))
      if (!overlaps) return candidate
    }
  }

  const fallbackOffset = data.nodes.length * 24
  return clampFlowchartNodePosition(left + fallbackOffset, top + fallbackOffset, bounds)
}

export function addFlowchartNode(
  data: FlowchartData,
  draft: FlowchartNodeDraft = {},
  createId: () => string = uuid,
  bounds: FlowchartBounds = data,
): FlowchartData {
  const type = draft.type ?? 'process'
  const position = draft.x === undefined || draft.y === undefined
    ? nextFlowchartNodePosition(data, bounds)
    : clampFlowchartNodePosition(draft.x, draft.y, bounds)

  return {
    ...data,
    nodes: [
      ...data.nodes,
      {
        id: createId(),
        label: draft.label ?? defaultFlowchartNodeLabel(type),
        type,
        ...position,
      },
    ],
  }
}

export function updateFlowchartNode(
  data: FlowchartData,
  id: string,
  changes: Partial<Omit<FlowchartNode, 'id'>>,
  bounds: FlowchartBounds = data,
): FlowchartData {
  return {
    ...data,
    nodes: data.nodes.map(node => {
      if (node.id !== id) return node
      const next = { ...node, ...changes }
      const position = clampFlowchartNodePosition(next.x, next.y, bounds)
      return { ...next, ...position }
    }),
  }
}

export function deleteFlowchartNode(data: FlowchartData, id: string): FlowchartData {
  return {
    ...data,
    nodes: data.nodes.filter(node => node.id !== id),
    edges: data.edges.filter(edge => edge.from !== id && edge.to !== id),
  }
}

export function connectFlowchartNodes(data: FlowchartData, from: string, to: string): FlowchartData {
  if (from === to) return data
  const hasFrom = data.nodes.some(node => node.id === from)
  const hasTo = data.nodes.some(node => node.id === to)
  const alreadyExists = data.edges.some(edge => edge.from === from && edge.to === to)
  if (!hasFrom || !hasTo || alreadyExists) return data
  return { ...data, edges: [...data.edges, { from, to }] }
}

export function clientPointToFlowchartPosition(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  zoom: number,
) {
  const scale = zoom || 1
  return {
    x: (clientX - rect.left) / scale - FLOWCHART_NODE_W / 2,
    y: (clientY - rect.top) / scale - FLOWCHART_NODE_H / 2,
  }
}

export function defaultTimeline(x: number, y: number): TimelineData {
  const today = new Date().toISOString().slice(0, 10)
  const monthOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return {
    x, y, width: WORKFLOW_W, height: WORKFLOW_H,
    groups: [{ id: uuid(), label: 'Schedule', bars: [] }],
    dateRange: { start: today, end: monthOut },
  }
}

function timelineSortKey(bar: TimelineBar) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(bar.start) ? bar.start : '9999-12-31'
  const time = /^\d{2}:\d{2}$/.test(bar.startTime ?? '') ? bar.startTime : '23:59'
  return `${date}T${time}`
}

export function getTimelineItems(data: TimelineData): TimelineItem[] {
  return data.groups
    .flatMap(group => group.bars.map(bar => ({ groupId: group.id, groupLabel: group.label, bar })))
    .sort((a, b) => {
      const byTime = timelineSortKey(a.bar).localeCompare(timelineSortKey(b.bar))
      if (byTime !== 0) return byTime
      return a.bar.label.localeCompare(b.bar.label)
    })
}

export function daysBetween(a: string, b: string): number {
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000)
  return isNaN(diff) ? 0 : diff
}

export function barOffsetPct(barStart: string, rangeStart: string, totalDays: number): number {
  return Math.min(100, Math.max(0, daysBetween(rangeStart, barStart) / totalDays) * 100)
}

// min 1% ensures zero-duration bars remain visible on screen
export function barWidthPct(barStart: string, barEnd: string, totalDays: number): number {
  return Math.max(1, (daysBetween(barStart, barEnd) / totalDays) * 100)
}
