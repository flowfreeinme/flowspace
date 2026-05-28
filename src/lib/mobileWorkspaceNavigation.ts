import type { Page } from '@/types'
import type { WorkspaceSortMode } from './boardOrganization'
import { getRootOrganizationIds, pageMatchesBoardQuery, sortOrganizationIds } from './boardOrganization'

export function getMobileWorkspaceRootIds(
  pages: Record<string, Page>,
  rootPages: string[],
  query: string,
  sortMode: WorkspaceSortMode,
) {
  return getRootOrganizationIds(pages, rootPages, query, sortMode)
}

export function getMobileWorkspaceChildIds(
  pageId: string,
  pages: Record<string, Page>,
  query: string,
  sortMode: WorkspaceSortMode,
) {
  const page = pages[pageId]
  if (!page) return []
  const ids = page.children.filter(childId => {
    const child = pages[childId]
    return child && !child.archived && pageMatchesBoardQuery(childId, pages, query)
  })
  return sortOrganizationIds(ids, pages, sortMode)
}
