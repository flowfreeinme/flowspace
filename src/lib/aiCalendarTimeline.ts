import type { AiAction } from './aiTypes'
import type { CalendarEvent } from '@/types/calendar'
import { formatCalendarEventsForAi, resolveCalendarRangeForPrompt } from './aiContext'

interface CalendarTimelineResponse {
  message: string
  actions: AiAction[]
}

function wantsCalendarTimeline(prompt: string, explicitRange: boolean) {
  const text = prompt.toLowerCase()
  if (!/\btimeline\b/.test(text)) return false
  return explicitRange || /\b(calendar|events?|schedule)\b/.test(text)
}

export function buildCalendarTimelineResponse(
  prompt: string,
  events: CalendarEvent[],
  now = new Date(),
): CalendarTimelineResponse | null {
  const range = resolveCalendarRangeForPrompt(prompt, now)
  if (!wantsCalendarTimeline(prompt, range.explicit)) return null

  const calendarItems = formatCalendarEventsForAi(events, now, {
    prompt,
    rangeLimit: 500,
    defaultLimit: 500,
  })

  if (!calendarItems.length) {
    return {
      message: `No calendar events found for ${range.label}.`,
      actions: [],
    }
  }

  const items = calendarItems.map(event => ({
    title: event.title,
    start: event.start,
    end: event.end,
    ...(event.startTime ? { startTime: event.startTime } : {}),
    ...(event.endTime ? { endTime: event.endTime } : {}),
    ...(event.location ? { location: event.location } : {}),
  }))

  return {
    message: `Found ${items.length} calendar event${items.length === 1 ? '' : 's'} for ${range.label}. Apply this to create a timeline ordered earliest to latest.`,
    actions: [{
      type: 'create_workflow',
      workflowType: 'timeline',
      title: `Calendar: ${range.label}`,
      items,
    }],
  }
}
