import { useRef, useState, useEffect, useCallback } from 'react'
import { Check, Eraser, Minus, Paintbrush, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { uploadDrawingToR2 } from '@/lib/r2'
import { useAuth } from '@/stores/auth'
import { clampBrushSize, getCanvasPoint, getDrawingExportMime, getDrawingExportSize, getScaledCanvasSize } from '@/lib/drawingCanvas'

const COLORS = ['#ffffff', '#7c6af7', '#34a853', '#ea4335', '#fbbc04', '#4285f4', '#ff6d00', '#e91e63', '#00bcd4', '#111827']
const CANVAS_BG = '#151522'

interface Props {
  pageId: string
  onInsert: (url: string, name: string, size: number) => void
  onClose: () => void
  initialImageUrl?: string
  mode?: 'create' | 'edit'
}

interface Point { x: number; y: number }
interface Stroke { points: Point[]; color: string; width: number; eraser: boolean }

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))
}

export default function DrawingCanvas({ pageId, onInsert, onClose, initialImageUrl, mode = 'create' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const baseImageRef = useRef<HTMLImageElement | null>(null)
  const canvasCssSizeRef = useRef({ width: 0, height: 0 })
  const currentRef = useRef<Stroke | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const activePointerRef = useRef<number | null>(null)
  const { user } = useAuth()
  const [color, setColor] = useState('#ffffff')
  const [brushSize, setBrushSize] = useState(4)
  const [eraser, setEraser] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [current, setCurrent] = useState<Stroke | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [baseImageStatus, setBaseImageStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    initialImageUrl ? 'loading' : 'idle',
  )

  const redraw = useCallback((allStrokes: Stroke[], active: Stroke | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    ctx.globalCompositeOperation = 'source-over'

    const baseImage = baseImageRef.current
    if (baseImage) {
      const { width, height } = canvasCssSizeRef.current
      ctx.drawImage(baseImage, 0, 0, width, height)
    }

    const all = active ? [...allStrokes, active] : allStrokes
    for (const stroke of all) {
      if (stroke.points.length === 0) continue
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.eraser ? stroke.width * 4 : stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over'

      const first = stroke.points[0]
      if (stroke.points.length === 1) {
        ctx.arc(first.x, first.y, ctx.lineWidth / 2, 0, Math.PI * 2)
        ctx.fillStyle = stroke.color
        stroke.eraser ? ctx.fill() : ctx.fill()
        continue
      }

      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const mx = (stroke.points[i].x + stroke.points[i + 1].x) / 2
        const my = (stroke.points[i].y + stroke.points[i + 1].y) / 2
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, mx, my)
      }
      const last = stroke.points[stroke.points.length - 1]
      ctx.lineTo(last.x, last.y)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const rect = stage.getBoundingClientRect()
    const { width, height, scale } = getScaledCanvasSize(rect.width, rect.height, window.devicePixelRatio)
    canvasCssSizeRef.current = { width: rect.width, height: rect.height }
    canvas.width = width
    canvas.height = height
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    const ctx = canvas.getContext('2d')
    ctx?.setTransform(scale, 0, 0, scale, 0, 0)
    redraw(strokesRef.current, currentRef.current)
  }, [redraw])

  useEffect(() => {
    resizeCanvas()
    const observer = new ResizeObserver(resizeCanvas)
    if (stageRef.current) observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [resizeCanvas])

  useEffect(() => { strokesRef.current = strokes }, [strokes])
  useEffect(() => { currentRef.current = current }, [current])

  useEffect(() => {
    if (!initialImageUrl) {
      baseImageRef.current = null
      setBaseImageStatus('idle')
      redraw(strokesRef.current, currentRef.current)
      return
    }

    let cancelled = false
    const image = new Image()
    setBaseImageStatus('loading')
    setError(null)
    image.onload = () => {
      if (cancelled) return
      baseImageRef.current = image
      setBaseImageStatus('ready')
      redraw(strokesRef.current, currentRef.current)
    }
    image.onerror = () => {
      if (cancelled) return
      baseImageRef.current = null
      setBaseImageStatus('error')
      setError('Could not load this drawing for editing.')
      redraw(strokesRef.current, currentRef.current)
    }
    image.src = `/api/r2-image?url=${encodeURIComponent(initialImageUrl)}`

    return () => { cancelled = true }
  }, [initialImageUrl, redraw])

  function pointFromPointer(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return getCanvasPoint(e, rect)
  }

  function beginStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (saving) return
    e.preventDefault()
    setError(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointerRef.current = e.pointerId
    const point = pointFromPointer(e)
    const next: Stroke = { points: [point], color, width: brushSize, eraser }
    setCurrent(next)
    currentRef.current = next
    redraw(strokesRef.current, next)
  }

  function continueStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current !== e.pointerId || !currentRef.current) return
    e.preventDefault()
    const point = pointFromPointer(e)
    const last = currentRef.current.points[currentRef.current.points.length - 1]
    const distance = Math.hypot(point.x - last.x, point.y - last.y)
    if (distance < 1.5) return

    const next = { ...currentRef.current, points: [...currentRef.current.points, point] }
    currentRef.current = next
    setCurrent(next)
    redraw(strokesRef.current, next)
  }

  function endStroke(e?: React.PointerEvent<HTMLCanvasElement>) {
    if (e && activePointerRef.current !== e.pointerId) return
    const finished = currentRef.current
    activePointerRef.current = null
    currentRef.current = null
    setCurrent(null)
    if (!finished) return

    const next = [...strokesRef.current, finished]
    strokesRef.current = next
    setStrokes(next)
    redraw(next, null)
  }

  function undo() {
    const next = strokesRef.current.slice(0, -1)
    strokesRef.current = next
    setStrokes(next)
    redraw(next, null)
  }

  function clear() {
    strokesRef.current = []
    setStrokes([])
    setCurrent(null)
    currentRef.current = null
    redraw([], null)
  }

  function setBrush(size: number) {
    setBrushSize(clampBrushSize(size))
    setEraser(false)
  }

  async function handleInsert() {
    if (!user) {
      setError('Sign in again before inserting drawings.')
      return
    }
    if (strokesRef.current.length === 0 && !initialImageUrl) return
    setSaving(true)
    setError(null)
    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Drawing canvas is not ready.')

      const exportCanvas = document.createElement('canvas')
      const { width, height } = getDrawingExportSize(canvas.width, canvas.height)
      exportCanvas.width = width
      exportCanvas.height = height
      const ctx = exportCanvas.getContext('2d')
      if (!ctx) throw new Error('Could not prepare this drawing.')

      ctx.drawImage(canvas, 0, 0, width, height)
      const { mimeType, extension } = getDrawingExportMime()
      const blob = await canvasToBlob(exportCanvas, mimeType)
      if (!blob) throw new Error('Could not export this drawing.')

      const fileName = `drawing.${extension}`
      let url: string
      try {
        ;({ url } = await uploadDrawingToR2(blob, user.id, pageId, fileName))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Storage upload failed.'
        throw new Error(`Drawing upload failed: ${message}`)
      }
      onInsert(url, fileName, blob.size)
      setSaving(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Drawing could not be inserted.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface-0 text-sm" style={{ height: 'var(--flowspace-viewport-height)' }}>
      <div className="flex shrink-0 items-center gap-3 border-b border-surface-3 bg-surface-1 px-4 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-3 text-accent">
          <Paintbrush size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">{mode === 'edit' ? 'Edit drawing' : 'Draw'}</h2>
          <p className="truncate text-xs text-gray-600">
            {mode === 'edit' ? 'Add notes, erase, or draw over the existing image' : 'Sketch with finger, trackpad, or pencil'}
          </p>
        </div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-surface-3 hover:text-white" title="Close">
          <X size={18} />
        </button>
      </div>

      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#151522]">
        <canvas
          ref={canvasRef}
          className="block cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={beginStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
        />
        {baseImageStatus === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="rounded-full border border-white/5 bg-black/25 px-4 py-2 text-xs text-gray-400">Loading drawing...</p>
          </div>
        )}
        {strokes.length === 0 && !current && !initialImageUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="rounded-full border border-white/5 bg-black/20 px-4 py-2 text-xs text-gray-500">Draw anywhere, then insert it into your board or page.</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-surface-3 bg-surface-1 px-3 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        {error && (
          <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setEraser(false)}
            className={`flex h-11 min-w-11 items-center justify-center rounded-xl border transition-colors ${!eraser ? 'border-accent bg-accent/15 text-white' : 'border-surface-4 text-gray-500 hover:text-white'}`}
            title="Brush"
          >
            <Paintbrush size={17} />
          </button>
          <button
            onClick={() => setEraser(true)}
            className={`flex h-11 min-w-11 items-center justify-center rounded-xl border transition-colors ${eraser ? 'border-accent bg-accent/15 text-white' : 'border-surface-4 text-gray-500 hover:text-white'}`}
            title="Eraser"
          >
            <Eraser size={17} />
          </button>

          <div className="mx-1 h-8 w-px shrink-0 bg-surface-4" />

          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); setEraser(false) }}
              className={`h-9 min-w-9 rounded-full border-2 transition-transform active:scale-95 ${color === c && !eraser ? 'border-white scale-105' : 'border-surface-4'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}

          <div className="mx-1 h-8 w-px shrink-0 bg-surface-4" />

          <div className="flex h-11 shrink-0 items-center rounded-xl border border-surface-4 bg-surface-2">
            <button onClick={() => setBrushSize(s => clampBrushSize(s - 1))} className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:text-white" title="Smaller brush">
              <Minus size={15} />
            </button>
            <button onClick={() => setBrush(4)} className="min-w-10 px-2 text-center text-xs font-medium text-gray-300" title="Reset brush size">
              {brushSize}
            </button>
            <button onClick={() => setBrushSize(s => clampBrushSize(s + 1))} className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:text-white" title="Larger brush">
              <Plus size={15} />
            </button>
          </div>

          <button onClick={undo} disabled={strokes.length === 0} className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-surface-4 text-gray-500 transition-colors hover:text-white disabled:opacity-30" title="Undo">
            <RotateCcw size={17} />
          </button>
          <button onClick={clear} disabled={strokes.length === 0} className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-surface-4 text-gray-500 transition-colors hover:text-red-400 disabled:opacity-30" title="Clear">
            <Trash2 size={17} />
          </button>
        </div>

        <button
          onClick={handleInsert}
          disabled={saving || baseImageStatus === 'loading' || (strokes.length === 0 && !initialImageUrl)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <Check size={16} />
          {saving ? 'Saving drawing...' : mode === 'edit' ? 'Save drawing' : 'Insert drawing'}
        </button>
      </div>
    </div>
  )
}
