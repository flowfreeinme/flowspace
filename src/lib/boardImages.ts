export interface BoardImageData {
  url: string
  x: number
  y: number
  width: number
  height: number
  kind?: 'drawing' | 'image'
}

const DRAWING_UPLOAD_RE = /(?:^|\/)[^/?#]*drawing\.(png|webp|jpe?g)(?:[?#].*)?$/i

export function parseBoardImage(content: string): BoardImageData {
  try {
    const data = JSON.parse(content) as BoardImageData
    if (typeof data.x === 'number') return data
  } catch {}

  return { url: '', x: 0, y: 260, width: 320, height: 220 }
}

export function isEditableDrawing(data: Pick<BoardImageData, 'url' | 'kind'>): boolean {
  return data.kind === 'drawing' || DRAWING_UPLOAD_RE.test(data.url)
}

export function getBoardImageObjectFit(data: Pick<BoardImageData, 'url' | 'kind'>): 'contain' | 'fill' {
  return isEditableDrawing(data) ? 'fill' : 'contain'
}
