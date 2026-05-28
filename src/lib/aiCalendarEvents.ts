import type { CalendarEvent } from '@/types/calendar'

interface CalendarEventsForAiInput {
  prompt: string
  currentEvents: CalendarEvent[] | undefined
  userId: string | undefined
  loadEvents: (userId: string) => Promise<void>
  getEvents: () => CalendarEvent[]
}

export function shouldRefreshCalendarForPrompt(prompt: string) {
  return /\b(calendar|events?|schedule|timeline|date|dates|today|tomorrow|week|month|rest|remainder|remaining|from|through|until|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2})\b/i.test(prompt)
}

export async function getCalendarEventsForAi({
  prompt,
  currentEvents,
  userId,
  loadEvents,
  getEvents,
}: CalendarEventsForAiInput) {
  const fallback = currentEvents ?? []
  if (!userId || !shouldRefreshCalendarForPrompt(prompt)) return fallback

  try {
    await loadEvents(userId)
    const loaded = getEvents()
    return loaded.length || fallback.length === 0 ? loaded : fallback
  } catch {
    return fallback
  }
}
