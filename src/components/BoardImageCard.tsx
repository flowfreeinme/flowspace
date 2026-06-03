import { useState } from 'react'
import { X } from 'lucide-react'
import { getBoardImageObjectFit, type BoardImageData } from '@/lib/boardImages'

export default function BoardImageCard({ id: _id, data, selected, onDragStart, onResizeHandleMouseDown, onContextMenu, onDelete }: {
  id: string; data: BoardImageData; selected: boolean
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onContextMenu: (e: React.MouseEvent) => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [resizeActive, setResizeActive] = useState(false)
  const objectFit = getBoardImageObjectFit(data)
  const handles = [
    { id: 'se', cls: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize' },
    { id: 'sw', cls: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize' },
    { id: 'ne', cls: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize' },
    { id: 'nw', cls: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize' },
    { id: 'e',  cls: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-e-resize' },
    { id: 'w',  cls: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-w-resize' },
    { id: 's',  cls: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize' },
    { id: 'n',  cls: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize' },
  ]

  return (
    <div className="absolute select-none" style={{ left: data.x, top: data.y, width: data.width, height: data.height }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
      onDoubleClick={e => { e.stopPropagation(); setResizeActive(v => !v) }}
      onMouseDown={e => {
        if (e.button !== 0) return
        e.preventDefault()
        if (resizeActive) return
        onDragStart(e)
      }}>
      <div className={`w-full h-full rounded-2xl overflow-hidden border transition-colors ${
        selected ? 'border-accent ring-2 ring-accent/30'
        : resizeActive ? 'border-accent/60 ring-2 ring-accent/20'
        : hovered ? 'border-surface-4' : 'border-surface-3'}`}
        style={{ cursor: resizeActive ? 'default' : 'grab' }}>
        <img
          src={data.url}
          alt=""
          className={`h-full w-full ${objectFit === 'fill' ? 'object-fill bg-white' : 'object-contain bg-surface-1'}`}
          draggable={false}
        />
      </div>
      {(hovered || selected || resizeActive) && (
        <button onClick={onDelete} onMouseDown={e => e.stopPropagation()}
          className="absolute top-2 right-2 z-10 p-0.5 rounded bg-surface-2/80 text-gray-500 hover:text-red-400 transition-colors">
          <X size={11} />
        </button>
      )}
      {hovered && !resizeActive && !selected && (
        <p className="absolute -bottom-5 left-0 text-[10px] text-gray-700 whitespace-nowrap pointer-events-none">Double-click to resize</p>
      )}
      {resizeActive && handles.map(h => (
        <div
          key={h.id}
          className={`absolute z-10 h-3 w-3 rounded-sm border-2 border-white bg-accent shadow-md ${h.cls}`}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }}
        />
      ))}
    </div>
  )
}
