import { v4 as uuid } from 'uuid'
import type { BlockType } from '@/types'
import type { AiAction } from './aiTypes'
import {
  FLOWCHART_NODE_H,
  FLOWCHART_NODE_W,
  TIMELINE_COLORS,
  WORKFLOW_H,
  WORKFLOW_W,
} from './workflowBlocks'

interface CreatedWorkflowBlock {
  type: Extract<BlockType, 'kanban' | 'timeline' | 'flowchart'>
  content: string
}

function cleanLabel(item: NonNullable<AiAction['items']>[number], fallback: string) {
  return (item.title || item.text || fallback).trim().slice(0, 80)
}

function isIsoDate(value?: string) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isClockTime(value?: string) {
  return !!value && /^\d{2}:\d{2}$/.test(value)
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function normalizedStatus(item: NonNullable<AiAction['items']>[number]) {
  const raw = `${item.status || item.section || ''}`.toLowerCase()
  if (raw.includes('done') || raw.includes('complete')) return 'Done'
  if (raw.includes('progress') || raw.includes('doing')) return 'In Progress'
  return 'To Do'
}

export function createWorkflowBlockFromAiAction(
  action: AiAction,
  x: number,
  y: number,
  createId: () => string = uuid,
): CreatedWorkflowBlock | null {
  if (action.type !== 'create_workflow' || !action.workflowType) return null
  const items = action.items?.length ? action.items : [{ title: action.title || 'New item' }]

  if (action.workflowType === 'kanban') {
    const columns = ['To Do', 'In Progress', 'Done'].map(title => ({ id: createId(), title, cards: [] as { id: string; text: string }[] }))
    items.forEach((item, index) => {
      const title = normalizedStatus(item)
      const column = columns.find(c => c.title === title) ?? columns[0]
      column.cards.push({ id: createId(), text: cleanLabel(item, `Task ${index + 1}`) })
    })
    return { type: 'kanban', content: JSON.stringify({ x, y, width: WORKFLOW_W, height: WORKFLOW_H, columns }) }
  }

  if (action.workflowType === 'timeline') {
    const fallbackDate = todayIsoDate()
    const bars = items.map((item, index) => {
      const start = isIsoDate(item.start) ? item.start! : fallbackDate
      const end = isIsoDate(item.end) ? item.end! : start
      return {
        id: createId(),
        label: cleanLabel(item, `Time block ${index + 1}`),
        start,
        end,
        color: item.color || TIMELINE_COLORS[index % TIMELINE_COLORS.length],
        ...(isClockTime(item.startTime) ? { startTime: item.startTime } : {}),
        ...(isClockTime(item.endTime) ? { endTime: item.endTime } : {}),
        ...(item.location?.trim() ? { location: item.location.trim().slice(0, 80) } : {}),
      }
    })
    const dates = bars.flatMap(bar => [bar.start, bar.end]).sort()
    return {
      type: 'timeline',
      content: JSON.stringify({
        x, y,
        width: WORKFLOW_W,
        height: WORKFLOW_H,
        groups: [{ id: createId(), label: action.title || 'Schedule', bars }],
        dateRange: { start: dates[0] || fallbackDate, end: dates[dates.length - 1] || fallbackDate },
      }),
    }
  }

  const nodes = items.map((item, index) => ({
    id: createId(),
    label: cleanLabel(item, `Step ${index + 1}`),
    type: index === 0 ? 'start' : index === items.length - 1 ? 'end' : 'process',
    x: 24 + index * (FLOWCHART_NODE_W + 44),
    y: 72 + (index % 2) * (FLOWCHART_NODE_H + 28),
  }))
  const edges = nodes.slice(0, -1).map((node, index) => ({ from: node.id, to: nodes[index + 1].id }))

  return { type: 'flowchart', content: JSON.stringify({ x, y, width: WORKFLOW_W, height: WORKFLOW_H, nodes, edges }) }
}
