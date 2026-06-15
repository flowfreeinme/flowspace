import { describe, expect, it } from 'vitest'
import { getActiveMobileTab } from './mobileTabs'

describe('getActiveMobileTab', () => {
  it('returns home when on the home screen and no panel is open', () => {
    expect(getActiveMobileTab({ activeTabId: null, panel: 'none' })).toBe('home')
  })

  it('panel takes precedence over the open page/home', () => {
    expect(getActiveMobileTab({ activeTabId: null, panel: 'boards' })).toBe('boards')
    expect(getActiveMobileTab({ activeTabId: 't1', panel: 'search' })).toBe('search')
  })

  it('returns null when a page is open and no panel is active', () => {
    expect(getActiveMobileTab({ activeTabId: 't1', panel: 'none' })).toBeNull()
  })
})
