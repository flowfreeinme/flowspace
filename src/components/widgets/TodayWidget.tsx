import { useState, useEffect } from 'react'
import { Clock3 } from 'lucide-react'
import { useCalendar } from '@/stores/calendar'
import type { TodayConfig } from '@/types/widgetSettings'
import type { CalendarEvent } from '@/types/calendar'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) { return String(n).padStart(2, '0') }

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function TodayWidget({ config }: { config: TodayConfig }) {
  const [now, setNow] = useState(new Date())
  const { events } = useCalendar()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const today = new Date()
  const todayM = today.getMonth()
  const todayD = today.getDate()
  const hours = now.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12

  const nextEvent = events
    .filter(e => e.end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        <Clock3 size={14} className="text-accent" />
        Today
      </div>
      <p className="text-base font-medium text-gray-400">{config.greeting}</p>
      <p className="text-2xl font-semibold text-white">{DAYS[today.getDay()]}, {MONTHS[todayM]} {todayD}</p>
      {config.showClock && (
        <p className="mt-1 text-sm text-gray-500">{displayHour}:{pad(now.getMinutes())} {ampm}</p>
      )}
      {config.showNextEvent && (
        <div className="mt-auto rounded-xl border border-surface-3 bg-surface-2 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-gray-600">Next</p>
          <p className="truncate text-sm font-medium text-gray-200">
            {nextEvent ? nextEvent.title : 'No upcoming events'}
          </p>
          {nextEvent && <p className="text-xs text-gray-500">{formatEventTime(nextEvent)}</p>}
        </div>
      )}
    </div>
  )
}
