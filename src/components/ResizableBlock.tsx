import { useRef, useState, useEffect, useCallback } from 'react'

type Handle = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'

interface Props {
  width?: number | null
  height?: number | null
  onResize: (w: number, h: number) => void
  lockAspectRatio?: boolean
  minW?: number
  minH?: number
  children: React.ReactNode
  className?: string
}

const HANDLES: { id: Handle; cls: string }[] = [
  { id: 'nw', cls: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize' },
  { id: 'n',  cls: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize' },
  { id: 'ne', cls: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize' },
  { id: 'e',  cls: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-e-resize' },
  { id: 'se', cls: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize' },
  { id: 's',  cls: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize' },
  { id: 'sw', cls: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize' },
  { id: 'w',  cls: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-w-resize' },
]

export default function ResizableBlock({
  width, height, onResize, lockAspectRatio = false,
  minW = 80, minH = 40, children, className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [liveSize, setLiveSize] = useState<{ w: number; h: number } | null>(null)
  const liveSizeRef = useRef<{ w: number; h: number } | null>(null)
  const dragRef = useRef<{
    handle: Handle
    startX: number; startY: number
    startW: number; startH: number
    aspect: number
  } | null>(null)

  // deactivate on outside click
  useEffect(() => {
    if (!active) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setActive(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [active])

  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setActive(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY

    let w = d.startW
    let h = d.startH

    if (d.handle.includes('e')) w = Math.max(minW, d.startW + dx)
    if (d.handle.includes('w')) w = Math.max(minW, d.startW - dx)
    if (d.handle.includes('s')) h = Math.max(minH, d.startH + dy)
    if (d.handle.includes('n')) h = Math.max(minH, d.startH - dy)

    if (lockAspectRatio) {
      const primaryH = d.handle.includes('n') || d.handle.includes('s')
      h = primaryH ? h : w / d.aspect
      w = primaryH ? h * d.aspect : w
    }

    const next = { w: Math.round(w), h: Math.round(h) }
    liveSizeRef.current = next
    setLiveSize(next)
  }, [lockAspectRatio, minW, minH])

  const onMouseUp = useCallback(() => {
    if (liveSizeRef.current) onResize(liveSizeRef.current.w, liveSizeRef.current.h)
    dragRef.current = null
    liveSizeRef.current = null
    setLiveSize(null)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove, onResize])

  function onHandleMouseDown(e: React.MouseEvent, handle: Handle) {
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current!.getBoundingClientRect()
    dragRef.current = {
      handle,
      startX: e.clientX, startY: e.clientY,
      startW: liveSize?.w ?? width ?? rect.width,
      startH: liveSize?.h ?? height ?? rect.height,
      aspect: rect.width / rect.height,
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const currentW = liveSize?.w ?? width ?? undefined
  const currentH = liveSize?.h ?? height ?? undefined

  return (
    <div
      ref={containerRef}
      className={`relative inline-block select-none ${active ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface-0' : ''} ${className}`}
      style={{ width: currentW, height: currentH }}
      onDoubleClick={() => setActive(true)}
    >
      {children}
      {active && HANDLES.map(h => (
        <div
          key={h.id}
          className={`absolute w-3 h-3 bg-accent border-2 border-white rounded-sm shadow-lg z-20 ${h.cls}`}
          onMouseDown={e => onHandleMouseDown(e, h.id)}
        />
      ))}
    </div>
  )
}
