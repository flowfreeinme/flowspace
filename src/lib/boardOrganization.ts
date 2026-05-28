import type { Page } from '@/types'

export type WorkspaceSortMode = 'custom' | 'boards-first' | 'pages-first'

function isOrganizable(page: Page | undefined) {
  return !!page
}

function byNewest(a: Page, b: Page) {
  return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
}

export function getFavoriteBoardIds(pages: Record<string, Page>) {
  return Object.values(pages)
    .filter(p => p.boardMode && p.favorite && !p.archived)
    .sort(byNewest)
    .map(p => p.id)
}

export function getRecentBoardIds(pages: Record<string, Page>, limit = 5) {
  return Object.values(pages)
    .filter(p => p.boardMode && !p.archived && !!p.lastOpenedAt)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
    .slice(0, limit)
    .map(p => p.id)
}

export function getArchivedBoardIds(pages: Record<string, Page>) {
  return Object.values(pages)
    .filter(p => isOrganizable(p) && p.archived)
    .sort(byNewest)
    .map(p => p.id)
}

export function pageMatchesBoardQuery(pageId: string, pages: Record<string, Page>, query: string): boolean {
  const page = pages[pageId]
  if (!isOrganizable(page)) return false
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  const ownText = `${page.title} ${page.icon}`.toLowerCase()
  if (ownText.includes(normalized)) return true
  return page.children.some(childId => pageMatchesBoardQuery(childId, pages, normalized))
}

export function canDropPageIntoFolder(
  pageId: string | null,
  folderId: string | null,
  pages: Record<string, Page>,
) {
  if (!pageId || !folderId || pageId === folderId) return false
  const page = pages[pageId]
  const folder = pages[folderId]
  if (!page || !folder?.folder || page.archived || folder.archived || page.parentId === folderId) return false

  const containsPage = (currentId: string): boolean => {
    const current = pages[currentId]
    if (!current) return false
    if (current.children.includes(folderId)) return true
    return current.children.some(containsPage)
  }

  return !containsPage(pageId)
}

function organizationRank(page: Page | undefined, mode: WorkspaceSortMode) {
  if (mode === 'custom') return 0
  if (page?.folder) return 0
  if (mode === 'boards-first') return page?.boardMode ? 1 : 2
  return page?.boardMode ? 2 : 1
}

export function sortOrganizationIds(
  ids: string[],
  pages: Record<string, Page>,
  mode: WorkspaceSortMode,
) {
  if (mode === 'custom') return ids
  return [...ids].sort((a, b) => {
    const rankDelta = organizationRank(pages[a], mode) - organizationRank(pages[b], mode)
    if (rankDelta !== 0) return rankDelta
    return ids.indexOf(a) - ids.indexOf(b)
  })
}

export function getRootOrganizationIds(
  pages: Record<string, Page>,
  rootPages: string[],
  query = '',
  sortMode: WorkspaceSortMode = 'custom',
) {
  const ids = rootPages.filter(id => {
    const page = pages[id]
    return isOrganizable(page) && !page.archived && pageMatchesBoardQuery(id, pages, query)
  })
  return sortOrganizationIds(ids, pages, sortMode)
}
