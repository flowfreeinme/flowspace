import { describe, expect, it } from 'vitest'
import type { Tab } from '@/types'
import { resolveActiveTabId, resolveSyncedActiveTabId, shouldRestoreMostRecentTab } from './workspaceTabs'

describe('workspace tab resolution', () => {
  const tabs: Tab[] = [
    { id: 'tab-1', pageId: 'page-1' },
    { id: 'tab-2', pageId: 'page-2' },
  ]

  it('keeps home active when saved active tab is explicitly null', () => {
    expect(resolveActiveTabId({
      validTabs: tabs,
      savedActiveTabId: null,
      workspaceActiveTabId: 'tab-1',
      hasSavedTabState: true,
    })).toBeNull()
  })

  it('restores a valid saved active tab', () => {
    expect(resolveActiveTabId({
      validTabs: tabs,
      savedActiveTabId: 'tab-2',
      workspaceActiveTabId: 'tab-1',
      hasSavedTabState: true,
    })).toBe('tab-2')
  })

  it('only restores a most recent page when no saved tab state exists', () => {
    expect(shouldRestoreMostRecentTab({ activeTabId: null, rootPageCount: 2, hasSavedTabState: true })).toBe(false)
    expect(shouldRestoreMostRecentTab({ activeTabId: null, rootPageCount: 2, hasSavedTabState: false })).toBe(true)
  })

  it('keeps home active during remote sync even when tabs are open', () => {
    expect(resolveSyncedActiveTabId({
      validTabs: tabs,
      currentActiveTabId: null,
    })).toBeNull()
  })
})
