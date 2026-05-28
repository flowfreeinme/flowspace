import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Clock, GripVertical, MapPin, Plus, Trash2, X } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { getTimelineItems, parseTimeline, TIMELINE_COLORS } from '../../lib/workflowBlocks'
import type { TimelineBar, TimelineData } from '../../lib/workflowBlocks'
import type { Block } from '../../types'

const CORNER_HANDLES = [
  { id: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
  { id: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
  { id: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
  { id: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
] as const

const editorLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#7f8795',
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: 0,
  marginBottom: 4,
}

const editorInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  background: '#101116',
  border: '1px solid #2b2d35',
  borderRadius: 8,
  padding: '7px 8px',
  fontSize: 11,
  color: '#dfe3ea',
  outline: 'none',
  boxSizing: 'border-box',
}

interface EditingItem {
  groupId: string
  bar: TimelineBar
  x: number
  y: number
}

interface TimelineBlockProps {
  block: Block
  selected: boolean
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onUpdate: (content: string) => void
  onDelete: () => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function clampPopover(rect: DOMRect) {
  const popW = 276
  const popH = 414
  const gap = 10
  const rightX = rect.right + gap
  const leftX = rect.left - popW - gap
  const x = rightX + popW <= window.innerWidth - 8
    ? rightX
    : leftX >= 8
      ? leftX
      : Math.max(8, Math.min(rect.left, window.innerWidth - popW - 8))
  const maxY = Math.max(8, window.innerHeight - popH - 8)
  const y = Math.max(8, Math.min(rect.top + 34, maxY))
  return { x, y }
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  const date = parseLocalDate(value)
  if (!date) return value || 'No date'
  return new Intl.DateTimeFormat(undefined, options).format(date)
}

function formatTime(value?: string) {
  if (!value) return ''
  const [hour, minute] = value.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

function dateText(bar: TimelineBar) {
  const start = formatDate(bar.start, { month: 'short', day: 'numeric' })
  if (bar.end && bar.end !== bar.start) {
    return `${start} - ${formatDate(bar.end, { month: 'short', day: 'numeric' })}`
  }
  return start
}

function timeText(bar: TimelineBar) {
  const start = formatTime(bar.startTime)
  const end = formatTime(bar.endTime)
  if (start && end) return `${start} - ${end}`
  return start || end || 'Any time'
}

function normalizeBarDates(bar: TimelineBar): TimelineBar {
  if (bar.start && (!bar.end || bar.end < bar.start)) return { ...bar, end: bar.start }
  return bar
}

export default function TimelineBlock({
  block, selected, zoom,
  onDragStart, onResizeHandleMouseDown, onUpdate, onDelete,
}: TimelineBlockProps) {
  const [data, setData] = useState<TimelineData>(() => parseTimeline(block.content))
  const blockRef = useRef<HTMLDivElement | null>(null)
  const dataRef = useRef(data)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)

  useEffect(() => {
    const next = parseTimeline(block.content)
    setData(next)
    dataRef.current = next
  }, [block.content])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  useEffect(() => {
    if (!editingItem) return
    function handleOutside() {
      setEditingItem(null)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [editingItem])

  function save(next: TimelineData) {
    setData(next)
    dataRef.current = next
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdate(JSON.stringify(dataRef.current)), 250)
  }

  function ensureGroup(current: TimelineData) {
    if (current.groups.length > 0) return current
    return { ...current, groups: [{ id: uuid(), label: 'Schedule', bars: [] }] }
  }

  function addItem(e: React.MouseEvent) {
    e.stopPropagation()
    const current = ensureGroup(dataRef.current)
    const group = current.groups[0]
    const colorIndex = group.bars.length % TIMELINE_COLORS.length
    const start = todayIso()
    const item: TimelineBar = {
      id: uuid(),
      label: 'New item',
      start,
      end: start,
      startTime: '09:00',
      endTime: '10:00',
      color: TIMELINE_COLORS[colorIndex],
    }
    const next = {
      ...current,
      groups: current.groups.map(g => g.id === group.id ? { ...g, bars: [item, ...g.bars] } : g),
    }
    save(next)
    const { x, y } = clampPopover(blockRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect())
    setEditingItem({ groupId: group.id, bar: item, x, y })
  }

  function updateItem(groupId: string, itemId: string, changes: Partial<TimelineBar>) {
    const current = dataRef.current
    const next = {
      ...current,
      groups: current.groups.map(group => group.id === groupId
        ? {
          ...group,
          bars: group.bars.map(bar => bar.id === itemId ? normalizeBarDates({ ...bar, ...changes }) : bar),
        }
        : group
      ),
    }
    save(next)
    setEditingItem(prev => prev && prev.groupId === groupId && prev.bar.id === itemId
      ? { ...prev, bar: normalizeBarDates({ ...prev.bar, ...changes }) }
      : prev
    )
  }

  function deleteItem(groupId: string, itemId: string) {
    const current = dataRef.current
    save({
      ...current,
      groups: current.groups.map(group => group.id === groupId
        ? { ...group, bars: group.bars.filter(bar => bar.id !== itemId) }
        : group
      ),
    })
    setEditingItem(null)
  }

  function openEditor(e: React.MouseEvent, groupId: string, bar: TimelineBar) {
    e.stopPropagation()
    const { x, y } = clampPopover(blockRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect())
    setEditingItem({ groupId, bar, x, y })
  }

  const items = useMemo(() => getTimelineItems(data), [data])
  const HS = 8 / zoom
  const tiny = data.width < 340 || data.height < 220
  const compact = data.width < 430 || data.height < 280
  const headerHeight = tiny ? 34 : 40
  const rowPad = tiny ? 8 : 10
  const dateColumnWidth = tiny ? 46 : compact ? 56 : 66
  const showMetaText = data.width >= 340
  const showNotes = data.width >= 420 && data.height >= 260
  const itemCountText = `${items.length} ${items.length === 1 ? 'item' : 'items'}`

  const editor = editingItem && typeof document !== 'undefined' ? (() => {
    const { groupId, bar } = editingItem
    return createPortal(
      <div
        key={bar.id}
        style={{
          position: 'fixed', left: editingItem.x, top: editingItem.y, width: 276,
          background: '#17181d', border: '1px solid #30323a', borderRadius: 12,
          padding: 12, zIndex: 10000, boxShadow: '0 18px 50px rgba(0,0,0,0.58)',
          boxSizing: 'border-box', maxHeight: 'calc(100vh - 16px)', overflowY: 'auto',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <span style={{ color: '#aab0bd', fontSize: 11, fontWeight: 800 }}>Edit timeline node</span>
          <button
            onClick={() => setEditingItem(null)}
            style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#747b89', cursor: 'pointer', padding: 0 }}
          >
            <X size={13} />
          </button>
        </div>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={editorLabelStyle}>Name</span>
          <input
            value={bar.label}
            onChange={e => updateItem(groupId, bar.id, { label: e.target.value })}
            style={{ ...editorInputStyle, padding: '8px 9px', fontSize: 13, color: '#f4f5f7', fontWeight: 700 }}
            placeholder="Timeline node name"
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 7 }}>
          <label style={{ minWidth: 0 }}>
            <span style={editorLabelStyle}>Start date</span>
            <input
              type="date"
              value={bar.start}
              onChange={e => updateItem(groupId, bar.id, { start: e.target.value })}
              style={{ ...editorInputStyle, colorScheme: 'dark' }}
            />
          </label>
          <label style={{ minWidth: 0 }}>
            <span style={editorLabelStyle}>End date</span>
            <input
              type="date"
              value={bar.end || bar.start}
              onChange={e => updateItem(groupId, bar.id, { end: e.target.value })}
              style={{ ...editorInputStyle, colorScheme: 'dark' }}
            />
          </label>
          <label style={{ minWidth: 0 }}>
            <span style={editorLabelStyle}>Start time</span>
            <input
              type="time"
              value={bar.startTime ?? ''}
              onChange={e => updateItem(groupId, bar.id, { startTime: e.target.value })}
              style={{ ...editorInputStyle, colorScheme: 'dark' }}
            />
          </label>
          <label style={{ minWidth: 0 }}>
            <span style={editorLabelStyle}>End time</span>
            <input
              type="time"
              value={bar.endTime ?? ''}
              onChange={e => updateItem(groupId, bar.id, { endTime: e.target.value })}
              style={{ ...editorInputStyle, colorScheme: 'dark' }}
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 7 }}>
          <span style={editorLabelStyle}>Location</span>
          <input
            value={bar.location ?? ''}
            onChange={e => updateItem(groupId, bar.id, { location: e.target.value })}
            style={{ ...editorInputStyle, padding: '7px 9px', fontSize: 12 }}
            placeholder="Location"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={editorLabelStyle}>Notes</span>
          <textarea
            value={bar.notes ?? ''}
            onChange={e => updateItem(groupId, bar.id, { notes: e.target.value })}
            style={{ ...editorInputStyle, height: 56, resize: 'none', padding: '7px 9px', fontSize: 12, lineHeight: 1.35 }}
            placeholder="Notes"
          />
        </label>

        <div style={{ marginBottom: 10 }}>
          <span style={editorLabelStyle}>Color</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {TIMELINE_COLORS.map(color => (
              <button
                key={color}
                onClick={() => updateItem(groupId, bar.id, { color })}
                title={`Set node color ${color}`}
                aria-label={`Set node color ${color}`}
                style={{
                  width: 22, height: 22, borderRadius: 7, background: color,
                  border: bar.color === color ? '2px solid #ffffff' : '2px solid transparent',
                  cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => deleteItem(groupId, bar.id)}
          style={{
            height: 26, display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', color: '#f87171',
            cursor: 'pointer', padding: 0, fontSize: 11, fontWeight: 800,
          }}
        >
          <Trash2 size={12} /> Delete item
        </button>
      </div>,
      document.body
    )
  })() : null

  return (
    <>
      <div
        ref={blockRef}
        data-card
        style={{
          position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height,
          background: '#101114', border: `1.5px solid ${selected ? '#7c6af7' : '#26272d'}`,
          borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: selected ? '0 10px 30px rgba(124,106,247,0.16), 0 10px 28px rgba(0,0,0,0.38)' : '0 8px 24px rgba(0,0,0,0.34)',
        }}
      >
      <div
        title="Move"
        onMouseDown={onDragStart}
        style={{
          position: 'absolute', left: 7, top: 7, zIndex: 10, width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(16,17,20,0.88)', border: '1px solid #2b2c32', borderRadius: 7,
          cursor: 'grab', userSelect: 'none', backdropFilter: 'blur(8px)',
        }}
      >
        <GripVertical size={12} style={{ color: '#747985' }} />
      </div>

      <div
        style={{
          position: 'absolute', left: 38, right: 38, top: 7, height: 24, zIndex: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          pointerEvents: 'none',
        }}
      >
        <div
          title={itemCountText}
          style={{
            minWidth: 0, height: 22, display: 'flex', alignItems: 'center', gap: 5,
            color: '#8b91a0', fontSize: 10, fontWeight: 600,
          }}
        >
          <CalendarDays size={11} />
          {!tiny && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemCountText}</span>}
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={addItem}
          title="Add item"
          style={{
            pointerEvents: 'auto', width: tiny ? 24 : 68, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: '#2563eb', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7,
            color: 'white', cursor: 'pointer', padding: 0, fontSize: 11, fontWeight: 700,
          }}
        >
          <Plus size={12} />
          {!tiny && <span>Add</span>}
        </button>
      </div>

      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={onDelete}
        title="Delete"
        style={{
          position: 'absolute', right: 7, top: 7, zIndex: 10, width: 24, height: 24,
          background: 'rgba(16,17,20,0.88)', border: '1px solid #2b2c32', borderRadius: 7,
          cursor: 'pointer', color: '#747985', padding: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
        }}
      >
        <X size={12} />
      </button>

      <div
        style={{ flex: 1, overflow: 'auto', padding: `${headerHeight}px ${tiny ? 7 : 10}px ${tiny ? 8 : 10}px`, background: '#0f1013' }}
        onMouseDown={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        {items.length === 0 ? (
          <div
            style={{
              height: '100%', minHeight: 88, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              color: '#6f7685', border: '1px dashed #2b2e36', borderRadius: 9,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
            }}
          >
            <CalendarDays size={16} />
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={addItem}
              style={{
                height: 26, display: 'flex', alignItems: 'center', gap: 6,
                background: '#171923', border: '1px solid #2d3140', borderRadius: 7,
                color: '#d7dae2', cursor: 'pointer', padding: '0 10px',
                fontSize: 11, fontWeight: 700,
              }}
            >
              <Plus size={12} /> Add item
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tiny ? 6 : 8 }}>
            {items.map((item, index) => {
              const { bar } = item
              const isFirstForDay = index === 0 || items[index - 1].bar.start !== bar.start
              return (
                <button
                  key={bar.id}
                  onClick={e => openEditor(e, item.groupId, bar)}
                  style={{
                    width: '100%', display: 'grid',
                    gridTemplateColumns: `${dateColumnWidth}px 14px minmax(0, 1fr)`,
                    gap: tiny ? 6 : 8, alignItems: 'stretch', textAlign: 'left',
                    background: isFirstForDay ? '#16181f' : '#13151a',
                    border: `1px solid ${isFirstForDay ? '#2a2f3a' : '#22252d'}`,
                    borderRadius: 9, padding: rowPad, color: '#e6e8ee',
                    cursor: 'pointer', minHeight: tiny ? 52 : 62, overflow: 'hidden',
                  }}
                >
                  <div style={{ minWidth: 0, alignSelf: 'center' }}>
                    <div style={{ color: '#f3f4f6', fontSize: tiny ? 12 : 14, fontWeight: 800, lineHeight: 1 }}>
                      {formatDate(bar.start, { day: 'numeric' })}
                    </div>
                    <div style={{ color: '#858c9c', fontSize: tiny ? 8 : 9, fontWeight: 700, textTransform: 'uppercase', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatDate(bar.start, { month: 'short' })}
                    </div>
                  </div>

                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: -rowPad, bottom: -rowPad, width: 1, background: '#2a2d36' }} />
                    <div style={{ position: 'relative', marginTop: 5, width: 10, height: 10, borderRadius: 999, background: bar.color || TIMELINE_COLORS[0], boxShadow: `0 0 0 3px #16181f, 0 0 0 4px ${bar.color || TIMELINE_COLORS[0]}55` }} />
                  </div>

                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ flex: 1, minWidth: 0, color: '#f4f5f7', fontSize: tiny ? 11 : 12, fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bar.label || 'Untitled'}
                      </span>
                      {!tiny && item.groupLabel && (
                        <span style={{ maxWidth: 82, color: '#8d95a5', background: '#1c1f27', border: '1px solid #2a2d36', borderRadius: 999, padding: '2px 6px', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.groupLabel}
                        </span>
                      )}
                    </div>

                    {showMetaText && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, color: '#9aa1ad', fontSize: tiny ? 9 : 10, fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, whiteSpace: 'nowrap' }}>
                          <Clock size={10} /> {timeText(bar)}
                        </span>
                        <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dateText(bar)}
                        </span>
                      </div>
                    )}

                    {bar.location && data.width >= 380 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7f8795', fontSize: 10, minWidth: 0 }}>
                        <MapPin size={10} />
                        <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bar.location}</span>
                      </div>
                    )}

                    {showNotes && bar.notes && (
                      <div style={{ color: '#6f7786', fontSize: 10, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bar.notes}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>

      {CORNER_HANDLES.map(h => (
        <div
          key={h.id}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }}
          style={{
            position: 'absolute', width: HS, height: HS,
            background: selected ? '#7c6af7' : '#3b3b3b',
            border: `${1 / zoom}px solid rgba(255,255,255,0.3)`,
            borderRadius: 2 / zoom,
            ...h.style,
          }}
        />
      ))}
      </div>
      {editor}
    </>
  )
}
