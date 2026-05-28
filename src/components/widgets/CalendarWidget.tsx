import { useState, useEffect, useRef } from 'react'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { useCalendar } from '@/stores/calendar'
import { useAuth } from '@/stores/auth'
import CalendarImport from '../CalendarImport'
import EventModal from '../EventModal'
import type { CalendarEvent } from '@/types/calendar'
import type { CalendarConfig } from '@/types/widgetSettings'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CalendarWidgetProps {
  config: CalendarConfig
  onSelectWeek: (date: Date) => void
}

export default function CalendarWidget({ config, onSelectWeek }: CalendarWidgetProps) {
  const { pages, openTab } = useWorkspace()
  const { events, loadEvents } = useCalendar()
  const { user } = useAuth()

  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth()
  const todayD = today.getDate()

  const [viewYear, setViewYear] = useState(todayY)
  const [viewMonth, setViewMonth] = useState(todayM)
  const [showImport, setShowImport] = useState(false)
  const [showCalendarMenu, setShowCalendarMenu] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEventDate, setNewEventDate] = useState<Date | null>(null)
  const calendarMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) loadEvents(user.id)
  }, [user])

  useEffect(() => {
    if (!showCalendarMenu) return
    function closeMenu(e: MouseEvent) {
      if (!calendarMenuRef.current?.contains(e.target as Node)) setShowCalendarMenu(false)
    }
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowCalendarMenu(false)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showCalendarMenu])

  function openNewEvent(date = new Date()) {
    setNewEventDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    setShowNewEvent(true)
    setShowCalendarMenu(false)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function goToday() { setViewMonth(todayM); setViewYear(todayY) }

  function pagesForDay(day: number) {
    return Object.values(pages).filter(p => {
      const d = new Date(p.createdAt)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day
    })
  }

  function eventsForDay(day: number) {
    return events.filter(e => {
      const d = new Date(e.start)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day
    })
  }

  const weekOffset = config.weekStartsOn === 'monday' ? 1 : 0
  const calDays = weekOffset === 1
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : DAYS
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate()
  const calFirstDay = (new Date(viewYear, viewMonth, 1).getDay() - weekOffset + 7) % 7
  const calCells: { day: number; curr: boolean; dow: number }[] = []
  for (let i = calFirstDay - 1; i >= 0; i--) calCells.push({ day: daysInPrev - i, curr: false, dow: (weekOffset + calCells.length) % 7 })
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ day: d, curr: true, dow: (weekOffset + calCells.length) % 7 })
  while (calCells.length % 7 !== 0) calCells.push({ day: calCells.length - daysInMonth - calFirstDay + 1, curr: false, dow: (weekOffset + calCells.length) % 7 })

  const visibleDays = config.showWeekends ? calDays : calDays.filter(d => d !== 'Sat' && d !== 'Sun')
  const colCount = config.showWeekends ? 7 : 5

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">{MONTHS[viewMonth]} {viewYear}</h2>
            {(viewMonth !== todayM || viewYear !== todayY) && (
              <button onClick={goToday} className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[11px] text-accent transition-colors hover:bg-accent/30">
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative" ref={calendarMenuRef}>
              <button
                onClick={() => setShowCalendarMenu(v => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500 active:bg-blue-700"
                title="Calendar actions"
                aria-label="Calendar actions"
                aria-expanded={showCalendarMenu}
              >
                <Plus size={18} strokeWidth={2.6} />
              </button>
              {showCalendarMenu && (
                <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-surface-4 bg-surface-2 shadow-2xl">
                  <button
                    onClick={() => { setShowImport(true); setShowCalendarMenu(false) }}
                    className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-3"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-4 text-blue-300">
                      <CalendarDays size={15} />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">Import calendar</span>
                      <span className="block text-[11px] leading-snug text-gray-500">Google Calendar or .ics file</span>
                    </span>
                  </button>
                  <button
                    onClick={() => openNewEvent()}
                    className="flex w-full items-start gap-3 border-t border-surface-4/70 px-3 py-3 text-left transition-colors hover:bg-surface-3"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300">
                      <CalendarPlus size={15} />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">Create event</span>
                      <span className="block text-[11px] leading-snug text-gray-500">Add a new event for today</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button onClick={prevMonth} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-surface-3 hover:text-white">
              <ChevronLeft size={15} />
            </button>
            <button onClick={nextMonth} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-surface-3 hover:text-white">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="grid shrink-0 border-b border-surface-3" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
          {visibleDays.map(d => (
            <div key={d} className="py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-gray-600">{d}</div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
          {calCells.filter(cell => {
            if (config.showWeekends) return true
            const dow = cell.dow % 7
            if (weekOffset === 1) return dow !== 0 && dow !== 6
            return dow >= 1 && dow <= 5
          }).map((cell, i, arr) => {
            const isToday = cell.curr && cell.day === todayD && viewMonth === todayM && viewYear === todayY
            const dayPages = cell.curr ? pagesForDay(cell.day) : []
            const dayEvents = cell.curr ? eventsForDay(cell.day) : []
            const isLastRow = i >= arr.length - colCount
            const isLastCol = (i + 1) % colCount === 0

            return (
              <div
                key={i}
                onClick={() => cell.curr && onSelectWeek(new Date(viewYear, viewMonth, cell.day))}
                className={`relative min-h-0 overflow-hidden p-2 ${!isLastRow ? 'border-b border-surface-3' : ''} ${!isLastCol ? 'border-r border-surface-3' : ''} ${cell.curr ? 'cursor-pointer bg-surface-1 hover:bg-surface-2/50' : 'bg-surface-0/50'} group transition-colors`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isToday ? 'bg-accent font-bold text-white' : cell.curr ? 'text-gray-300 group-hover:bg-surface-3' : 'text-gray-700'
                  }`}>
                    {cell.day}
                  </span>
                  {cell.curr && (
                    <button
                      onClick={e => { e.stopPropagation(); openNewEvent(new Date(viewYear, viewMonth, cell.day)) }}
                      className="rounded p-0.5 text-gray-600 opacity-0 transition-all hover:bg-surface-4 hover:text-white group-hover:opacity-100"
                      title="New event"
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 4).map(ev => (
                    <button
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); setEditEvent(ev) }}
                      className="w-full truncate rounded px-1.5 py-1 text-left text-xs transition-opacity hover:opacity-80"
                      style={{ backgroundColor: `${ev.color}22`, color: ev.color }}
                      title={ev.title}
                    >
                      {(!ev.allDay && config.showEventTimes) ? `${new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ` : ''}
                      {ev.title}
                    </button>
                  ))}
                  {dayPages.slice(0, 2).map(p => (
                    <button
                      key={p.id}
                      onClick={() => openTab(p.id)}
                      className="w-full truncate rounded bg-accent/20 px-1.5 py-0.5 text-left text-xs text-accent transition-colors hover:bg-accent/30"
                    >
                      {p.icon} {p.title || 'Untitled'}
                    </button>
                  ))}
                  {(() => {
                    const shownEvents = Math.min(dayEvents.length, 4)
                    const shownPages = Math.min(dayPages.length, 2)
                    const totalHidden = (dayEvents.length + dayPages.length) - (shownEvents + shownPages)
                    return totalHidden > 0 ? (
                      <p className="px-1 text-xs text-gray-600">+{totalHidden} more</p>
                    ) : null
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showImport && <CalendarImport onClose={() => setShowImport(false)} />}
      {editEvent && <EventModal event={editEvent} onClose={() => setEditEvent(null)} />}
      {showNewEvent && newEventDate && (
        <EventModal
          defaultDate={newEventDate}
          onClose={() => { setShowNewEvent(false); setNewEventDate(null) }}
        />
      )}
    </>
  )
}
