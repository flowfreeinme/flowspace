import { describe, expect, it } from 'vitest'
import { getBoardImageObjectFit, isEditableDrawing, parseBoardImage } from './boardImages'

describe('board image helpers', () => {
  it('preserves drawing metadata when parsing board images', () => {
    expect(parseBoardImage(JSON.stringify({
      url: 'https://cdn.example.com/drawing.png',
      x: 12,
      y: 24,
      width: 320,
      height: 220,
      kind: 'drawing',
    }))).toEqual({
      url: 'https://cdn.example.com/drawing.png',
      x: 12,
      y: 24,
      width: 320,
      height: 220,
      kind: 'drawing',
    })
  })

  it('treats new and existing drawing uploads as editable drawings', () => {
    expect(isEditableDrawing({ url: 'https://cdn.example.com/photo.png', kind: 'drawing' })).toBe(true)
    expect(isEditableDrawing({ url: 'https://cdn.example.com/pages/123/abc-drawing.png' })).toBe(true)
    expect(isEditableDrawing({ url: 'https://cdn.example.com/pages/123/drawing.webp?cache=1' })).toBe(true)
  })

  it('does not offer drawing edit controls for regular uploaded images', () => {
    expect(isEditableDrawing({ url: 'https://cdn.example.com/pages/123/profile-photo.png' })).toBe(false)
    expect(isEditableDrawing({ url: '' })).toBe(false)
  })

  it('fills the image box for drawings while containing regular images', () => {
    expect(getBoardImageObjectFit({ url: 'https://cdn.example.com/pages/123/abc-drawing.png' })).toBe('fill')
    expect(getBoardImageObjectFit({ url: 'https://cdn.example.com/pages/123/photo.png' })).toBe('contain')
  })
})
