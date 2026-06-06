import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, GripVertical, ListChecks, Plus, Trash2 } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { reorderHomeTodoItems, type TodoDropPosition } from '@/lib/homeTodoList'
import type { HomeTodoItem, TodoListConfig } from '@/types/widgetSettings'

interface TodoListWidgetProps {
  config: TodoListConfig
}

type TaskDropTarget = {
  id: string
  position: TodoDropPosition
}

type TaskDragState = {
  id: string
  pointerId: number
  startX: number
  startY: number
  lastClientY: number
  active: boolean
  holdTimer: number | null
}

function makeTodoId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function TodoListWidget({ config }: TodoListWidgetProps) {
  const { updateWidgetSettings } = useWorkspace()
  const [draft, setDraft] = useState('')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskDropTarget | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<TaskDragState | null>(null)
  const dropTargetRef = useRef<TaskDropTarget | null>(null)
  const cleanupDragListenersRef = useRef<(() => void) | null>(null)
  const items = config.items ?? []
  const doneCount = items.filter(item => item.done).length
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0

  useEffect(() => () => cleanupTaskDrag(), [])

  function patch(patchConfig: Partial<TodoListConfig>) {
    updateWidgetSettings('todoList', patchConfig)
  }

  function updateItems(nextItems: HomeTodoItem[]) {
    patch({ items: nextItems })
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    updateItems([...items, { id: makeTodoId(), text, done: false }])
    setDraft('')
  }

  function toggleTask(id: string) {
    updateItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item))
  }

  function updateTaskText(id: string, text: string) {
    updateItems(items.map(item => item.id === id ? { ...item, text } : item))
  }

  function removeTask(event: MouseEvent<HTMLButtonElement>, id: string) {
    event.stopPropagation()
    updateItems(items.filter(item => item.id !== id))
  }

  function setActiveDropTarget(target: TaskDropTarget | null) {
    dropTargetRef.current = target
    setDropTarget(current => (
      current?.id === target?.id && current?.position === target?.position ? current : target
    ))
  }

  function cleanupTaskDrag() {
    const drag = dragStateRef.current
    if (drag?.holdTimer) window.clearTimeout(drag.holdTimer)
    cleanupDragListenersRef.current?.()
    cleanupDragListenersRef.current = null
    dragStateRef.current = null
    dropTargetRef.current = null
    setDraggingTaskId(null)
    setDropTarget(null)
  }

  function findDropTarget(clientY: number, draggedId: string): TaskDropTarget | null {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-todo-item-id]') ?? [])
      .filter(row => row.dataset.todoItemId && row.dataset.todoItemId !== draggedId)

    if (!rows.length) return null

    for (const row of rows) {
      const rect = row.getBoundingClientRect()
      if (clientY < rect.top || clientY > rect.bottom) continue
      return {
        id: row.dataset.todoItemId!,
        position: clientY < rect.top + rect.height / 2 ? 'before' : 'after',
      }
    }

    const first = rows[0]
    const last = rows[rows.length - 1]
    if (clientY < first.getBoundingClientRect().top) {
      return { id: first.dataset.todoItemId!, position: 'before' }
    }
    if (clientY > last.getBoundingClientRect().bottom) {
      return { id: last.dataset.todoItemId!, position: 'after' }
    }
    return null
  }

  function activateTaskDrag() {
    const drag = dragStateRef.current
    if (!drag || drag.active) return
    drag.active = true
    if (drag.holdTimer) window.clearTimeout(drag.holdTimer)
    drag.holdTimer = null
    setDraggingTaskId(drag.id)
    setActiveDropTarget(findDropTarget(drag.lastClientY, drag.id))
  }

  function startTaskDrag(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    event.preventDefault()
    event.stopPropagation()
    cleanupTaskDrag()

    const drag: TaskDragState = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastClientY: event.clientY,
      active: false,
      holdTimer: window.setTimeout(activateTaskDrag, 160),
    }
    dragStateRef.current = drag

    const handleMove = (moveEvent: PointerEvent) => {
      const current = dragStateRef.current
      if (!current || current.pointerId !== moveEvent.pointerId) return

      current.lastClientY = moveEvent.clientY
      const distance = Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY)
      if (!current.active && distance > 6) activateTaskDrag()
      if (!current.active) return

      moveEvent.preventDefault()
      setActiveDropTarget(findDropTarget(moveEvent.clientY, current.id))
    }

    const finishDrag = (finishEvent: PointerEvent) => {
      const current = dragStateRef.current
      if (!current || current.pointerId !== finishEvent.pointerId) return
      if (current.active) {
        finishEvent.preventDefault()
        const target = dropTargetRef.current
        if (target) {
          const nextItems = reorderHomeTodoItems(items, current.id, target.id, target.position)
          if (nextItems !== items) updateItems(nextItems)
        }
      }
      cleanupTaskDrag()
    }

    const cancelDrag = (cancelEvent: PointerEvent) => {
      const current = dragStateRef.current
      if (!current || current.pointerId !== cancelEvent.pointerId) return
      cleanupTaskDrag()
    }

    cleanupDragListenersRef.current = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', cancelDrag)
    }
    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', cancelDrag)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#101114] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3 pr-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-emerald-300">
            <ListChecks size={13} />
            <span className="truncate">Editable tasks</span>
          </div>
          <input
            data-home-widget-edit-control="true"
            value={config.title}
            onChange={event => patch({ title: event.target.value })}
            maxLength={36}
            aria-label="To-do list title"
            className="mt-1 w-full min-w-0 bg-transparent text-lg font-semibold leading-tight text-white outline-none placeholder:text-gray-600 focus:text-emerald-100"
            placeholder="To-do list"
          />
        </div>
        <div className="shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-right">
          <p className="text-xs font-semibold tabular-nums text-emerald-200">{doneCount}/{items.length}</p>
          <p className="text-[10px] text-emerald-400/70">done</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div ref={listRef} className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
        {items.length ? items.map(item => (
          <div
            key={item.id}
            data-todo-item-id={item.id}
            data-home-widget-edit-control="true"
            onClick={() => toggleTask(item.id)}
            className={`group/todo relative flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
              draggingTaskId === item.id
                ? 'border-emerald-400/45 bg-emerald-400/10 opacity-60'
                : 'border-surface-3 bg-surface-2 hover:border-emerald-400/35 hover:bg-surface-3/70'
            }`}
          >
            {dropTarget?.id === item.id && (
              <span
                className={`pointer-events-none absolute left-3 right-3 h-0.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.5)] ${dropTarget.position === 'before' ? '-top-1' : '-bottom-1'}`}
              />
            )}
            <button
              type="button"
              data-home-widget-edit-control="true"
              onPointerDown={event => startTaskDrag(event, item.id)}
              onClick={event => event.stopPropagation()}
              className="flex h-7 w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-surface-3 hover:text-emerald-200 active:cursor-grabbing"
              title="Hold and drag to reorder"
              aria-label="Reorder task"
            >
              <GripVertical size={13} />
            </button>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${item.done ? 'border-emerald-400 bg-emerald-400 text-surface-0' : 'border-gray-600 bg-surface-1 text-transparent group-hover/todo:border-emerald-300'}`}
              aria-hidden="true"
            >
              <Check size={13} />
            </span>
            <input
              data-home-widget-edit-control="true"
              value={item.text}
              onChange={event => updateTaskText(item.id, event.target.value)}
              aria-label="Edit task"
              className={`min-w-0 flex-1 bg-transparent text-xs leading-snug outline-none ${item.done ? 'text-gray-500 line-through decoration-gray-500' : 'text-gray-200'}`}
            />
            <button
              type="button"
              data-home-widget-edit-control="true"
              onClick={event => removeTask(event, item.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-200"
              title="Remove task"
              aria-label="Remove task"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )) : (
          <div className="flex h-full min-h-[88px] items-center justify-center rounded-lg border border-dashed border-surface-3 px-4 text-center text-xs leading-relaxed text-gray-600">
            Add a task below, then click it to cross it off.
          </div>
        )}
      </div>

      <form data-home-widget-edit-control="true" onSubmit={addTask} className="mt-3 flex shrink-0 items-center gap-1.5">
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="Add task"
          className="min-w-0 flex-1 rounded-lg border border-surface-3 bg-surface-2 px-2.5 py-2 text-xs text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/45"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-surface-0 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
          title="Add task"
          aria-label="Add task"
        >
          <Plus size={15} />
        </button>
      </form>
    </div>
  )
}
