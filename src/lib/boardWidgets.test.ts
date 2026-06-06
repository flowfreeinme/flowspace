import { describe, expect, it } from 'vitest'
import {
  BOARD_WIDGET_CATALOG,
  BOARD_WIDGET_MIN_HEIGHT,
  BOARD_WIDGET_MIN_WIDTH,
  BOARD_WIDGET_SIZES,
  type BoardTodoItem,
  defaultBoardWidget,
  isBoardWidgetType,
  parseBoardWidget,
} from './boardWidgets'

describe('boardWidgets', () => {
  it('creates a default board widget at the requested position', () => {
    expect(defaultBoardWidget('weather', 120, 80)).toEqual({
      type: 'weather',
      x: 120,
      y: 80,
      ...BOARD_WIDGET_SIZES.weather,
    })
  })

  it('recognizes supported widget types', () => {
    expect(isBoardWidgetType('focusTimer')).toBe(true)
    expect(isBoardWidgetType('todoList')).toBe(true)
    expect(isBoardWidgetType('quickCapture')).toBe(true)
    expect(isBoardWidgetType('madeUpWidget')).toBe(false)
  })

  it('offers to-do list once and hides legacy quick capture from the board widget menu', () => {
    expect(BOARD_WIDGET_CATALOG.filter(item => item.type === 'todoList')).toHaveLength(1)
    expect(BOARD_WIDGET_CATALOG.some(item => (item.type as string) === 'quickCapture')).toBe(false)
  })

  it('creates a blank todo list widget for boards', () => {
    expect(defaultBoardWidget('todoList', 40, 60)).toEqual({
      type: 'todoList',
      x: 40,
      y: 60,
      ...BOARD_WIDGET_SIZES.todoList,
      items: [],
    })
  })

  it('keeps valid todo list items while parsing', () => {
    const items: BoardTodoItem[] = [
      { id: 'a', text: 'Draft proposal', done: false },
      { id: 'b', text: 'Send update', done: true },
    ]

    expect(parseBoardWidget(JSON.stringify({
      type: 'todoList',
      x: 10,
      y: 20,
      width: 360,
      height: 280,
      items,
    }))).toMatchObject({
      type: 'todoList',
      x: 10,
      y: 20,
      width: 360,
      height: 280,
      items,
    })
  })

  it('parses and clamps board widget sizes', () => {
    const parsed = parseBoardWidget(JSON.stringify({
      type: 'recent',
      x: 10,
      y: 20,
      width: 12,
      height: 12,
    }))

    expect(parsed).toMatchObject({
      type: 'recent',
      x: 10,
      y: 20,
      width: BOARD_WIDGET_MIN_WIDTH,
      height: BOARD_WIDGET_MIN_HEIGHT,
    })
  })

  it('falls back to a focus timer when content is invalid', () => {
    expect(parseBoardWidget('nope')).toMatchObject({
      type: 'focusTimer',
      x: 0,
      y: 260,
      ...BOARD_WIDGET_SIZES.focusTimer,
    })
  })
})
