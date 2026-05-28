import type { WorkspaceSortMode } from './boardOrganization'

export const WORKSPACE_SORT_STORAGE_KEY = 'flowspace_workspace_sort_mode'
export const WORKSPACE_SORT_CHANGED_EVENT = 'flowspace:workspace-sort-changed'

export const WORKSPACE_SORT_OPTIONS: { mode: WorkspaceSortMode; label: string; title: string }[] = [
  { mode: 'custom', label: 'Custom', title: 'Use your manual order' },
  { mode: 'boards-first', label: 'Boards first', title: 'Show boards above pages' },
  { mode: 'pages-first', label: 'Pages first', title: 'Show pages above boards' },
]

export function normalizeWorkspaceSortMode(value: string | null): WorkspaceSortMode {
  return value === 'boards-first' || value === 'pages-first' ? value : 'custom'
}

export function getStoredWorkspaceSortMode(): WorkspaceSortMode {
  if (typeof window === 'undefined') return 'custom'
  return normalizeWorkspaceSortMode(window.localStorage.getItem(WORKSPACE_SORT_STORAGE_KEY))
}

export function setStoredWorkspaceSortMode(mode: WorkspaceSortMode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WORKSPACE_SORT_STORAGE_KEY, mode)
  window.dispatchEvent(new CustomEvent(WORKSPACE_SORT_CHANGED_EVENT, { detail: mode }))
}
