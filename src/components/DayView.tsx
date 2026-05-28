import { useState } from 'react'
import { ArrowLeft, MapPin, Plus } from 'lucide-react'
import { useCalendar } from '@/stores/calendar'
import { useWorkspace } from '@/stores/workspace'
import EventModal from './EventModal'
import type { CalendarEvent } from '@/types/calendar'
import { getTimedEventBlock } from '@/lib/calendarLayout'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 72
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatHour(h: number) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface DayViewProps {
  date: Date
  onBack: () => void
}

export default function DayView({ date, onBack }: DayViewProps) {
  const { events } = useCalendar()
  const { pages, openTab } = useWorkspace()
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [newEventHour, setNewEventHour] = useState<number | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()

  const dayEvents = events.filter(e => {
    const s = new Date(e.start)
    return s.getFullYear() === y && s.getMonth() === m && s.getDate() === d
  })

  const allDayEvents = dayEvents.filter(e => e.allDay)
  const timedEvents = dayEvents.filter(e => !e.allDay)

  const dayPages = Object.values(pages).filter(p => {
    const c = new Date(p.createdAt)
    return c.getFullYear() === y && c.getMonth() === m && c.getDate() === d
  })

  const isToday = (() => {
    const t = new Date()
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d
  })()

  function handleSlotClick(hour: number) {
    setNewEventHour(hour)
    setShowNewModal(true)
  }

  return (
    <div className="flex-1 min-h-0 bg-surface-0 overflow-hidden">
      <div className="h-full flex flex-col px-5 pt-5 pb-5">

        {/* Header */}
        <div className="flex items-center gap-4 mb-5 shrink-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Week view
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">
              {DAYS[date.getDay()]}, {MONTHS[m]} {d}
              {isToday && <span className="ml-3 text-sm font-normal text-accent bg-accent/10 px-2 py-0.5 rounded-full">Today</span>}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{y}</p>
          </div>
          <button
            onClick={() => { setNewEventHour(9); setShowNewModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} /> New event
          </button>
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="mb-4 bg-surface-1 border border-surface-3 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">All day</p>
            <div className="space-y-1">
              {allDayEvents.map(ev => (
                <button key={ev.id} onClick={() => setEditEvent(ev)}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `${ev.color}22`, color: ev.color }}>
                  {ev.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pages created today */}
        {dayPages.length > 0 && (
          <div className="mb-4 bg-surface-1 border border-surface-3 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Pages created today</p>
            <div className="space-y-1">
              {dayPages.map(p => (
                <button key={p.id} onClick={() => openTab(p.id)}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-sm text-accent hover:bg-accent/10 transition-colors">
                  {p.icon} {p.title || 'Untitled'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hour grid */}
        <div className="flex-1 min-h-0 bg-surface-1 border border-surface-3 rounded-2xl overflow-y-auto">
          <div className="relative" style={{ height: HOUR_HEIGHT * 24 }}>
            {HOURS.map(hour => {
              const isCurrentHour = isToday && new Date().getHours() === hour

              return (
              <div
                key={hour}
                onClick={() => handleSlotClick(hour)}
                className={`flex border-b border-surface-3 last:border-0 cursor-pointer group transition-colors ${
                  isCurrentHour ? 'bg-accent/5' : 'hover:bg-surface-2/50'
                }`}
                style={{ height: HOUR_HEIGHT }}
              >
                {/* Hour label */}
                <div className="w-16 shrink-0 px-3 pt-2 text-xs text-gray-600 font-medium">
                  {formatHour(hour)}
                </div>

                <div className="flex-1 py-1 pr-2">
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-gray-700 transition-opacity px-2 py-1">
                    <Plus size={10} /> Add event
                  </div>
                </div>

                {/* Current time indicator */}
                {isCurrentHour && (
                  <div className="absolute left-16 right-0 flex items-center pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <div className="flex-1 h-px bg-accent" />
                  </div>
                )}
              </div>
              )
            })}

            <div className="absolute left-16 right-2 top-0 bottom-0 pointer-events-none">
              {timedEvents.map(ev => {
                const block = getTimedEventBlock({ day: date, start: new Date(ev.start), end: new Date(ev.end), hourHeight: HOUR_HEIGHT, minHeight: 46 })
                return (
                  <button
                    key={ev.id}
                    onClick={() => setEditEvent(ev)}
                    className="absolute left-0 right-0 text-left px-3 py-2 rounded-lg text-xs hover:opacity-80 transition-opacity pointer-events-auto overflow-hidden"
                    style={{
                      top: block.top,
                      height: block.height,
                      backgroundColor: `${ev.color}33`,
                      color: ev.color,
                    }}
                  >
                    <span className="block font-semibold text-[11px] leading-tight opacity-90">
                      {new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      {' - '}
                      {new Date(ev.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="block truncate text-sm font-medium leading-snug text-white">{ev.title}</span>
                    {ev.location && (
                      <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-tight opacity-85">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {editEvent && <EventModal event={editEvent} onClose={() => setEditEvent(null)} />}
      {showNewModal && (
        <EventModal
          defaultDate={date}
          defaultHour={newEventHour ?? 9}
          onClose={() => { setShowNewModal(false); setNewEventHour(null) }}
        />
      )}
    </div>
  )
}
