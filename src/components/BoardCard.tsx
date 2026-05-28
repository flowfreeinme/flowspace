import { useRef, useState, useEffect } from 'react'
import { X } from 'lucide-react'

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name)
    })
  })
  return doc.body.innerHTML
}

interface CardData { text: string; x: number; y: number; width: number; height: number }


export default function BoardCard({ id, data, selected, onDragStart, onResizeHandleMouseDown, onTextChange, onDelete }: {
  id: string; data: CardData; selected: boolean
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onTextChange: (t: string) => void; onDelete: () => void
}) {
  const [resizeActive, setResizeActive] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (textRef.current && textRef.current.innerHTML !== data.text) textRef.current.innerHTML = sanitizeHtml(data.text)
  }, [id])

  useEffect(() => {
    if (focusedRef.current || !textRef.current) return
    if (textRef.current.innerHTML !== data.text) textRef.current.innerHTML = sanitizeHtml(data.text)
  }, [data.text])


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
    <div ref={cardRef} className="absolute select-none" style={{ left: data.x, top: data.y, width: data.width, height: data.height }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onDoubleClick={e => { e.stopPropagation(); setResizeActive(v => !v) }}>
      <div className={`flex flex-col h-full rounded-2xl border transition-colors overflow-hidden ${
        selected ? 'border-accent bg-surface-2 ring-2 ring-accent/30'
        : resizeActive ? 'border-accent/50 bg-surface-2'
        : hovered || focused ? 'border-surface-4 bg-surface-2' : 'border-surface-3 bg-surface-1'}`}
        style={{ cursor: resizeActive ? 'default' : 'grab' }}
        onMouseDown={e => { if ((e.target as HTMLElement).closest('[data-no-drag]')) return; onDragStart(e) }}>

        {(hovered || resizeActive || selected) && (
          <button data-no-drag="true" onClick={onDelete} onMouseDown={e => e.stopPropagation()}
            className="absolute top-2 right-2 z-10 p-0.5 rounded text-gray-600 hover:text-red-400 transition-colors">
            <X size={11} />
          </button>
        )}

        <div className="flex-1 overflow-auto p-3">
          <div ref={textRef} contentEditable suppressContentEditableWarning
            data-no-drag="true" data-card-editor="true"
            onFocus={() => { focusedRef.current = true; setFocused(true) }}
            onBlur={() => {
              focusedRef.current = false
              setTimeout(() => {
                if (!cardRef.current?.contains(document.activeElement)) setFocused(false)
              }, 100)
            }}
            onInput={e => onTextChange(sanitizeHtml((e.target as HTMLDivElement).innerHTML ?? ''))}
            onMouseDown={e => e.stopPropagation()}
            className="outline-none text-sm text-gray-200 whitespace-pre-wrap break-words h-full select-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
            data-placeholder="Type something…" />
        </div>


      </div>

      {hovered && !resizeActive && !selected && (
        <p className="absolute -bottom-5 left-0 text-[10px] text-gray-700 whitespace-nowrap pointer-events-none">Double-click border to resize</p>
      )}
      {resizeActive && handles.map(h => (
        <div key={h.id} className={`absolute w-3 h-3 rounded-sm bg-accent border-2 border-white shadow-md z-10 ${h.cls}`}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }} />
      ))}
    </div>
  )
}
