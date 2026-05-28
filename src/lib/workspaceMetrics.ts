import type { WorkspaceData } from '@/types'

export const WORKSPACE_SPLIT_RECOMMENDED_BYTES = 750 * 1024
export const WORKSPACE_SPLIT_RECOMMENDED_BOARDS = 100

export function getWorkspaceMetrics(workspace: WorkspaceData) {
  const pages = Object.values(workspace.pages)
  const boardPages = pages.filter(p => p.boardMode)
  const serializedBytes = new Blob([JSON.stringify(workspace)]).size

  return {
    serializedBytes,
    pageCount: pages.length,
    boardCount: boardPages.length,
    folderCount: pages.filter(p => p.folder).length,
    blockCount: pages.reduce((sum, page) => sum + page.blocks.length, 0),
    archivedCount: pages.filter(p => p.archived).length,
    largestBoards: boardPages
      .map(page => ({ id: page.id, title: page.title, blockCount: page.blocks.length }))
      .sort((a, b) => b.blockCount - a.blockCount)
      .slice(0, 5),
    splitRecommended:
      serializedBytes >= WORKSPACE_SPLIT_RECOMMENDED_BYTES ||
      boardPages.length >= WORKSPACE_SPLIT_RECOMMENDED_BOARDS,
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
