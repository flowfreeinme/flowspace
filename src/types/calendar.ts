export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  color?: string
  source: 'google' | 'ics'
}
