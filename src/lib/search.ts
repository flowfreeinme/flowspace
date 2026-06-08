import type { Page, BlockType } from '@/types'

export interface BlockSearchResult {
  pageId: string
  pageTitle: string
  pageIcon: string
  blockId: string
  blockType: BlockType
  snippet: string
}

const SEARCHABLE_TYPES = new Set<BlockType>([
  'text', 'heading1', 'heading2', 'heading3',
  'todo', 'bullet', 'numbered', 'code',
  'quote', 'textbox', 'section',
])

const MAX_RESULTS = 8
const SNIPPET_RADIUS = 25

function makeSnippet(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return content.slice(0, SNIPPET_RADIUS * 2)
  const start = Math.max(0, idx - SNIPPET_RADIUS)
  const end = Math.min(content.length, idx + query.length + SNIPPET_RADIUS)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return prefix + content.slice(start, end) + suffix
}

export function searchBlocks(
  query: string,
  pages: Record<string, Page>,
): BlockSearchResult[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const results: BlockSearchResult[] = []

  for (const page of Object.values(pages)) {
    if (page.archived || page.folder) continue

    for (const block of page.blocks) {
      if (!SEARCHABLE_TYPES.has(block.type)) continue
      if (!block.content) continue
      if (!block.content.toLowerCase().includes(q)) continue

      results.push({
        pageId: page.id,
        pageTitle: page.title || 'Untitled',
        pageIcon: page.icon,
        blockId: block.id,
        blockType: block.type,
        snippet: makeSnippet(block.content, q),
      })
      break  // one match per page, move to next page
    }

    if (results.length >= MAX_RESULTS) break  // cap on pages, not blocks
  }

  return results
}
