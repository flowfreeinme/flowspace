import { useRef, useState, useEffect, useCallback } from 'react'
import { X, Check, RotateCw, FlipHorizontal2 } from 'lucide-react'

interface Rect { x: number; y: number; w: number; h: number }
type Handle = 'tl'|'tr'|'bl'|'br'|'t'|'b'|'l'|'r'|'move'

interface Props {
  file: File
  onConfirm: (blob: Blob, fileName: string) => void
  onCancel: () => void
}

const MIN = 40

export default function ImageCropModal({ file, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState('')
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 })
  const [displaySize, setDisplaySize] = useState({ w: 1, h: 1 })
  const [crop, setCrop] = useState<Rect>({ x: 10, y: 10, w: 80, h: 80 }) // % of display
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const drag = useRef<{ handle: Handle; startX: number; startY: number; startCrop: Rect } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onImgLoad() {
    const img = imgRef.current!
    const container = containerRef.current!
    const containerW = container.clientWidth
    const containerH = Math.min(container.clientWidth * 0.7, 420)
    const scale = Math.min(containerW / img.naturalWidth, containerH / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    setDisplaySize({ w: dw, h: dh })
    setCrop({ x: 10, y: 10, w: 80, h: 80 })
  }

  function pxToPct(px: number, dim: number) { return (px / dim) * 100 }
  function pctToPx(pct: number, dim: number) { return (pct / 100) * dim }

  function onMouseDown(e: React.MouseEvent, handle: Handle) {
    e.preventDefault()
    drag.current = { handle, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!drag.current) return
    const { handle, startX, startY, startCrop: sc } = drag.current
    const { w: dw, h: dh } = displaySize
    const dx = pxToPct(e.clientX - startX, dw)
    const dy = pxToPct(e.clientY - startY, dh)

    setCrop(() => {
      let { x, y, w, h } = sc
      if (handle === 'move') {
        x = Math.max(0, Math.min(100 - w, sc.x + dx))
        y = Math.max(0, Math.min(100 - h, sc.y + dy))
      }
      if (handle === 'tl' || handle === 'l' || handle === 'bl') {
        const nx = Math.min(sc.x + dx, sc.x + sc.w - pxToPct(MIN, dw))
        w = sc.w - (nx - sc.x); x = nx
      }
      if (handle === 'tr' || handle === 'r' || handle === 'br') {
        w = Math.max(pxToPct(MIN, dw), sc.w + dx)
      }
      if (handle === 'tl' || handle === 't' || handle === 'tr') {
        const ny = Math.min(sc.y + dy, sc.y + sc.h - pxToPct(MIN, dh))
        h = sc.h - (ny - sc.y); y = ny
      }
      if (handle === 'bl' || handle === 'b' || handle === 'br') {
        h = Math.max(pxToPct(MIN, dh), sc.h + dy)
      }
      x = Math.max(0, x); y = Math.max(0, y)
      w = Math.min(100 - x, w); h = Math.min(100 - y, h)
      return { x, y, w, h }
    })
  }, [displaySize])

  const onMouseUp = useCallback(() => {
    drag.current = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  async function handleConfirm() {
    const img = imgRef.current!
    const cx = (crop.x / 100) * naturalSize.w
    const cy = (crop.y / 100) * naturalSize.h
    const cw = (crop.w / 100) * naturalSize.w
    const ch = (crop.h / 100) * naturalSize.h
    const canvas = document.createElement('canvas')
    canvas.width = cw; canvas.height = ch
    const ctx = canvas.getContext('2d')!
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    if (flipH) { ctx.translate(cw, 0); ctx.scale(-1, 1) }
    if (rotate) {
      ctx.translate(cw / 2, ch / 2)
      ctx.rotate((rotate * Math.PI) / 180)
      ctx.translate(-cw / 2, -ch / 2)
    }
    ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch)
    canvas.toBlob(blob => {
      if (blob) onConfirm(blob, file.name.replace(/\.[^.]+$/, '') + '.jpg')
    }, 'image/jpeg', 0.92)
  }

  const left = pctToPx(crop.x, displaySize.w)
  const top = pctToPx(crop.y, displaySize.h)
  const width = pctToPx(crop.w, displaySize.w)
  const height = pctToPx(crop.h, displaySize.h)

  const handles: { id: Handle; cls: string }[] = [
    { id: 'tl', cls: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize' },
    { id: 'tr', cls: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize' },
    { id: 'bl', cls: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize' },
    { id: 'br', cls: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize' },
    { id: 't', cls: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize' },
    { id: 'b', cls: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize' },
    { id: 'l', cls: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize' },
    { id: 'r', cls: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize' },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-3">
          <h2 className="font-semibold text-white text-sm">Crop & adjust</h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-surface-4 text-gray-400 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Image + crop overlay */}
        <div ref={containerRef} className="px-5 pt-5 relative select-none">
          <div className="relative mx-auto overflow-hidden rounded-lg bg-surface-3"
            style={{ width: displaySize.w, height: displaySize.h }}>
            {src && (
              <img
                ref={imgRef}
                src={src}
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  width: displaySize.w, height: displaySize.h,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                  transform: `scaleX(${flipH ? -1 : 1}) rotate(${rotate}deg)`,
                  display: 'block',
                }}
                alt=""
              />
            )}
            {/* Dark overlay outside crop */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
            {/* Crop window */}
            <div
              className="absolute border-2 border-white"
              style={{ left, top, width, height, cursor: 'move', backgroundColor: 'transparent', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
              onMouseDown={e => onMouseDown(e, 'move')}
            >
              {/* Rule of thirds grid */}
              <div className="absolute inset-0 pointer-events-none">
                {[33, 66].map(p => (
                  <div key={p}>
                    <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${p}%` }} />
                    <div className="absolute left-0 right-0 h-px bg-white/20" style={{ top: `${p}%` }} />
                  </div>
                ))}
              </div>
              {handles.map(h => (
                <div key={h.id} onMouseDown={e => { e.stopPropagation(); onMouseDown(e, h.id) }}
                  className={`absolute w-3 h-3 bg-white rounded-sm shadow-md ${h.cls}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Adjustments */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3 justify-center mb-1">
            <button onClick={() => setRotate(r => (r + 90) % 360)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-surface-3 transition-colors">
              <RotateCw size={13} /> Rotate
            </button>
            <button onClick={() => setFlipH(f => !f)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${flipH ? 'text-accent bg-accent/10' : 'text-gray-400 hover:text-white hover:bg-surface-3'}`}>
              <FlipHorizontal2 size={13} /> Flip
            </button>
          </div>
          {[
            { label: 'Brightness', value: brightness, set: setBrightness, min: 50, max: 150 },
            { label: 'Contrast', value: contrast, set: setContrast, min: 50, max: 150 },
            { label: 'Saturation', value: saturation, set: setSaturation, min: 0, max: 200 },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 shrink-0">{s.label}</span>
              <input type="range" min={s.min} max={s.max} value={s.value}
                onChange={e => s.set(Number(e.target.value))}
                className="flex-1 accent-accent h-1" />
              <span className="text-xs text-gray-600 w-8 text-right">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel}
            className="flex-1 py-2 bg-surface-3 hover:bg-surface-4 text-gray-300 rounded-lg text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
            <Check size={14} /> Apply
          </button>
        </div>
      </div>
    </div>
  )
}
