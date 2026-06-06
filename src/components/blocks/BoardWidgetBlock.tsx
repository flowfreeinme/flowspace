import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  CheckSquare2,
  Clock3,
  CloudSun,
  FileText,
  GripVertical,
  History,
  LayoutDashboard,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Timer,
  X,
} from 'lucide-react'
import type { Block, Page } from '@/types'
import type { CalendarEvent } from '@/types/calendar'
import { useAuth } from '@/stores/auth'
import { useCalendar } from '@/stores/calendar'
import { useFocusTimer } from '@/stores/focusTimer'
import { useNotifications } from '@/stores/notifications'
import { useWorkspace } from '@/stores/workspace'
import { getBoardWidgetMeta, parseBoardWidget, type BoardTodoItem, type BoardWidgetType } from '@/lib/boardWidgets'
import { buildDayPlannerPrompt, buildDayPlannerWorkspaceContext, createFallbackDayPlan } from '@/lib/dayPlanner'
import { formatFocusTimerSeconds, MAX_FOCUS_TIMER_MINUTES, MIN_FOCUS_TIMER_MINUTES } from '@/lib/focusTimer'
import { getWidgetSettings } from '@/lib/homeCenter'
import { supabase } from '@/lib/supabase'
import {
  buildWeatherForecastUrl,
  buildWeatherGeocodingUrl,
  formatWeatherLocationLabel,
  parseGeocodingResults,
  parseWeatherForecast,
  type WeatherLocation,
  type WeatherSummary,
} from '@/lib/weather'
import DayPlanDisplay from '../widgets/DayPlanDisplay'

const CORNER_HANDLES = [
  { id: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
  { id: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
  { id: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
  { id: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
] as const

const WEATHER_LOCATION_STORAGE_KEY = 'flowspace_weather_location'

interface BoardWidgetBlockProps {
  block: Block
  selected: boolean
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onUpdate: (content: string) => void
  onDelete: () => void
}

function loadSavedWeatherLocation(): WeatherLocation | null {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY)
    if (!raw) return null
    const location = JSON.parse(raw) as WeatherLocation
    if (typeof location.name !== 'string' || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') return null
    return location
  } catch {
    return null
  }
}

function saveWeatherLocation(location: WeatherLocation) {
  try {
    localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, JSON.stringify(location))
  } catch {}
}

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date)
}

function pageKind(page: Page) {
  return page.boardMode ? 'Board' : 'Page'
}

function widgetIcon(type: BoardWidgetType, size = 13) {
  if (type === 'todoList') return <CheckSquare2 size={size} />
  if (type === 'calendar') return <CalendarDays size={size} />
  if (type === 'today') return <Clock3 size={size} />
  if (type === 'focus') return <Target size={size} />
  if (type === 'recent') return <History size={size} />
  if (type === 'quickCapture') return <Plus size={size} />
  if (type === 'proPlanner') return <Sparkles size={size} />
  if (type === 'weather') return <CloudSun size={size} />
  return <Timer size={size} />
}

export default function BoardWidgetBlock({
  block,
  selected,
  zoom,
  onDragStart,
  onResizeHandleMouseDown,
  onUpdate,
  onDelete,
}: BoardWidgetBlockProps) {
  const data = parseBoardWidget(block.content)
  const meta = getBoardWidgetMeta(data.type)
  const { user } = useAuth()
  const notify = useNotifications(s => s.add)
  const pages = useWorkspace(s => s.pages)
  const createPage = useWorkspace(s => s.createPage)
  const createBoard = useWorkspace(s => s.createBoard)
  const openTab = useWorkspace(s => s.openTab)
  const widgetSettings = useWorkspace(s => s.homeCenter?.widgetSettings)
  const { events, loadEvents, createEvent } = useCalendar()
  const {
    durationMinutes,
    draftMinutes,
    remainingSeconds,
    running,
    alarmActive,
    setDraftMinutes,
    applyDraft,
    configure,
    adjust,
    reset,
    toggle,
    stopAlarm,
  } = useFocusTimer()
  const [now, setNow] = useState(new Date())
  const [dayPlan, setDayPlan] = useState<string | null>(null)
  const [dayPlanLoading, setDayPlanLoading] = useState(false)
  const [dayPlanError, setDayPlanError] = useState<string | null>(null)
  const [weatherLocation, setWeatherLocation] = useState<WeatherLocation | null>(() => loadSavedWeatherLocation())
  const [weatherQuery, setWeatherQuery] = useState('')
  const [weather, setWeather] = useState<WeatherSummary | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherLocating, setWeatherLocating] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [todoDraft, setTodoDraft] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!user || !['calendar', 'today', 'proPlanner', 'quickCapture'].includes(data.type)) return
    loadEvents(user.id).catch(() => {})
  }, [data.type, loadEvents, user])

  useEffect(() => {
    if (data.type !== 'weather' || weatherLocation) return
    detectWeatherLocation()
  }, [data.type, weatherLocation])

  useEffect(() => {
    if (data.type !== 'weather' || !weatherLocation) return
    let cancelled = false

    async function loadWeather() {
      setWeatherLoading(true)
      setWeatherError(null)
      try {
        const res = await fetch(buildWeatherForecastUrl(weatherLocation!))
        if (!res.ok) throw new Error('Weather service unavailable.')
        const summary = parseWeatherForecast(await res.json())
        if (!cancelled) setWeather(summary)
      } catch (err) {
        if (!cancelled) setWeatherError(err instanceof Error ? err.message : 'Weather failed to load.')
      } finally {
        if (!cancelled) setWeatherLoading(false)
      }
    }

    loadWeather()
    return () => { cancelled = true }
  }, [data.type, weatherLocation])

  const visiblePages = useMemo(
    () => Object.values(pages).filter(page => !page.folder && !page.archived),
    [pages],
  )
  const upcomingEvents = useMemo(
    () => events
      .filter(event => event.end.getTime() >= now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events, now],
  )
  const nextEvent = upcomingEvents[0]
  const compact = data.width < 310 || data.height < 210
  const tiny = data.width < 280 || data.height < 180
  const HS = 8 / zoom

  function openNewPage() {
    const id = createPage(null)
    openTab(id)
    notify({ type: 'success', message: 'Page created', sub: 'Opened in your workspace.' })
  }

  function openNewBoard() {
    const id = createBoard(null)
    openTab(id)
    notify({ type: 'success', message: 'Board created', sub: 'Opened in your workspace.' })
  }

  async function createQuickEvent() {
    if (!user) return
    const start = new Date()
    start.setMinutes(0, 0, 0)
    if (start.getTime() < Date.now()) start.setHours(start.getHours() + 1)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    try {
      await createEvent({ title: 'New event', start, end, allDay: false, color: '#7c6af7', source: 'ics' }, user.id)
      notify({ type: 'success', message: 'Event created', sub: formatShortDate(start) })
    } catch (err) {
      notify({ type: 'error', message: 'Event failed', sub: err instanceof Error ? err.message : 'Try again.' })
    }
  }

  async function generateDayPlan() {
    setDayPlanLoading(true)
    setDayPlanError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) throw new Error('Sign in again to use the AI day planner.')
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: buildDayPlannerPrompt(now) }],
          workspaceContext: buildDayPlannerWorkspaceContext({ now, pages, events }),
        }),
      })
      const text = await res.text()
      const payload = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'AI day planner failed.')
      if (typeof payload.message !== 'string') throw new Error('AI day planner returned an invalid response.')
      setDayPlan(payload.message)
    } catch (err) {
      setDayPlan(createFallbackDayPlan({ now, pages: visiblePages, events: upcomingEvents }))
      setDayPlanError(err instanceof Error ? `AI unavailable: ${err.message}` : 'AI unavailable. Showing a local plan.')
    } finally {
      setDayPlanLoading(false)
    }
  }

  function detectWeatherLocation() {
    if (!navigator.geolocation) {
      setWeatherError('Search for a city to show weather.')
      return
    }
    setWeatherLocating(true)
    setWeatherError(null)
    navigator.geolocation.getCurrentPosition(
      position => {
        const location: WeatherLocation = {
          name: 'Current location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        saveWeatherLocation(location)
        setWeatherLocation(location)
        setWeatherLocating(false)
      },
      () => {
        setWeatherError('Location blocked. Search for a city instead.')
        setWeatherLocating(false)
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 30, timeout: 8000 },
    )
  }

  async function searchWeatherLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = weatherQuery.trim()
    if (query.length < 2) {
      setWeatherError('Enter a city or zip.')
      return
    }
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch(buildWeatherGeocodingUrl(query))
      if (!res.ok) throw new Error('Location search failed.')
      const location = parseGeocodingResults(await res.json())[0]
      if (!location) throw new Error('No matching location found.')
      saveWeatherLocation(location)
      setWeatherLocation(location)
      setWeatherQuery('')
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : 'Location search failed.')
    } finally {
      setWeatherLoading(false)
    }
  }

  function updateTodoItems(items: BoardTodoItem[]) {
    onUpdate(JSON.stringify({ ...data, items }))
  }

  function addTodoItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = todoDraft.trim()
    if (!text) return
    updateTodoItems([
      ...(data.items ?? []),
      { id: crypto.randomUUID(), text, done: false },
    ])
    setTodoDraft('')
  }

  function toggleTodoItem(id: string) {
    updateTodoItems((data.items ?? []).map(item => (
      item.id === id ? { ...item, done: !item.done } : item
    )))
  }

  function removeTodoItem(id: string) {
    updateTodoItems((data.items ?? []).filter(item => item.id !== id))
  }

  function renderToday() {
    const config = getWidgetSettings('today', widgetSettings)
    return (
      <div className="flex h-full flex-col justify-between gap-3 p-3">
        <div>
          <p className="truncate text-[11px] font-medium uppercase text-gray-500">{config.greeting}</p>
          <div className="mt-1 flex items-end gap-2">
            {config.showClock && <p className="text-4xl font-semibold leading-none text-white tabular-nums">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-gray-300">{formatShortDate(now)}</p>
        </div>
        {config.showNextEvent && (
          <div className="rounded-lg border border-surface-3 bg-surface-2 px-2.5 py-2">
            <p className="mb-1 text-[10px] uppercase text-gray-600">Next</p>
            <p className="truncate text-sm font-semibold text-white">{nextEvent?.title ?? 'No upcoming events'}</p>
            {nextEvent && <p className="truncate text-xs text-gray-500">{formatEventTime(nextEvent)}{nextEvent.location ? ` · ${nextEvent.location}` : ''}</p>}
          </div>
        )}
      </div>
    )
  }

  function renderCalendar() {
    const config = getWidgetSettings('calendar', widgetSettings)
    const eventsToShow = upcomingEvents.slice(0, tiny ? 3 : compact ? 4 : 6)
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{now.toLocaleDateString([], { month: 'long' })}</p>
          <p className="rounded-md bg-accent/15 px-2 py-1 text-xs font-semibold text-accent">{now.getDate()}</p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-600">
          {(config.weekStartsOn === 'monday' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
          {eventsToShow.length ? eventsToShow.map(event => (
            <div key={event.id} className="rounded-lg border border-surface-3 bg-surface-2 px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: event.color ?? '#7c6af7' }} />
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{event.title}</p>
              </div>
              <p className="mt-1 truncate text-[11px] text-gray-500">
                {formatShortDate(new Date(event.start))}
                {config.showEventTimes ? ` · ${formatEventTime(event)}` : ''}
              </p>
              {event.location && <p className="mt-0.5 truncate text-[11px] text-gray-600">{event.location}</p>}
            </div>
          )) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-surface-3 text-xs text-gray-600">
              No events ahead
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderPageList(type: 'focus' | 'recent') {
    const config = type === 'focus'
      ? getWidgetSettings('focus', widgetSettings)
      : getWidgetSettings('recent', widgetSettings)
    const filter = config.filter
    const count = config.itemCount
    const excludedFolderIds = 'excludedFolderIds' in config ? config.excludedFolderIds : []
    const items = [...visiblePages]
      .filter(page => filter === 'all' || (filter === 'boards' ? page.boardMode : !page.boardMode))
      .filter(page => !excludedFolderIds.includes(page.parentId ?? ''))
      .sort((a, b) => type === 'recent'
        ? ((b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt))
        : ((b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      )
      .slice(0, count)

    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-3">
        <p className="truncate text-base font-semibold text-white">{config.title}</p>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
          {items.length ? items.map(page => (
            <button
              key={page.id}
              onClick={() => openTab(page.id)}
              className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-surface-3 bg-surface-2 px-2.5 py-2 text-left transition-colors hover:border-accent/40"
            >
              <span className="shrink-0 text-base">{page.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{page.title || 'Untitled'}</span>
                <span className="block text-[10px] text-gray-600">{pageKind(page)}</span>
              </span>
            </button>
          )) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-surface-3 text-xs text-gray-600">Nothing here yet</div>
          )}
        </div>
      </div>
    )
  }

  function renderQuickCapture() {
    const buttons = [
      { id: 'board', label: 'Board' },
      { id: 'page', label: 'Page' },
      { id: 'event', label: 'Event' },
    ] as const
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-3">
        <p className="text-base font-semibold text-white">Quick capture</p>
        <div className="grid flex-1 min-h-0 gap-2" style={{ gridTemplateColumns: data.width > 360 ? `repeat(${buttons.length}, minmax(0, 1fr))` : '1fr' }}>
          {buttons.map(button => (
            <button
              key={button.id}
              onClick={button.id === 'board' ? openNewBoard : button.id === 'page' ? openNewPage : createQuickEvent}
              className="flex min-h-0 items-center justify-center gap-2 rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-accent/45 hover:bg-surface-3"
            >
              {button.id === 'board' ? <LayoutDashboard size={15} /> : button.id === 'page' ? <FileText size={15} /> : <CalendarPlus size={15} />}
              <span className="truncate">{button.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderPlanner() {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-base font-semibold text-white">AI day planner</p>
          <button
            onClick={generateDayPlan}
            disabled={dayPlanLoading}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-white transition-colors hover:bg-accent/85 disabled:opacity-60"
          >
            {dayPlanLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Plan
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-surface-3 bg-surface-2 p-2.5">
          <DayPlanDisplay plan={dayPlan} emptyText="Generate a detailed plan from this workspace and your calendar." />
        </div>
        {dayPlanError && <p className="truncate text-[10px] text-yellow-300">{dayPlanError}</p>}
      </div>
    )
  }

  function renderFocusTimer() {
    const config = getWidgetSettings('focusTimer', widgetSettings)
    const elapsed = Math.max(0, durationMinutes * 60 - remainingSeconds)
    const percent = durationMinutes > 0 ? Math.min(100, Math.round((elapsed / (durationMinutes * 60)) * 100)) : 0

    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-white">Max focus</p>
            <p className="text-[11px] text-gray-600">{running ? 'Sprint running' : alarmActive ? 'Timer complete' : 'Ready when you are'}</p>
          </div>
          <p className="text-3xl font-semibold leading-none text-white tabular-nums">{formatFocusTimerSeconds(remainingSeconds)}</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${percent}%` }} />
        </div>
        {!tiny && (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(4, config.presets.length + 1)}, minmax(0, 1fr))` }}>
            {config.presets.map(preset => (
              <button
                key={preset.minutes}
                onClick={() => configure(preset.minutes)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${durationMinutes === preset.minutes ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200' : 'border-surface-3 bg-surface-2 text-gray-500 hover:text-gray-200'}`}
              >
                {preset.label}
              </button>
            ))}
            <label className="flex min-w-0 items-center gap-1 rounded-lg border border-surface-3 bg-surface-2 px-1.5 py-1 text-[11px] text-gray-500">
              <input
                type="number"
                min={MIN_FOCUS_TIMER_MINUTES}
                max={MAX_FOCUS_TIMER_MINUTES}
                inputMode="numeric"
                value={draftMinutes}
                onChange={event => setDraftMinutes(event.target.value)}
                onBlur={applyDraft}
                onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
                className="min-w-0 flex-1 bg-transparent text-right text-xs font-semibold text-white tabular-nums outline-none"
                aria-label="Custom focus timer minutes"
              />
              <span>m</span>
            </label>
          </div>
        )}
        <div className="mt-auto flex items-center gap-1.5">
          {alarmActive ? (
            <button onClick={stopAlarm} className="flex h-8 flex-1 items-center justify-center rounded-lg bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-400">
              Stop alarm
            </button>
          ) : (
            <button onClick={() => toggle()} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-surface-0 hover:bg-emerald-400">
              {running ? <Pause size={13} /> : <Play size={13} />}
              {running ? 'Pause' : 'Start'}
            </button>
          )}
          <button onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-3 bg-surface-2 text-gray-400 hover:text-white" title="Reset">
            <RotateCcw size={13} />
          </button>
          <button onClick={() => adjust(-5)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-3 bg-surface-2 text-gray-400 hover:text-white" title="Shorter">
            <Minus size={13} />
          </button>
          <button onClick={() => adjust(5)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-3 bg-surface-2 text-gray-400 hover:text-white" title="Longer">
            <Plus size={13} />
          </button>
        </div>
      </div>
    )
  }

  function renderWeather() {
    const config = getWidgetSettings('weather', widgetSettings)
    const toC = (f: number) => Math.round((f - 32) * 5 / 9)
    const fmt = (f: number) => config.unit === 'C' ? toC(f) : Math.round(f)
    const locationLabel = weatherLocation ? formatWeatherLocationLabel(weatherLocation) : 'Finding location'

    return (
      <div className="flex h-full min-h-0 flex-col gap-2 bg-gradient-to-br from-surface-1 via-surface-1 to-sky-500/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-1.5 text-[11px] font-medium uppercase text-sky-300">
            <CloudSun size={13} />
            <span className="truncate">Weather</span>
          </div>
          <button onClick={detectWeatherLocation} disabled={weatherLocating || weatherLoading} className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-surface-3 bg-surface-2 px-2 text-[11px] text-gray-400 hover:text-sky-200 disabled:opacity-60">
            {weatherLocating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
            Local
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <MapPin size={12} className="shrink-0 text-sky-300" />
          <span className="truncate">{locationLabel}</span>
        </div>
        <div className="min-h-0 flex-1">
          {weatherLoading && !weather ? (
            <div className="flex h-full items-center gap-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin text-sky-300" /> Loading</div>
          ) : weather ? (
            <div className="flex h-full flex-col justify-center">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-4xl font-semibold leading-none text-white tabular-nums">{fmt(weather.temperature)}°{config.unit}</p>
                  {config.showFeelsLike && <p className="mt-1 truncate text-xs text-gray-500">Feels {fmt(weather.feelsLike)}° · H {fmt(weather.high)}° / L {fmt(weather.low)}°</p>}
                </div>
                <div className="text-right">
                  <p className="text-3xl leading-none">{weather.condition.icon}</p>
                  <p className="mt-1 max-w-[7rem] truncate text-xs font-medium text-sky-200">{weather.condition.label}</p>
                </div>
              </div>
              {!tiny && (
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {config.showHumidity && <Metric label="Humid" value={`${weather.humidity}%`} />}
                  {config.showWind && <Metric label="Wind" value={config.unit === 'C' ? `${Math.round(weather.windSpeed * 1.60934)} km/h` : `${weather.windSpeed} mph`} />}
                  {config.showPrecipitation && <Metric label="Rain" value={`${weather.precipitation}"`} />}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-gray-500">Allow location access or search for a city.</p>
          )}
        </div>
        <form onSubmit={searchWeatherLocation} className="flex shrink-0 items-center gap-1.5">
          <input value={weatherQuery} onChange={event => setWeatherQuery(event.target.value)} placeholder="City or zip" className="min-w-0 flex-1 rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5 text-xs text-white outline-none placeholder:text-gray-600 focus:border-sky-400/40" />
          <button type="submit" disabled={weatherLoading} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-surface-0 hover:bg-sky-400 disabled:opacity-60">
            {weatherLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          </button>
        </form>
        {weatherError && <p className="truncate text-[10px] text-yellow-200">{weatherError}</p>}
      </div>
    )
  }

  function renderTodoList() {
    const items = data.items ?? []
    const doneCount = items.filter(item => item.done).length
    const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0

    return (
      <div className="flex h-full min-h-0 flex-col bg-[#101114] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-emerald-300">
              <CheckSquare2 size={13} />
              <span className="truncate">To-do list</span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white">Board tasks</p>
          </div>
          <div className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-right">
            <p className="text-xs font-semibold tabular-nums text-emerald-200">{doneCount}/{items.length}</p>
            <p className="text-[10px] text-emerald-400/70">done</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${percent}%` }} />
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
          {items.length ? items.map(item => (
            <div key={item.id} className="group/todo flex min-w-0 items-start gap-2 rounded-lg border border-surface-3 bg-surface-2 px-2.5 py-2">
              <button
                type="button"
                onClick={() => toggleTodoItem(item.id)}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${item.done ? 'border-emerald-400 bg-emerald-400 text-surface-0' : 'border-gray-600 bg-surface-1 text-transparent hover:border-emerald-300'}`}
                aria-label={item.done ? 'Mark task incomplete' : 'Mark task complete'}
              >
                <CheckSquare2 size={11} />
              </button>
              <p className={`min-w-0 flex-1 break-words text-xs leading-snug ${item.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                {item.text}
              </p>
              <button
                type="button"
                onClick={() => removeTodoItem(item.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-600 opacity-100 transition-colors hover:bg-surface-3 hover:text-red-300 sm:opacity-0 sm:group-hover/todo:opacity-100"
                aria-label="Remove task"
              >
                <X size={12} />
              </button>
            </div>
          )) : (
            <div className="flex h-full min-h-[92px] items-center justify-center rounded-lg border border-dashed border-surface-3 px-4 text-center text-xs leading-relaxed text-gray-600">
              Add tasks for this board, then check them off as you go.
            </div>
          )}
        </div>

        <form onSubmit={addTodoItem} className="mt-3 flex shrink-0 items-center gap-1.5">
          <input
            value={todoDraft}
            onChange={event => setTodoDraft(event.target.value)}
            placeholder="Add task"
            className="min-w-0 flex-1 rounded-lg border border-surface-3 bg-surface-2 px-2.5 py-2 text-xs text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/45"
          />
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-surface-0 transition-colors hover:bg-emerald-300 disabled:opacity-50"
            disabled={!todoDraft.trim()}
            aria-label="Add task"
          >
            <Plus size={15} />
          </button>
        </form>
      </div>
    )
  }

  function renderBody() {
    if (data.type === 'todoList') return renderTodoList()
    if (data.type === 'calendar') return renderCalendar()
    if (data.type === 'today') return renderToday()
    if (data.type === 'focus') return renderPageList('focus')
    if (data.type === 'recent') return renderPageList('recent')
    if (data.type === 'quickCapture') return renderQuickCapture()
    if (data.type === 'proPlanner') return renderPlanner()
    if (data.type === 'weather') return renderWeather()
    return renderFocusTimer()
  }

  return (
    <div
      data-card
      data-board-widget
      style={{
        position: 'absolute',
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        background: '#111214',
        border: `1.5px solid ${selected ? '#7c6af7' : '#25262b'}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: selected ? '0 10px 28px rgba(124,106,247,0.16), 0 8px 26px rgba(0,0,0,0.38)' : '0 8px 24px rgba(0,0,0,0.34)',
      }}
    >
      <div
        title="Move"
        style={{ position: 'absolute', left: 7, top: 7, zIndex: 10, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,18,20,0.82)', border: '1px solid #2a2b31', borderRadius: 7, cursor: 'grab', userSelect: 'none', backdropFilter: 'blur(8px)' }}
        onMouseDown={onDragStart}
      >
        <GripVertical size={12} style={{ color: '#6b7280', flexShrink: 0 }} />
      </div>
      <button
        onMouseDown={event => event.stopPropagation()}
        onClick={onDelete}
        title="Delete"
        style={{ position: 'absolute', right: 7, top: 7, zIndex: 10, width: 24, height: 24, background: 'rgba(17,18,20,0.82)', border: '1px solid #2a2b31', borderRadius: 7, cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
      >
        <X size={12} />
      </button>
      <div className="absolute left-10 right-10 top-2 z-[1] flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase text-gray-600 pointer-events-none">
        {widgetIcon(data.type, 11)}
        <span className="truncate">{meta.title}</span>
      </div>
      <div className="h-full min-h-0 overflow-hidden pt-8" onMouseDown={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}>
        {renderBody()}
      </div>
      {CORNER_HANDLES.map(handle => (
        <div
          key={handle.id}
          onMouseDown={event => { event.stopPropagation(); onResizeHandleMouseDown(event, handle.id) }}
          style={{
            position: 'absolute',
            width: HS,
            height: HS,
            background: selected ? '#7c6af7' : '#3b3b3b',
            border: `${1 / zoom}px solid rgba(255,255,255,0.3)`,
            borderRadius: 2 / zoom,
            ...handle.style,
          }}
        />
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase text-gray-600">{label}</p>
      <p className="truncate text-xs font-semibold text-gray-200">{value}</p>
    </div>
  )
}
