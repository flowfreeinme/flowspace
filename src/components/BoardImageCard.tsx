import { useState } from 'react'
import { X } from 'lucide-react'
import type { BoardImageData } from '@/lib/boardImages'

export default function BoardImageCard({ id: _id, data, selected, onDragStart, onContextMenu, onDelete }: {
  id: string; data: BoardImageData; selected: boolean
  onDragStart: (e: React.MouseEvent) => void; onContextMenu: (e: React.MouseEvent) => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="absolute select-none" style={{ left: data.x, top: data.y, width: data.width, height: data.height }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
      onMouseDown={e => {
        if (e.button !== 0) return
        e.preventDefault()
        onDragStart(e)
      }}>
      <div className={`w-full h-full rounded-2xl overflow-hidden border transition-colors ${
        selected ? 'border-accent ring-2 ring-accent/30' : hovered ? 'border-surface-4' : 'border-surface-3'}`}
        style={{ cursor: 'grab' }}>
        <img src={data.url} alt="" className="w-full h-full object-contain bg-surface-1" draggable={false} />
      </div>
      {(hovered || selected) && (
        <button onClick={onDelete} onMouseDown={e => e.stopPropagation()}
          className="absolute top-2 right-2 z-10 p-0.5 rounded bg-surface-2/80 text-gray-500 hover:text-red-400 transition-colors">
          <X size={11} />
        </button>
      )}
    </div>
  )
}
