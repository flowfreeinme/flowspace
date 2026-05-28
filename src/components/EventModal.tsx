import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useCalendar } from '@/stores/calendar'
import { useAuth } from '@/stores/auth'
import type { CalendarEvent } from '@/types/calendar'

const COLORS = ['#7c6af7', '#34a853', '#ea4335', '#fbbc04', '#4285f4', '#ff6d00', '#e91e63', '#00bcd4']

interface EventModalProps {
  event?: CalendarEvent
  defaultDate?: Date
  defaultHour?: number
  onClose: () => void
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function EventModal({ event, defaultDate, defaultHour = 9, onClose }: EventModalProps) {
  const { user } = useAuth()
  const { createEvent, updateEvent, removeEvent } = useCalendar()

  const base = defaultDate ?? new Date()
  const defaultStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), defaultHour, 0)
  const defaultEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate(), defaultHour + 1, 0)

  const [title, setTitle] = useState(event?.title ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startStr, setStartStr] = useState(event ? (event.allDay ? toDateInput(event.start) : toLocalInput(event.start)) : (allDay ? toDateInput(defaultStart) : toLocalInput(defaultStart)))
  const [endStr, setEndStr] = useState(event ? (event.allDay ? toDateInput(event.end) : toLocalInput(event.end)) : (allDay ? toDateInput(defaultEnd) : toLocalInput(defaultEnd)))
  const [location, setLocation] = useState(event?.location ?? '')
  const [color, setColor] = useState(event?.color ?? '#7c6af7')
  const [loading, setLoading] = useState(false)

  function toggleAllDay(checked: boolean) {
    setAllDay(checked)
    if (checked) {
      setStartStr(toDateInput(new Date(startStr)))
      setEndStr(toDateInput(new Date(endStr)))
    } else {
      const d = new Date(startStr)
      d.setHours(defaultHour, 0)
      setStartStr(toLocalInput(d))
      const e = new Date(d)
      e.setHours(defaultHour + 1)
      setEndStr(toLocalInput(e))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !title.trim()) return
    setLoading(true)

    const start = new Date(startStr)
    const end = new Date(endStr)

    if (event) {
      await updateEvent(event.id, { title: title.trim(), start, end, allDay, location: location.trim() || undefined, color }, user.id)
    } else {
      await createEvent({ title: title.trim(), start, end, allDay, location: location.trim() || undefined, color, source: 'ics' }, user.id)
    }
    setLoading(false)
    onClose()
  }

  async function handleDelete() {
    if (!user || !event) return
    if (!confirm('Delete this event?')) return
    await removeEvent(event.id, user.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <h2 className="font-semibold text-white">{event ? 'Edit event' : 'New event'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-4 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            required
            className="w-full bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-accent text-sm transition-colors"
          />

          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-accent text-sm transition-colors"
          />

          {/* All day toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={allDay} onChange={e => toggleAllDay(e.target.checked)} className="accent-accent" />
            <span className="text-sm text-gray-400">All day</span>
          </label>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start</label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={startStr}
                onChange={e => setStartStr(e.target.value)}
                className="w-full bg-surface-3 border border-surface-4 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End</label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={endStr}
                onChange={e => setEndStr(e.target.value)}
                className="w-full bg-surface-3 border border-surface-4 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 border-2"
                  style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {event && (
              <button type="button" onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-surface-3 hover:bg-surface-4 text-gray-300 rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim()}
              className="flex-1 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {loading ? 'Saving…' : event ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
