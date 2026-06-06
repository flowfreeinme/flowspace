import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import {
  HOME_GRID_COLUMNS,
  HOME_GRID_ROWS,
  HOME_WIDGET_CATALOG,
  normalizeHomeWidgets,
  getWidgetSettings,
  type HomeWidgetResizeCorner,
} from '@/lib/homeCenter'
import WidgetShell from './widgets/WidgetShell'
import TodayWidget from './widgets/TodayWidget'
import FocusQueueWidget from './widgets/FocusQueueWidget'
import RecentWorkWidget from './widgets/RecentWorkWidget'
import TodoListWidget from './widgets/TodoListWidget'
import FocusTimerWidget from './widgets/FocusTimerWidget'
import WeatherWidget from './widgets/WeatherWidget'
import ProPlannerWidget from './widgets/ProPlannerWidget'
import CalendarWidget from './widgets/CalendarWidget'
import AiBriefingWidget from './widgets/AiBriefingWidget'
import TodaySettings from './widgets/settings/TodaySettings'
import FocusQueueSettings from './widgets/settings/FocusQueueSettings'
import RecentWorkSettings from './widgets/settings/RecentWorkSettings'
import ProPlannerSettings from './widgets/settings/ProPlannerSettings'
import FocusTimerSettings from './widgets/settings/FocusTimerSettings'
import WeatherSettings from './widgets/settings/WeatherSettings'
import CalendarSettings from './widgets/settings/CalendarSettings'
import { useIsMobile } from '@/hooks/useIsMobile'
import WeekView from './WeekView'
import DayView from './DayView'
import type { HomeWidget } from '@/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type WidgetResizeDrag = {
  widgetId: string
  corner: HomeWidgetResizeCorner
  startX: number
  startY: number
}

type WidgetDrag = {
  widgetId: string
  startX: number
  startY: number
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function pad(n: number) { return String(n).padStart(2, '0') }

export default function HomeScreen() {
  const {
    homeCenter,
    addHomeCenterWidget,
    removeHomeCenterWidget,
    moveHomeCenterWidget,
    resizeHomeCenterWidgetFromCorner,
    pushCascadeHomeCenterWidgets,
    autoArrangeHomeCenter,
    resetHomeCenter,
  } = useWorkspace()
  const isMobile = useIsMobile()
  const [now, setNow] = useState(new Date())
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [editingHome, setEditingHome] = useState(false)
  const [openSettingsWidget, setOpenSettingsWidget] = useState<string | null>(null)
  const [activeResizeWidgetId, setActiveResizeWidgetId] = useState<string | null>(null)
  const [widgetResizeDrag, setWidgetResizeDrag] = useState<WidgetResizeDrag | null>(null)
  const [activeDragWidgetId, setActiveDragWidgetId] = useState<string | null>(null)
  const [widgetDrag, setWidgetDrag] = useState<WidgetDrag | null>(null)
  const homeGridRef = useRef<HTMLDivElement>(null)
  const resizeDeltaRef = useRef({ x: 0, y: 0 })
  const dragDeltaRef = useRef({ x: 0, y: 0 })
  const dragActivatedRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!editingHome || isMobile) {
      setWidgetResizeDrag(null)
      setWidgetDrag(null)
    }
    if (!editingHome) {
      setActiveResizeWidgetId(null)
      setActiveDragWidgetId(null)
    }
  }, [editingHome, isMobile])

  useEffect(() => {
    if (!widgetResizeDrag) return
    const drag = widgetResizeDrag

    function handlePointerMove(event: PointerEvent) {
      const grid = homeGridRef.current
      if (!grid) return

      const rect = grid.getBoundingClientRect()
      const cellWidth = rect.width / HOME_GRID_COLUMNS
      const cellHeight = rect.height / HOME_GRID_ROWS
      if (!cellWidth || !cellHeight) return

      const nextDx = Math.round((event.clientX - drag.startX) / cellWidth)
      const nextDy = Math.round((event.clientY - drag.startY) / cellHeight)
      const stepDx = isMobile ? 0 : nextDx - resizeDeltaRef.current.x
      const stepDy = nextDy - resizeDeltaRef.current.y

      if (stepDx || stepDy) {
        resizeHomeCenterWidgetFromCorner(drag.widgetId, drag.corner, stepDx, stepDy)
        resizeDeltaRef.current = { x: nextDx, y: nextDy }
      }
    }

    function stopResizeDrag() {
      setWidgetResizeDrag(null)
    }

    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizeDrag)
    window.addEventListener('pointercancel', stopResizeDrag)

    return () => {
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizeDrag)
      window.removeEventListener('pointercancel', stopResizeDrag)
    }
  }, [isMobile, resizeHomeCenterWidgetFromCorner, widgetResizeDrag])

  useEffect(() => {
    if (!widgetDrag) return
    const drag = widgetDrag

    function handlePointerMove(event: PointerEvent) {
      const grid = homeGridRef.current
      if (!grid) return

      const rect = grid.getBoundingClientRect()
      const cellWidth = rect.width / HOME_GRID_COLUMNS
      const cellHeight = rect.height / HOME_GRID_ROWS
      if (!cellWidth || !cellHeight) return

      const rawDx = event.clientX - drag.startX
      const rawDy = event.clientY - drag.startY

      if (!dragActivatedRef.current) {
        if (Math.abs(rawDx) < 5 && Math.abs(rawDy) < 5) return
        dragActivatedRef.current = true
        setActiveDragWidgetId(drag.widgetId)
      }

      const nextDx = Math.round(rawDx / cellWidth)
      const nextDy = Math.round(rawDy / cellHeight)
      const stepDx = nextDx - dragDeltaRef.current.x
      const stepDy = nextDy - dragDeltaRef.current.y

      if (stepDx || stepDy) {
        moveHomeCenterWidget(drag.widgetId, stepDx, stepDy)
        dragDeltaRef.current = { x: nextDx, y: nextDy }
      }
    }

    function stopDrag() {
      if (dragActivatedRef.current) {
        pushCascadeHomeCenterWidgets(drag.widgetId)
      }
      setWidgetDrag(null)
      setActiveDragWidgetId(null)
      dragActivatedRef.current = false
    }

    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)

    return () => {
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
    }
  }, [moveHomeCenterWidget, pushCascadeHomeCenterWidgets, widgetDrag])

  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth()
  const todayD = today.getDate()

  const hours = now.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  const widgets = normalizeHomeWidgets(homeCenter?.widgets)
  const widgetSettings = homeCenter?.widgetSettings

  if (selectedDay) {
    return <DayView date={selectedDay} onBack={() => setSelectedDay(null)} />
  }

  if (selectedWeek) {
    return (
      <WeekView
        date={selectedWeek}
        onBack={() => setSelectedWeek(null)}
        onDayClick={d => setSelectedDay(d)}
      />
    )
  }

  function startWidgetResize(event: React.PointerEvent<HTMLButtonElement>, widget: HomeWidget, corner: HomeWidgetResizeCorner) {
    event.preventDefault()
    event.stopPropagation()
    setOpenSettingsWidget(null)
    resizeDeltaRef.current = { x: 0, y: 0 }
    setActiveResizeWidgetId(widget.id)
    setWidgetResizeDrag({
      widgetId: widget.id,
      corner,
      startX: event.clientX,
      startY: event.clientY,
    })
  }

  function startWidgetDrag(event: React.PointerEvent<HTMLElement>, widget: HomeWidget) {
    event.preventDefault()
    setOpenSettingsWidget(null)
    dragDeltaRef.current = { x: 0, y: 0 }
    dragActivatedRef.current = false
    setWidgetDrag({
      widgetId: widget.id,
      startX: event.clientX,
      startY: event.clientY,
    })
  }

  function renderSettingsForm(widget: HomeWidget) {
    if (widget.type === 'today') return <TodaySettings config={getWidgetSettings('today', widgetSettings)} />
    if (widget.type === 'focus') return <FocusQueueSettings config={getWidgetSettings('focus', widgetSettings)} />
    if (widget.type === 'recent') return <RecentWorkSettings config={getWidgetSettings('recent', widgetSettings)} />
    if (widget.type === 'todoList') return null
    if (widget.type === 'proPlanner') return <ProPlannerSettings config={getWidgetSettings('proPlanner', widgetSettings)} />
    if (widget.type === 'focusTimer') return <FocusTimerSettings config={getWidgetSettings('focusTimer', widgetSettings)} />
    if (widget.type === 'weather') return <WeatherSettings config={getWidgetSettings('weather', widgetSettings)} />
    if (widget.type === 'calendar') return <CalendarSettings config={getWidgetSettings('calendar', widgetSettings)} />
    if (widget.type === 'aiBriefing') return null
    return null
  }

  function renderWidget(widget: HomeWidget) {
    if (widget.type === 'calendar') return (
      <CalendarWidget
        config={getWidgetSettings('calendar', widgetSettings)}
        onSelectWeek={setSelectedWeek}
      />
    )
    if (widget.type === 'today') return <TodayWidget config={getWidgetSettings('today', widgetSettings)} />
    if (widget.type === 'focus') return <FocusQueueWidget config={getWidgetSettings('focus', widgetSettings)} />
    if (widget.type === 'recent') return <RecentWorkWidget config={getWidgetSettings('recent', widgetSettings)} />
    if (widget.type === 'todoList') return <TodoListWidget config={getWidgetSettings('todoList', widgetSettings)} />
    if (widget.type === 'proPlanner') return <ProPlannerWidget config={getWidgetSettings('proPlanner', widgetSettings)} />
    if (widget.type === 'focusTimer') return <FocusTimerWidget config={getWidgetSettings('focusTimer', widgetSettings)} />
    if (widget.type === 'aiBriefing') return <AiBriefingWidget />
    return <WeatherWidget config={getWidgetSettings('weather', widgetSettings)} />
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-surface-0">
      <div className="flex h-full flex-col px-5 pb-5 pt-5">
        <div className="mb-5 shrink-0">
          <p className="mb-0.5 text-xs text-gray-500">
            {greeting(hours)}&nbsp;-&nbsp;
            {DAYS[today.getDay()]}, {MONTHS[todayM]} {todayD}, {todayY}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold leading-none text-white tabular-nums md:text-6xl">
              {displayHour}:{pad(now.getMinutes())}
            </span>
            <div className="mb-1 flex flex-col">
              <span className="text-xl font-semibold leading-tight text-accent tabular-nums">{pad(now.getSeconds())}</span>
              <span className="text-xs leading-tight text-gray-500">{ampm}</span>
            </div>
          </div>
        </div>

        {editingHome && (
          <div className="mb-5 shrink-0 overflow-hidden rounded-2xl border border-accent/35 bg-surface-1 shadow-2xl shadow-black/20">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-3 bg-surface-2/70 px-4 py-3">
              <div>
                <p className="text-base font-semibold text-white">Home menu</p>
                <p className="text-xs text-gray-500">Add widgets into open space, then resize from the corners.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={resetHomeCenter} className="flex items-center gap-1.5 rounded-lg border border-surface-4 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:text-white">
                  <RotateCcw size={13} />
                  Reset
                </button>
                <button onClick={autoArrangeHomeCenter} className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent-hover">
                  <Sparkles size={13} />
                  Auto arrange
                </button>
                <button onClick={() => setEditingHome(false)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover">
                  Done
                </button>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto px-4 py-4">
              {HOME_WIDGET_CATALOG.map(item => {
                const added = widgets.some(widget => widget.type === item.type)
                return (
                  <button
                    key={item.type}
                    onClick={() => !added && addHomeCenterWidget(item.type)}
                    disabled={added}
                    className="w-56 shrink-0 rounded-xl border border-surface-3 bg-surface-2 px-4 py-3 text-left shadow-sm transition-colors hover:border-accent/50 hover:bg-surface-3 disabled:cursor-default disabled:opacity-55"
                  >
                    <span className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${added ? 'bg-surface-4 text-gray-400' : 'bg-accent/15 text-accent'}`}>
                        {added ? 'Added' : 'Add'}
                      </span>
                    </span>
                    <span className="block text-xs leading-relaxed text-gray-500">{item.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div
          ref={homeGridRef}
          className={`grid min-h-0 flex-1 gap-5 overflow-y-auto rounded-2xl pr-2 transition-colors ${editingHome ? 'border border-accent/25 bg-surface-1/35 p-4' : 'p-0'}`}
          style={{
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, minmax(0, 1fr))',
            gridTemplateRows: isMobile ? undefined : `repeat(${HOME_GRID_ROWS}, minmax(92px, 1fr))`,
            gridAutoRows: isMobile ? 'minmax(88px, auto)' : undefined,
            backgroundImage: editingHome && !isMobile
              ? 'linear-gradient(rgba(124,106,247,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(124,106,247,0.10) 1px, transparent 1px)'
              : undefined,
            backgroundSize: editingHome && !isMobile ? 'calc((100% - 55px) / 12) 112px' : undefined,
          }}
        >
          {widgets.map(widget => (
            <WidgetShell
              key={widget.id}
              widget={widget}
              editingHome={editingHome}
              isResizing={activeResizeWidgetId === widget.id}
              isDragging={activeDragWidgetId === widget.id}
              openSettings={openSettingsWidget === widget.id}
              onOpenSettings={() => setOpenSettingsWidget(widget.id)}
              onCloseSettings={() => setOpenSettingsWidget(null)}
              onStartResize={(e, corner) => startWidgetResize(e, widget, corner)}
              onStartDrag={e => startWidgetDrag(e, widget)}
              onRemove={() => removeHomeCenterWidget(widget.id)}
              settingsForm={renderSettingsForm(widget)}
            >
              {renderWidget(widget)}
            </WidgetShell>
          ))}
        </div>

        <div className="mt-5 shrink-0">
          <button
            onClick={() => setEditingHome(v => !v)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
              editingHome
                ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/15'
                : 'border-dashed border-surface-4 text-gray-500 hover:border-accent/35 hover:bg-surface-1 hover:text-gray-200'
            }`}
          >
            <LayoutDashboard size={14} />
            {editingHome ? 'Done editing home center' : 'Edit home center'}
          </button>
        </div>
      </div>
    </div>
  )
}
