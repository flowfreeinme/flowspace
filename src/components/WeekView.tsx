import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react'
import { useCalendar } from '@/stores/calendar'
import { useWorkspace } from '@/stores/workspace'
import EventModal from './EventModal'
import { getTimedEventBlock } from '@/lib/calendarLayout'
import type { CalendarEvent } from '@/types/calendar'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 64

function formatHour(h: number) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface WeekViewProps {
  date: Date
  onBack: () => void
  onDayClick: (date: Date) => void
}

export default function WeekView({ date, onBack, onDayClick }: WeekViewProps) {
  const { events } = useCalendar()
  const { pages } = useWorkspace()
  const today = new Date()

  const [weekOffset, setWeekOffset] = useState(0)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [newEventDate, setNewEventDate] = useState<Date>(date)
  const [newEventHour, setNewEventHour] = useState(9)

  // Compute the Sunday of the week containing `date`, then apply offset
  const sunday = new Date(date)
  sunday.setDate(date.getDate() - date.getDay() + weekOffset * 7)
  sunday.setHours(0, 0, 0, 0)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })

  const startLabel = `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()}`
  const endLabel = weekDays[6].getMonth() !== weekDays[0].getMonth()
    ? `${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`
    : `${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`

  function isToday(d: Date) {
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }

  function eventsOnDay(d: Date) {
    return events.filter(e => {
      const s = new Date(e.start)
      return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate()
    })
  }

  function pagesOnDay(d: Date) {
    return Object.values(pages).filter(p => {
      const c = new Date(p.createdAt)
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() && c.getDate() === d.getDate()
    })
  }

  function timedEventsOn(d: Date) {
    return eventsOnDay(d).filter(e => !e.allDay)
  }

  function allDayEventsOn(d: Date) {
    return eventsOnDay(d).filter(e => e.allDay)
  }

  function handleSlotClick(d: Date, hour: number) {
    setNewEventDate(d)
    setNewEventHour(hour)
    setShowNewModal(true)
  }

  const hasAllDay = weekDays.some(d => allDayEventsOn(d).length > 0)

  return (
    <div className="flex-1 min-h-0 bg-surface-0 overflow-hidden">
      <div className="h-full flex flex-col px-5 pt-5 pb-5">

        {/* Header */}
        <div className="flex items-center gap-4 mb-5 shrink-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Month view
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{startLabel} – {endLabel}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setWeekOffset(0)} className="text-xs px-2 py-1 rounded-lg bg-surface-2 text-gray-400 hover:text-white hover:bg-surface-3 transition-colors border border-surface-4">
              This week
            </button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => { setNewEventDate(date); setNewEventHour(9); setShowNewModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} /> New event
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="grid border-b border-surface-3" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div className="border-r border-surface-3" />
            {weekDays.map((d, i) => {
              const today_ = isToday(d)
              const hasItems = eventsOnDay(d).length > 0 || pagesOnDay(d).length > 0
              return (
                <button
                  key={i}
                  onClick={() => onDayClick(d)}
                  className={`py-3 text-center border-r border-surface-3 last:border-r-0 hover:bg-surface-2/50 transition-colors group`}
                >
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{DAY_NAMES[d.getDay()]}</p>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-semibold transition-colors ${
                    today_ ? 'bg-accent text-white' : 'text-gray-300 group-hover:bg-surface-3'
                  }`}>
                    {d.getDate()}
                  </div>
                  {hasItems && <div className="w-1 h-1 rounded-full bg-accent mx-auto mt-1" />}
                </button>
              )
            })}
          </div>

          {/* All-day row */}
          {hasAllDay && (
            <div className="grid border-b border-surface-3" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              <div className="border-r border-surface-3 px-1 pt-1.5">
                <span className="text-xs text-gray-600">all day</span>
              </div>
              {weekDays.map((d, i) => (
                <div key={i} className="border-r border-surface-3 last:border-r-0 p-1 space-y-0.5 min-h-[32px]">
                  {allDayEventsOn(d).map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => setEditEvent(ev)}
                      className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: `${ev.color}22`, color: ev.color }}
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Hour rows */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
              {HOURS.map(hour => {
                const isCurrentHour = hour === today.getHours()
                return (
                  <div key={hour} className="grid border-b border-surface-3 last:border-0" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', height: HOUR_HEIGHT }}>
                    <div className="border-r border-surface-3 px-2 pt-1.5 shrink-0">
                      <span className="text-xs text-gray-600 font-medium">{formatHour(hour)}</span>
                    </div>
                    {weekDays.map((d, ci) => {
                      const isTodaySlot = isToday(d) && isCurrentHour
                      return (
                        <div
                          key={ci}
                          onClick={() => handleSlotClick(d, hour)}
                          className={`border-r border-surface-3 last:border-r-0 p-0.5 cursor-pointer transition-colors group ${
                            isTodaySlot ? 'bg-accent/5' : 'hover:bg-surface-2/50'
                          }`}
                        >
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-xs text-gray-700 transition-opacity px-1 py-0.5">
                            <Plus size={9} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              <div className="absolute inset-y-0 left-[52px] right-0 grid pointer-events-none" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {weekDays.map((d, dayIndex) => (
                  <div key={dayIndex} className="relative border-r border-transparent last:border-r-0">
                    {timedEventsOn(d).map(ev => {
                      const block = getTimedEventBlock({ day: d, start: new Date(ev.start), end: new Date(ev.end), hourHeight: HOUR_HEIGHT, minHeight: 44 })
                      return (
                        <button
                          key={ev.id}
                          className="absolute left-1 right-1 text-left text-[11px] px-2 py-1.5 rounded leading-tight overflow-hidden hover:opacity-80 transition-opacity pointer-events-auto"
                          style={{
                            top: block.top,
                            height: block.height,
                            backgroundColor: `${ev.color}33`,
                            color: ev.color,
                          }}
                          onClick={() => setEditEvent(ev)}
                        >
                          <span className="block font-medium truncate">
                            {new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            {' - '}
                            {new Date(ev.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="block truncate text-xs font-medium text-white">{ev.title}</span>
                          {ev.location && (
                            <span className="mt-0.5 flex items-center gap-0.5 truncate opacity-85">
                              <MapPin size={9} className="shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editEvent && <EventModal event={editEvent} onClose={() => setEditEvent(null)} />}
      {showNewModal && (
        <EventModal
          defaultDate={newEventDate}
          defaultHour={newEventHour}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  )
}
