const MIN_BRUSH_SIZE = 1
const MAX_BRUSH_SIZE = 36
const DRAWING_CANVAS_BACKGROUND = '#ffffff'

export function clampBrushSize(size: number) {
  return Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, Math.round(size)))
}

export function getCanvasPoint(
  pointer: { clientX: number; clientY: number },
  rect: Pick<DOMRect, 'left' | 'top'>,
) {
  return {
    x: pointer.clientX - rect.left,
    y: pointer.clientY - rect.top,
  }
}

export function getScaledCanvasSize(width: number, height: number, devicePixelRatio: number) {
  const scale = Math.max(1, devicePixelRatio || 1)
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale,
  }
}

export function getDrawingExportSize(width: number, height: number, maxSide = 1600) {
  const longest = Math.max(width, height)
  if (longest <= maxSide) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
  }
  const scale = maxSide / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function getDrawingExportMime() {
  return { mimeType: 'image/png', extension: 'png' }
}

export function getDrawingCanvasBackground() {
  return DRAWING_CANVAS_BACKGROUND
}
