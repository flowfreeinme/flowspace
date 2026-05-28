import { useRef, useState, useEffect, useCallback } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'

interface Props {
  pageId: string
  onClose: () => void
}

interface Point { x: number; y: number }

function pointInPolygon(x: number, y: number, poly: Point[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export default function LassoOverlay({ pageId, onClose }: Props) {
  const { pages, deleteBlock } = useWorkspace()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [path, setPath] = useState<Point[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const isDrawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
  }, [])

  function getPos(e: React.MouseEvent): Point {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function draw(pts: Point[]) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.closePath()
    ctx.strokeStyle = '#7c6af7'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.stroke()
    ctx.fillStyle = 'rgba(124,106,247,0.08)'
    ctx.fill()
    ctx.setLineDash([])
  }

  function onMouseDown(e: React.MouseEvent) {
    if (done) return
    isDrawing.current = true
    const pos = getPos(e)
    setPath([pos])
    setSelectedIds([])
  }

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current || done) return
    setPath(prev => {
      const next = [...prev, getPos(e)]
      draw(next)
      return next
    })
  }, [done])

  function onMouseUp() {
    if (!isDrawing.current) return
    isDrawing.current = false
    setDone(true)

    const page = pages[pageId]
    if (!page) return

    // Find which block elements are inside the lasso
    const selected: string[] = []
    page.blocks.forEach(block => {
      const el = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement
      if (!el) return
      const rect = el.getBoundingClientRect()
      const canvas = canvasRef.current!
      const canvasRect = canvas.getBoundingClientRect()
      const cx = rect.left + rect.width / 2 - canvasRect.left
      const cy = rect.top + rect.height / 2 - canvasRect.top
      if (pointInPolygon(cx, cy, path)) selected.push(block.id)
    })
    setSelectedIds(selected)
  }

  function handleDeleteSelected() {
    selectedIds.forEach(id => deleteBlock(pageId, id))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[55]" style={{ cursor: done ? 'default' : 'crosshair' }}>
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-2 border border-surface-4 rounded-xl px-4 py-2 shadow-2xl">
        {!done ? (
          <p className="text-sm text-gray-400">Draw a loop around blocks to select them</p>
        ) : selectedIds.length > 0 ? (
          <>
            <p className="text-sm text-gray-300">{selectedIds.length} block{selectedIds.length > 1 ? 's' : ''} selected</p>
            <button onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors">
              <Trash2 size={13} /> Delete
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500">No blocks inside selection</p>
        )}
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors ml-1">
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
