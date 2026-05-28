import { useState, useRef, useEffect } from 'react'
import { X, GripVertical, Plus } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { parseKanban } from '@/lib/workflowBlocks'
import type { KanbanData, KanbanCard, KanbanColumn } from '@/lib/workflowBlocks'
import type { Block } from '@/types'

const CORNER_HANDLES = [
  { id: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
  { id: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
  { id: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
  { id: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
] as const

interface KanbanBlockProps {
  block: Block
  selected: boolean
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onUpdate: (content: string) => void
  onDelete: () => void
}

export default function KanbanBlock({
  block, selected, zoom,
  onDragStart, onResizeHandleMouseDown, onUpdate, onDelete,
}: KanbanBlockProps) {
  const [data, setData] = useState<KanbanData>(() => parseKanban(block.content))
  const dataRef = useRef(data)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draggingCard, setDraggingCard] = useState<{ cardId: string; fromColId: string } | null>(null)

  useEffect(() => {
    const next = parseKanban(block.content)
    setData(next)
    dataRef.current = next
  }, [block.content])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function save(next: KanbanData) {
    setData(next)
    dataRef.current = next
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdate(JSON.stringify(dataRef.current)), 300)
  }

  function addCard(colId: string) {
    const current = dataRef.current
    const newCard: KanbanCard = { id: uuid(), text: 'New card' }
    save({ ...current, columns: current.columns.map(c => c.id === colId ? { ...c, cards: [...c.cards, newCard] } : c) })
  }

  function addColumn() {
    const current = dataRef.current
    const newCol: KanbanColumn = { id: uuid(), title: 'New Column', cards: [] }
    save({ ...current, columns: [...current.columns, newCol] })
  }

  function updateCardText(colId: string, cardId: string, text: string) {
    const current = dataRef.current
    save({ ...current, columns: current.columns.map(c => c.id === colId ? { ...c, cards: c.cards.map(card => card.id === cardId ? { ...card, text } : card) } : c) })
  }

  function deleteCard(colId: string, cardId: string) {
    const current = dataRef.current
    save({ ...current, columns: current.columns.map(c => c.id === colId ? { ...c, cards: c.cards.filter(card => card.id !== cardId) } : c) })
  }

  function onDrop(e: React.DragEvent, toColId: string) {
    e.preventDefault()
    if (!draggingCard || draggingCard.fromColId === toColId) return
    const { cardId, fromColId } = draggingCard
    const current = dataRef.current
    const card = current.columns.find(c => c.id === fromColId)?.cards.find(c => c.id === cardId)
    if (!card) return
    save({
      ...current,
      columns: current.columns.map(c => {
        if (c.id === fromColId) return { ...c, cards: c.cards.filter(cc => cc.id !== cardId) }
        if (c.id === toColId) return { ...c, cards: [...c.cards, card] }
        return c
      }),
    })
    setDraggingCard(null)
  }

  const HS = 8 / zoom

  return (
    <div
      data-card
      style={{
        position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height,
        background: '#111214', border: `1.5px solid ${selected ? '#7c6af7' : '#25262b'}`,
        borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden',
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
        onMouseDown={e => e.stopPropagation()}
        onClick={onDelete}
        title="Delete"
        style={{ position: 'absolute', right: 7, top: 7, zIndex: 10, width: 24, height: 24, background: 'rgba(17,18,20,0.82)', border: '1px solid #2a2b31', borderRadius: 7, cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
      >
        <X size={12} />
      </button>

      {/* Body */}
      <div
        style={{ flex: 1, display: 'flex', gap: 7, padding: '36px 8px 8px', overflowX: 'auto', overflowY: 'hidden', background: '#0f0f0f' }}
        onMouseDown={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        {data.columns.map(col => (
          <div
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, col.id)}
            title={col.title}
            style={{ minWidth: 146, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, background: '#16171b', border: '1px solid #25262b', borderRadius: 8, padding: 7 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 6, marginBottom: 1 }}>
              <span style={{ width: 22, height: 3, borderRadius: 99, background: col.cards.length ? '#7c6af7' : '#3a3b42', opacity: col.cards.length ? 0.8 : 0.55 }} />
              <span style={{ flex: 1, height: 1, borderRadius: 99, background: '#25262b' }} />
            </div>
            {col.cards.map(card => (
              <div
                key={card.id}
                draggable
                onDragStart={() => setDraggingCard({ cardId: card.id, fromColId: col.id })}
                style={{ background: '#222329', border: '1px solid #30313a', borderRadius: 7, padding: '7px 8px', position: 'relative', cursor: 'grab', boxShadow: '0 4px 10px rgba(0,0,0,0.18)' }}
              >
                <div
                  contentEditable suppressContentEditableWarning
                  onBlur={e => updateCardText(col.id, card.id, e.currentTarget.textContent ?? '')}
                  style={{ fontSize: 12, color: '#e5e7eb', outline: 'none', minHeight: 15, lineHeight: 1.25 }}
                >
                  {card.text}
                </div>
                <button
                  onClick={() => deleteCard(col.id, card.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addCard(col.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#111214', border: '1px solid #25262b', cursor: 'pointer', color: '#6b7280', fontSize: 11, padding: '5px 7px', borderRadius: 7, textAlign: 'left' }}
            >
              <Plus size={11} /> Add card
            </button>
          </div>
        ))}
        <button
          onClick={addColumn}
          style={{ minWidth: 80, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#15161a', border: '1px dashed #30313a', borderRadius: 8, cursor: 'pointer', color: '#6b7280', fontSize: 11, flexShrink: 0, alignSelf: 'flex-start', padding: '8px 10px' }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Resize corner handles */}
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
  )
}
