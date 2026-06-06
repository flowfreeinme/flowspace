import { describe, it, expect } from 'vitest'
import { STARTER_TEMPLATES } from './starterTemplates'
import { HOME_GRID_COLUMNS, HOME_GRID_ROWS } from './homeCenter'

const VALID_BLOCK_TYPES = ['textbox', 'section', 'text', 'heading1', 'heading2', 'heading3',
  'todo', 'bullet', 'numbered', 'code', 'divider', 'quote', 'file', 'image', 'kanban', 'flowchart', 'timeline']
const VALID_WIDGET_TYPES = ['calendar', 'today', 'focus', 'recent', 'todoList', 'proPlanner', 'focusTimer', 'weather']
const HOME_COLS = HOME_GRID_COLUMNS
const HOME_ROWS = HOME_GRID_ROWS

describe('STARTER_TEMPLATES', () => {
  it('exports workspace packs and single-board templates with unique ids', () => {
    const ids = STARTER_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(STARTER_TEMPLATES.filter(t => t.category === 'workspace')).toHaveLength(3)
    expect(STARTER_TEMPLATES.some(t => t.category === 'board')).toBe(true)
  })

  it('every template has required fields', () => {
    for (const t of STARTER_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(Array.isArray(t.tags)).toBe(true)
      expect(t.boardCount).toBeGreaterThan(0)
      expect(t.buildBoards()).toHaveLength(t.boardCount)
      expect(Array.isArray(t.widgets)).toBe(true)
    }
  })

  it('workspace packs have exactly 3 boards and board templates have one board', () => {
    expect(STARTER_TEMPLATES.filter(t => t.category === 'workspace').every(t => t.boardCount === 3)).toBe(true)
    expect(STARTER_TEMPLATES.filter(t => t.category === 'board').every(t => t.boardCount === 1)).toBe(true)
  })

  it('every board has a title, icon, and at least one block', () => {
    for (const t of STARTER_TEMPLATES) {
      for (const b of t.buildBoards()) {
        expect(b.title).toBeTruthy()
        expect(b.icon).toBeTruthy()
        if (t.id !== 'board-blank') expect(b.blocks.length).toBeGreaterThan(0)
      }
    }
  })

  it('every block has a valid type and string content', () => {
    for (const t of STARTER_TEMPLATES) {
      for (const b of t.buildBoards()) {
        for (const block of b.blocks) {
          expect(VALID_BLOCK_TYPES).toContain(block.type)
          expect(typeof block.content).toBe('string')
        }
      }
    }
  })

  it('every template widget layout includes exactly one calendar widget', () => {
    for (const t of STARTER_TEMPLATES.filter(t => t.widgets.length > 0)) {
      const calendars = t.widgets.filter(w => w.type === 'calendar')
      expect(calendars).toHaveLength(1)
    }
  })

  it('every widget has a valid type and fits within the 12x12 grid', () => {
    for (const t of STARTER_TEMPLATES) {
      for (const w of t.widgets) {
        expect(VALID_WIDGET_TYPES).toContain(w.type)
        expect(w.x).toBeGreaterThanOrEqual(0)
        expect(w.y).toBeGreaterThanOrEqual(0)
        expect(w.x + w.w).toBeLessThanOrEqual(HOME_COLS)
        expect(w.y + w.h).toBeLessThanOrEqual(HOME_ROWS)
      }
    }
  })

  it('no two widgets in a template share the same id', () => {
    for (const t of STARTER_TEMPLATES.filter(t => t.widgets.length > 0)) {
      const ids = t.widgets.map(w => w.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('workspace packs include a complete home widget preset', () => {
    for (const t of STARTER_TEMPLATES.filter(t => t.category === 'workspace')) {
      expect(t.widgets).toHaveLength(7)
      expect(t.widgets.map(w => w.type)).toEqual(expect.arrayContaining([
        'calendar', 'today', 'focus', 'todoList', 'weather',
      ]))
    }
  })

  it('student template includes focusTimer and AI planner widgets', () => {
    const student = STARTER_TEMPLATES.find(t => t.id === 'student')!
    expect(student.widgets.some(w => w.type === 'focusTimer')).toBe(true)
    expect(student.widgets.some(w => w.type === 'proPlanner')).toBe(true)
  })

  it('student template sets focusTimer breakEnabled', () => {
    const student = STARTER_TEMPLATES.find(t => t.id === 'student')!
    expect(student.widgetSettings?.focusTimer?.breakEnabled).toBe(true)
  })

  it('personal template includes todoList and recent widgets', () => {
    const personal = STARTER_TEMPLATES.find(t => t.id === 'personal')!
    expect(personal.widgets.some(w => w.type === 'todoList')).toBe(true)
    expect(personal.widgets.some(w => w.type === 'recent')).toBe(true)
    expect(personal.widgets.some(w => w.type === 'weather')).toBe(true)
  })

  it('does not ship quick capture widgets or settings in starter templates', () => {
    for (const template of STARTER_TEMPLATES) {
      expect(template.widgets.some(widget => (widget.type as string) === 'quickCapture')).toBe(false)
      expect(Object.keys(template.widgetSettings ?? {})).not.toContain('quickCapture')
    }
  })

  it('team template includes recent and AI planner widgets', () => {
    const team = STARTER_TEMPLATES.find(t => t.id === 'team')!
    expect(team.widgets.some(w => w.type === 'recent')).toBe(true)
    expect(team.widgets.some(w => w.type === 'proPlanner')).toBe(true)
  })
})
