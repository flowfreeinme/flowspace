import type { Page } from '@/types'
import type { CalendarEvent } from '@/types/calendar'
import {
  getTimelineItems,
  parseFlowchart,
  parseKanban,
  parseTimeline,
} from './workflowBlocks'
import { parseBoardWidget } from './boardWidgets'
import type { TodoContext, WorkflowContext } from './aiTypes'

type WorkflowBlockType = WorkflowContext['type']

const WORKFLOW_TYPES = new Set<WorkflowBlockType>(['kanban', 'timeline', 'flowchart'])
const MONTH_PATTERN = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const DATE_PATTERN = `(?:\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|(?:${MONTH_PATTERN})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?)`

interface CalendarFormatOptions {
  daysOut?: number
  prompt?: string
  limit?: number
  defaultLimit?: number
  rangeLimit?: number
}

export interface CalendarPromptRange {
  start: Date
  end: Date
  label: string
  explicit: boolean
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function isoDateLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function time24(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds())
}

function monthIndex(name: string) {
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    .findIndex(prefix => name.toLowerCase().startsWith(prefix))
}

function monthName(index: number) {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][index]
}

function parsePromptDate(token: string, now: Date) {
  const cleaned = token.trim().replace(/,/g, ' ').replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1').replace(/\s+/g, ' ')

  const iso = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))

  const slash = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slash) {
    const rawYear = slash[3] ? Number(slash[3]) : now.getFullYear()
    const year = rawYear < 100 ? 2000 + rawYear : rawYear
    return new Date(year, Number(slash[1]) - 1, Number(slash[2]))
  }

  const named = cleaned.match(new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?$`, 'i'))
  if (named) {
    const month = monthIndex(named[1])
    if (month >= 0) return new Date(named[3] ? Number(named[3]) : now.getFullYear(), month, Number(named[2]))
  }

  return null
}

export function resolveCalendarRangeForPrompt(
  prompt: string | undefined,
  now: Date,
  daysOut = 7,
): CalendarPromptRange {
  const text = (prompt ?? '').toLowerCase()
  const exact = text.match(new RegExp(`\\bfrom\\s+(${DATE_PATTERN})\\s+(?:to|through|until)\\s+(${DATE_PATTERN})`, 'i'))
  if (exact) {
    const startDate = parsePromptDate(exact[1], now)
    const endDate = parsePromptDate(exact[2], now)
    if (startDate && endDate) {
      const start = startOfDay(startDate)
      let end = endOfDay(endDate)
      if (end < start) end = endOfDay(new Date(endDate.getFullYear() + 1, endDate.getMonth(), endDate.getDate()))
      return { start, end, label: `from ${isoDateLocal(start)} to ${isoDateLocal(end)}`, explicit: true }
    }
  }

  const restOfMonth = text.match(new RegExp(`\\b(?:the\\s+)?(?:rest|remainder|remaining)\\s+of\\s+(${MONTH_PATTERN})\\b`, 'i'))
  if (restOfMonth) {
    const month = monthIndex(restOfMonth[1])
    if (month >= 0) {
      const year = month < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear()
      const start = month === now.getMonth() && year === now.getFullYear()
        ? startOfDay(now)
        : new Date(year, month, 1)
      const end = endOfDay(new Date(year, month + 1, 0))
      return { start, end, label: `rest of ${monthName(month)}`, explicit: true }
    }
  }

  if (/\bnext\s+week\b/.test(text)) {
    const start = startOfDay(addDays(now, 7))
    return { start, end: endOfDay(addDays(start, 6)), label: 'next week', explicit: true }
  }

  if (/\b(this|the|current)?\s*week\b/.test(text)) {
    const start = startOfDay(now)
    return { start, end: endOfDay(addDays(start, 6)), label: 'this week', explicit: true }
  }

  if (/\bnext\s+month\b/.test(text)) {
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 2, 0))
    return { start, end, label: 'next month', explicit: true }
  }

  if (/\b(this|the|current)?\s*month\b/.test(text)) {
    const start = startOfDay(now)
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    return { start, end, label: 'this month', explicit: true }
  }

  if (/\btomorrow\b/.test(text)) {
    const start = startOfDay(addDays(now, 1))
    return { start, end: endOfDay(start), label: 'tomorrow', explicit: true }
  }

  if (/\btoday\b/.test(text)) {
    const start = startOfDay(now)
    return { start, end: endOfDay(now), label: 'today', explicit: true }
  }

  return {
    start: now,
    end: new Date(now.getTime() + daysOut * 24 * 60 * 60 * 1000),
    label: `next ${daysOut} days`,
    explicit: false,
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatCalendarEventsForAi(
  events: CalendarEvent[],
  now: Date,
  options: number | CalendarFormatOptions = 7,
) {
  const opts = typeof options === 'number' ? { daysOut: options } : options
  const range = resolveCalendarRangeForPrompt(opts.prompt, now, opts.daysOut ?? 7)
  const limit = opts.limit ?? (range.explicit ? (opts.rangeLimit ?? 200) : (opts.defaultLimit ?? 14))

  return events
    .filter(event => event.end >= range.start && event.start <= range.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit)
    .map(event => ({
      title: event.title,
      date: event.allDay
        ? `${formatDate(event.start)}, all day`
        : `${formatDate(event.start)}, ${formatTime(event.start)}-${formatTime(event.end)}`,
      start: isoDateLocal(event.start),
      end: isoDateLocal(event.end),
      ...(event.allDay ? {} : { startTime: time24(event.start), endTime: time24(event.end) }),
      allDay: event.allDay,
      ...(event.location ? { location: event.location } : {}),
    }))
}

function summarizeKanban(content: string) {
  const data = parseKanban(content)
  return data.columns
    .flatMap(column => column.cards.map(card => {
      const assignee = card.assignee?.trim() ? ` (${card.assignee.trim()})` : ''
      return `${column.title || 'Column'}: ${card.text || 'Untitled task'}${assignee}`
    }))
    .filter(Boolean)
}

function summarizeTimeline(content: string) {
  const data = parseTimeline(content)
  return getTimelineItems(data).map(({ groupLabel, bar }) => {
    const time = bar.startTime
      ? ` ${bar.startTime}${bar.endTime ? `-${bar.endTime}` : ''}`
      : ''
    const location = bar.location?.trim() ? ` at ${bar.location.trim()}` : ''
    const range = bar.end && bar.end !== bar.start ? `${bar.start} to ${bar.end}` : bar.start
    return `${groupLabel || 'Timeline'}: ${bar.label || 'Untitled'} on ${range}${time}${location}`
  })
}

function summarizeFlowchart(content: string) {
  const data = parseFlowchart(content)
  const nodeName = (id: string) => data.nodes.find(node => node.id === id)?.label || id
  const nodes = data.nodes.map(node => node.label).filter(Boolean)
  const edges = data.edges.map(edge => {
    const label = edge.label?.trim() ? ` (${edge.label.trim()})` : ''
    return `${nodeName(edge.from)} -> ${nodeName(edge.to)}${label}`
  })
  return [
    nodes.length ? `Nodes: ${nodes.join(', ')}` : '',
    edges.length ? `Flow: ${edges.join('; ')}` : '',
  ].filter(Boolean)
}

export function buildWorkflowContext(pages: Page[], maxItemsPerBlock = 8): WorkflowContext[] {
  return pages.flatMap(page => page.blocks.flatMap(block => {
    if (!WORKFLOW_TYPES.has(block.type as WorkflowBlockType)) return []

    const type = block.type as WorkflowBlockType
    const items =
      type === 'kanban' ? summarizeKanban(block.content)
      : type === 'timeline' ? summarizeTimeline(block.content)
      : summarizeFlowchart(block.content)

    if (!items.length) return []
    return [{
      type,
      pageTitle: page.title || 'Untitled',
      items: items.slice(0, maxItemsPerBlock),
    }]
  }))
}

export function buildTodoContext(pages: Page[], maxItemsPerBoard = 12): TodoContext[] {
  return pages.flatMap(page => {
    const items = page.blocks
      .filter(block => block.type === 'boardWidget')
      .flatMap(block => {
        const data = parseBoardWidget(block.content)
        if (data.type !== 'todoList') return []
        return data.items ?? []
      })

    if (!items.length) return []

    const open = items
      .filter(item => !item.done)
      .map(item => item.text.trim())
      .filter(Boolean)
      .slice(0, maxItemsPerBoard)
    const done = items
      .filter(item => item.done)
      .map(item => item.text.trim())
      .filter(Boolean)
      .slice(0, maxItemsPerBoard)

    if (!open.length && !done.length) return []
    return [{
      pageTitle: page.title || 'Untitled',
      open,
      done,
    }]
  })
}
