export const MIN_FONT_SIZE = 1
export const MAX_FONT_SIZE = 7

export function clampFontSize(value: string | number, fallback = 3) {
  const parsed = typeof value === 'number' ? value : parseInt(value, 10)
  const safeValue = Number.isFinite(parsed) ? parsed : fallback
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, safeValue))
}

export function normalizeLinkUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function findCardEditorFromSelection(selection: Selection | null): HTMLElement | null {
  const node = selection?.anchorNode
  const element = node instanceof HTMLElement ? node : node?.parentElement
  return element?.closest<HTMLElement>('[data-card-editor="true"]') ?? null
}

export function dispatchCardEditorInput(editor: HTMLElement | null) {
  if (!editor) return false
  const event = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType: 'formatBold' })
    : new Event('input', { bubbles: true })
  editor.dispatchEvent(event)
  return true
}

export function runRichTextCommand(command: string, value?: string, editor?: HTMLElement | null) {
  const ok = document.execCommand(command, false, value)
  dispatchCardEditorInput(editor ?? findCardEditorFromSelection(window.getSelection()))
  return ok
}
