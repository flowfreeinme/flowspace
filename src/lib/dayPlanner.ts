import type { WorkspaceContext } from '@/lib/aiTypes'
import type { CalendarEvent } from '@/types/calendar'
import type { Page } from '@/types'
import { buildTodoContext, buildWorkflowContext, formatCalendarEventsForAi } from './aiContext'

interface PlannerInput {
  now: Date
  pages: Record<string, Page>
  events: CalendarEvent[]
}

interface FallbackInput {
  now: Date
  pages: Page[]
  events: CalendarEvent[]
}

function isActivePage(page: Page) {
  return !page.folder && !page.archived
}

function formatShortTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function buildDayPlannerPrompt(now: Date) {
  return [
    `Create a practical plan for today (${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}).`,
    'Use calendar times and locations, unchecked to-do widget tasks, timeline date blocks, kanban task status, and flowchart order from the workspace context.',
    'Return a concise plan with: 1) top priority, 2) time blocks, 3) next three actions, 4) one thing to avoid.',
    'Keep it specific and under 140 words.',
  ].join('\n')
}

export function buildDayPlannerWorkspaceContext({ now, pages, events }: PlannerInput): WorkspaceContext {
  const activePages = Object.values(pages)
    .filter(isActivePage)
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt))
    .slice(0, 8)

  const upcomingEvents = events
    .filter(event => event.end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 8)

  const activeWork = activePages.length
    ? activePages.map(page => `- ${page.icon} ${page.title || 'Untitled'} (${page.boardMode ? 'board' : 'page'})`).join('\n')
    : 'No active boards or pages yet.'

  return {
    mode: 'page',
    page: {
      title: 'Home center day planner',
      blocks: [{ type: 'text', content: `Active FlowSpace work:\n${activeWork}` }],
    },
    allBoards: activePages.map(page => ({ title: page.title || 'Untitled', sections: [] })),
    workflows: buildWorkflowContext(activePages),
    todos: buildTodoContext(activePages),
    calendar: formatCalendarEventsForAi(upcomingEvents, now),
  }
}

export function createFallbackDayPlan({ now, pages, events }: FallbackInput) {
  const nextEvent = events
    .filter(event => event.end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]
  const topPage = [...pages]
    .filter(isActivePage)
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt))[0]

  const eventLine = nextEvent
    ? `Protect time around ${nextEvent.title} at ${nextEvent.allDay ? 'today' : formatShortTime(nextEvent.start)}.`
    : 'No calendar pressure is visible, so start with the most important workspace item.'
  const workLine = topPage
    ? `Move ${topPage.title || 'your latest board'} forward with one concrete next step.`
    : 'Capture one priority before adding more work.'

  return [
    'Local plan',
    `1. ${eventLine}`,
    `2. ${workLine}`,
    '3. Batch small admin tasks after your first focused block.',
    'Avoid starting five different boards before one thing has visibly moved.',
  ].join('\n')
}
