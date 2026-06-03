import { describe, it, expect } from 'vitest'
import { midpoint, nextPosition, reorderPositions } from './database'

describe('row position helpers', () => {
  it('midpoint returns value between two numbers', () => {
    expect(midpoint(1, 3)).toBe(2)
    expect(midpoint(0, 1)).toBe(0.5)
  })

  it('nextPosition returns last + 1 for non-empty list', () => {
    expect(nextPosition([{ position: 1 }, { position: 3 }] as any)).toBe(4)
  })

  it('nextPosition returns 1 for empty list', () => {
    expect(nextPosition([])).toBe(1)
  })

  it('reorderPositions moves row between two others', () => {
    const rows = [
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
    ] as any[]
    const result = reorderPositions(rows, 'c', 1, 2)
    expect(result).toBe(1.5)
  })
})
