import { describe, expect, it } from 'vitest'
import { clampBrushSize, getCanvasPoint, getScaledCanvasSize, getDrawingExportSize } from './drawingCanvas'

describe('drawing canvas helpers', () => {
  it('keeps brush size in a usable range', () => {
    expect(clampBrushSize(-10)).toBe(1)
    expect(clampBrushSize(14)).toBe(14)
    expect(clampBrushSize(100)).toBe(36)
  })

  it('maps pointer coordinates into canvas coordinates', () => {
    expect(getCanvasPoint({ clientX: 150, clientY: 90 }, { left: 100, top: 50 })).toEqual({ x: 50, y: 40 })
  })

  it('scales canvas backing pixels for high-density screens', () => {
    expect(getScaledCanvasSize(300, 200, 2)).toEqual({ width: 600, height: 400, scale: 2 })
    expect(getScaledCanvasSize(300, 200, 0)).toEqual({ width: 300, height: 200, scale: 1 })
  })

  it('caps export size while preserving aspect ratio', () => {
    expect(getDrawingExportSize(3000, 1500)).toEqual({ width: 1600, height: 800 })
    expect(getDrawingExportSize(1200, 800)).toEqual({ width: 1200, height: 800 })
  })
})
