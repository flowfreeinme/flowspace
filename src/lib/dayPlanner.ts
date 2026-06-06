import type { WorkspaceContext } from '@/lib/aiTypes'
import type { CalendarEvent } from '@/types/calendar'
import type { Page } from '@/types'
import type { ProPlannerConfig } from '@/types/widgetSettings'
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
  config?: Partial<Pick<ProPlannerConfig, 'workStart' | 'workEnd' | 'focusStyle' | 'customInstructions'>>
}

export interface DayPlanSection {
  title: string
  items: string[]
}

const DAY_PLAN_SECTION_TITLES = [
  'Local plan',
  'Priority stack',
  'Time-blocked schedule',
  'Time blocks',
  'Execution notes',
  'Next actions',
  'Contingency plan',
  'Avoid',
]

function isActivePage(page: Page) {
  return !page.folder && !page.archived
}

function formatShortTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatFocusStyle(style: ProPlannerConfig['focusStyle'] | undefined) {
  return (style ?? 'balanced').replace('-', ' ')
}

function extractPlannerBlockText(content: string) {
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed?.title === 'string') return parsed.title
    if (typeof parsed?.text === 'string') return parsed.text.replace(/<[^>]+>/g, ' ')
    if (typeof parsed?.label === 'string') return parsed.label
  } catch {}
  return content
}

function summarizePageForPlanner(page: Page) {
  const snippets = page.blocks
    .filter(block => block.type !== 'image' && block.type !== 'file' && block.type !== 'divider')
    .map(block => extractPlannerBlockText(block.content).trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(text => text.replace(/\s+/g, ' ').slice(0, 140))

  const detail = snippets.length ? ` — ${snippets.join(' · ')}` : ''
  return `- ${page.icon || '•'} ${page.title || 'Untitled'} (${page.boardMode ? 'board' : 'page'})${detail}`
}

function cleanPlanLine(line: string) {
  return line
    .trim()
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^\[[ x]\]\s+/i, '')
    .trim()
}

function normalizePlanHeading(line: string) {
  const cleaned = line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/:$/, '')
    .trim()

  const match = DAY_PLAN_SECTION_TITLES.find(title => cleaned.toLowerCase() === title.toLowerCase())
  return match ?? null
}

export function parseDayPlanSections(plan: string): DayPlanSection[] {
  const sections: DayPlanSection[] = []
  let current: DayPlanSection | null = null

  for (const rawLine of plan.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const heading = normalizePlanHeading(line)
    if (heading) {
      current = { title: heading, items: [] }
      sections.push(current)
      continue
    }

    if (!current) {
      current = { title: 'Plan', items: [] }
      sections.push(current)
    }

    const item = cleanPlanLine(line)
    if (item) current.items.push(item)
  }

  return sections.filter(section => section.items.length > 0)
}

export function buildDayPlannerPrompt(
  now: Date,
  config: Partial<Pick<ProPlannerConfig, 'workStart' | 'workEnd' | 'focusStyle' | 'customInstructions'>> = {},
) {
  const workStart = config.workStart || '09:00'
  const workEnd = config.workEnd || '17:00'
  const focusStyle = formatFocusStyle(config.focusStyle)
  const customInstructions = config.customInstructions?.trim()

  return [
    `Create an in-depth plan for today (${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}).`,
    `Work window: ${workStart}-${workEnd}. Planning style: ${focusStyle}.`,
    customInstructions ? `User instructions: ${customInstructions}` : '',
    'Use calendar times and locations, unchecked to-do widget tasks, timeline date blocks, kanban task status, and flowchart order from the workspace context.',
    'Put the plan inside the JSON "message" field and keep "actions" as [].',
    'Return these sections:',
    'Priority stack',
    '- Top outcome',
    '- Second outcome',
    '- Third outcome',
    'Time-blocked schedule',
    '- 09:00-10:30: Focus block',
    '- Meeting/event blocks with buffer notes',
    'Execution notes',
    '- Dependencies, context switches, and one risk to watch',
    'Next actions',
    '- Five concrete actions the user can start checking off',
    'Contingency plan',
    '- What to cut or move if the day slips',
    'Use those exact section headings. Use short bullets, not dense paragraphs.',
    'Keep it specific, grounded in named boards/pages/events, and around 220-320 words.',
  ].filter(Boolean).join('\n')
}

export function buildDayPlannerWorkspaceContext({ now, pages, events }: PlannerInput): WorkspaceContext {
  const activePages = Object.values(pages)
    .filter(isActivePage)
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt))
    .slice(0, 12)

  const upcomingEvents = events
    .filter(event => event.end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 16)

  const activeWork = activePages.length
    ? activePages.map(summarizePageForPlanner).join('\n')
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
  const nextWorkTitle = topPage?.title || 'your main workspace item'

  return [
    'Local plan',
    '',
    'Priority stack',
    `1. ${eventLine}`,
    `2. ${workLine}`,
    '3. Clear one small admin item only after the main work block starts moving.',
    '',
    'Time blocks',
    `- Now: define the first visible win for ${nextWorkTitle}.`,
    nextEvent ? `- Before/after ${nextEvent.title}: leave a buffer so the meeting does not consume the whole day.` : '- Midday: protect one uninterrupted focus block.',
    '- Later: batch review, cleanup, and quick replies together.',
    '',
    'Next actions',
    `- Open ${nextWorkTitle}.`,
    '- Write the next concrete task in one sentence.',
    '- Move or check off one item.',
    '- Review calendar conflicts before committing to more work.',
    '- End by choosing tomorrow’s first task.',
    '',
    'Avoid',
    'Starting five different boards before one thing has visibly moved.',
  ].join('\n')
}
