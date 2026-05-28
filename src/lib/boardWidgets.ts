import type { HomeWidgetType } from '@/types'
import { HOME_WIDGET_CATALOG } from './homeCenter'

export type BoardWidgetType = HomeWidgetType | 'todoList'

export interface BoardTodoItem {
  id: string
  text: string
  done: boolean
}

export interface BoardWidgetData {
  type: BoardWidgetType
  x: number
  y: number
  width: number
  height: number
  items?: BoardTodoItem[]
}

export const BOARD_WIDGET_MIN_WIDTH = 240
export const BOARD_WIDGET_MIN_HEIGHT = 160

export const BOARD_WIDGET_SIZES: Record<BoardWidgetType, { width: number; height: number }> = {
  calendar: { width: 420, height: 300 },
  today: { width: 320, height: 190 },
  focus: { width: 340, height: 250 },
  recent: { width: 340, height: 250 },
  quickCapture: { width: 300, height: 190 },
  proPlanner: { width: 360, height: 250 },
  focusTimer: { width: 320, height: 240 },
  weather: { width: 320, height: 235 },
  todoList: { width: 360, height: 300 },
}

export const BOARD_WIDGET_CATALOG = [
  { type: 'todoList' as const, title: 'To-do list', description: 'Track board tasks and check them off as you go.' },
  { type: 'calendar' as const, title: 'Mini calendar', description: 'Upcoming events and a compact date strip.' },
  ...HOME_WIDGET_CATALOG,
]

export const BOARD_WIDGET_TYPES = BOARD_WIDGET_CATALOG.map(item => item.type)

export function isBoardWidgetType(type: unknown): type is BoardWidgetType {
  return typeof type === 'string' && BOARD_WIDGET_TYPES.includes(type as BoardWidgetType)
}

export function getBoardWidgetMeta(type: BoardWidgetType) {
  return BOARD_WIDGET_CATALOG.find(item => item.type === type) ?? {
    type,
    title: 'Widget',
    description: 'Board widget',
  }
}

export function clampBoardWidgetSize(type: BoardWidgetType, width: number, height: number) {
  const defaults = BOARD_WIDGET_SIZES[type]
  return {
    width: Math.max(BOARD_WIDGET_MIN_WIDTH, Math.round(Number.isFinite(width) ? width : defaults.width)),
    height: Math.max(BOARD_WIDGET_MIN_HEIGHT, Math.round(Number.isFinite(height) ? height : defaults.height)),
  }
}

function parseTodoItems(items: unknown): BoardTodoItem[] {
  if (!Array.isArray(items)) return []
  return items.flatMap(item => {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as BoardTodoItem).id === 'string' &&
      typeof (item as BoardTodoItem).text === 'string' &&
      typeof (item as BoardTodoItem).done === 'boolean'
    ) {
      return [{
        id: (item as BoardTodoItem).id,
        text: (item as BoardTodoItem).text,
        done: (item as BoardTodoItem).done,
      }]
    }
    return []
  })
}

export function defaultBoardWidget(type: BoardWidgetType, x: number, y: number): BoardWidgetData {
  const size = BOARD_WIDGET_SIZES[type]
  return {
    type,
    x,
    y,
    width: size.width,
    height: size.height,
    ...(type === 'todoList' ? { items: [] } : {}),
  }
}

export function parseBoardWidget(content: string): BoardWidgetData {
  try {
    const data = JSON.parse(content) as Partial<BoardWidgetData>
    if (
      isBoardWidgetType(data.type) &&
      typeof data.x === 'number' &&
      typeof data.y === 'number'
    ) {
      return {
        type: data.type,
        x: data.x,
        y: data.y,
        ...clampBoardWidgetSize(data.type, data.width ?? BOARD_WIDGET_SIZES[data.type].width, data.height ?? BOARD_WIDGET_SIZES[data.type].height),
        ...(data.type === 'todoList' ? { items: parseTodoItems(data.items) } : {}),
      }
    }
  } catch {}

  return defaultBoardWidget('focusTimer', 0, 260)
}
