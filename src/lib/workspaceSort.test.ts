import { describe, expect, it } from 'vitest'
import { normalizeWorkspaceSortMode } from './workspaceSort'

describe('workspace sort settings', () => {
  it('accepts supported sort modes and falls back to custom', () => {
    expect(normalizeWorkspaceSortMode('boards-first')).toBe('boards-first')
    expect(normalizeWorkspaceSortMode('pages-first')).toBe('pages-first')
    expect(normalizeWorkspaceSortMode('custom')).toBe('custom')
    expect(normalizeWorkspaceSortMode('bad-value')).toBe('custom')
    expect(normalizeWorkspaceSortMode(null)).toBe('custom')
  })
})
