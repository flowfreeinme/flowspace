type GoogleCalendarDate = {
  date?: string
  dateTime?: string
}

export type GoogleCalendarItem = {
  id?: string
  summary?: string
  location?: string
  status?: string
  start?: GoogleCalendarDate
  end?: GoogleCalendarDate
}

interface GoogleItemsToRowsOptions {
  includeExternalId?: boolean
}

function googleDateToIso(date: GoogleCalendarDate | undefined) {
  const raw = date?.dateTime ?? date?.date
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function googleItemsToRows(items: GoogleCalendarItem[], userId: string, options: GoogleItemsToRowsOptions = {}) {
  return items.flatMap(item => {
    const startTime = googleDateToIso(item.start)
    if (!startTime) return []

    const endTime = googleDateToIso(item.end) ?? startTime
    return [{
      user_id: userId,
      ...(options.includeExternalId && item.id ? { external_id: item.id } : {}),
      title: item.summary || 'Untitled',
      start_time: startTime,
      end_time: endTime,
      all_day: !!item.start?.date,
      ...(item.location ? { location: item.location } : {}),
      color: '#34a853',
      source: 'google',
    }]
  })
}
