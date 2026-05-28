import type { Tab } from '@/types'

interface ResolveActiveTabIdOptions {
  validTabs: Tab[]
  savedActiveTabId: string | null | undefined
  workspaceActiveTabId: string | null | undefined
  hasSavedTabState: boolean
}

export function resolveActiveTabId({
  validTabs,
  savedActiveTabId,
  workspaceActiveTabId,
  hasSavedTabState,
}: ResolveActiveTabIdOptions) {
  const preferredActiveTabId = hasSavedTabState ? savedActiveTabId : workspaceActiveTabId
  if (preferredActiveTabId === null) return null
  if (preferredActiveTabId && validTabs.some(t => t.id === preferredActiveTabId)) return preferredActiveTabId
  return validTabs[validTabs.length - 1]?.id ?? null
}

export function shouldRestoreMostRecentTab({
  activeTabId,
  rootPageCount,
  hasSavedTabState,
}: {
  activeTabId: string | null
  rootPageCount: number
  hasSavedTabState: boolean
}) {
  return activeTabId === null && rootPageCount > 0 && !hasSavedTabState
}

export function resolveSyncedActiveTabId({
  validTabs,
  currentActiveTabId,
}: {
  validTabs: Tab[]
  currentActiveTabId: string | null
}) {
  if (currentActiveTabId === null) return null
  if (validTabs.some(t => t.id === currentActiveTabId)) return currentActiveTabId
  return validTabs[validTabs.length - 1]?.id ?? null
}
