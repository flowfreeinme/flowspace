import type { Page } from '@/types'

export function deleteBlockFromPage(page: Page, blockId: string, updatedAt = Date.now()): Page | null {
  if (!page.blocks.some(b => b.id === blockId)) return null
  if (!page.boardMode && page.blocks.length <= 1) return null

  return {
    ...page,
    blocks: page.blocks.filter(b => b.id !== blockId),
    updatedAt,
  }
}
