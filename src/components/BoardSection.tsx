import { useRef, useState, useEffect } from 'react'
import { X } from 'lucide-react'

const SECTION_W = 280

interface SectionData { title: string; x: number; y: number }

export default function BoardSection({ id, data, selected, onDragStart, onTitleChange, onDelete }: {
  id: string; data: SectionData; selected: boolean
  onDragStart: (e: React.MouseEvent) => void
  onTitleChange: (t: string) => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (titleRef.current && titleRef.current.textContent !== data.title) titleRef.current.textContent = data.title
  }, [id])

  useEffect(() => {
    if (focusedRef.current || !titleRef.current) return
    if (titleRef.current.textContent !== data.title) titleRef.current.textContent = data.title
  }, [data.title])

  return (
    <div className="absolute select-none" style={{ left: data.x, top: data.y, minWidth: SECTION_W }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onMouseDown={e => { if ((e.target as HTMLElement).closest('[data-no-drag]')) return; onDragStart(e) }}>
      <div className="flex items-center gap-2 cursor-grab pb-1.5">
        <div ref={titleRef} contentEditable suppressContentEditableWarning data-no-drag="true"
          onFocus={() => { focusedRef.current = true }}
          onBlur={() => { focusedRef.current = false }}
          onInput={e => onTitleChange((e.target as HTMLDivElement).textContent ?? '')}
          onMouseDown={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
          className={`text-base font-semibold tracking-wide uppercase outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600 ${selected ? 'text-accent' : 'text-gray-400'}`}
          data-placeholder="Section" />
        {(hovered || selected) && (
          <button data-no-drag="true" onClick={onDelete} onMouseDown={e => e.stopPropagation()}
            className="p-0.5 rounded text-gray-700 hover:text-red-400 transition-colors"><X size={11} /></button>
        )}
      </div>
      <div className={`h-px w-full ${selected ? 'bg-accent/50' : 'bg-surface-3'}`} />
    </div>
  )
}
