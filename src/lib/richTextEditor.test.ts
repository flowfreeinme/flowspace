import { describe, expect, it, vi } from 'vitest'
import { clampFontSize, normalizeLinkUrl, runRichTextCommand } from './richTextEditor'

describe('rich text editor helpers', () => {
  it('keeps toolbar font size values in the supported editor range', () => {
    expect(clampFontSize('0')).toBe(1)
    expect(clampFontSize('3')).toBe(3)
    expect(clampFontSize('9')).toBe(7)
    expect(clampFontSize('nope', 4)).toBe(4)
  })

  it('normalizes bare links to https links', () => {
    expect(normalizeLinkUrl('example.com')).toBe('https://example.com')
    expect(normalizeLinkUrl('https://example.com')).toBe('https://example.com')
    expect(normalizeLinkUrl(' http://example.com ')).toBe('http://example.com')
  })

  it('dispatches an input event after toolbar formatting commands', () => {
    const originalDocument = globalThis.document
    const originalWindow = globalThis.window
    const dispatchEvent = vi.fn()
    const editor = { dispatchEvent } as unknown as HTMLElement
    const execCommand = vi.fn(() => true)

    Object.defineProperty(globalThis, 'document', {
      value: { execCommand },
      configurable: true,
    })
    Object.defineProperty(globalThis, 'window', {
      value: { getSelection: () => null },
      configurable: true,
    })
    Object.defineProperty(globalThis, 'InputEvent', {
      value: class {
        type: string
        bubbles: boolean
        inputType: string
        constructor(type: string, options: { bubbles: boolean; inputType: string }) {
          this.type = type
          this.bubbles = options.bubbles
          this.inputType = options.inputType
        }
      },
      configurable: true,
    })

    expect(runRichTextCommand('bold', undefined, editor)).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('bold', false, undefined)
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    expect(dispatchEvent.mock.calls[0][0]).toMatchObject({ type: 'input', bubbles: true })

    Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true })
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
  })
})
