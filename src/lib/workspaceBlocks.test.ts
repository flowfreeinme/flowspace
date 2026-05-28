import { describe, expect, it } from 'vitest'
import type { Page } from '@/types'
import { deleteBlockFromPage } from './workspaceBlocks'

function page(overrides: Partial<Page> = {}): Page {
  return {
    id: 'page-1',
    title: 'Page',
    icon: 'doc',
    blocks: [{ id: 'block-1', type: 'text', content: '' }],
    children: [],
    parentId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('deleteBlockFromPage', () => {
  it('allows a board to delete its final textbox', () => {
    const board = page({
      boardMode: true,
      blocks: [{ id: 'card-1', type: 'textbox', content: '{}' }],
    })

    expect(deleteBlockFromPage(board, 'card-1', 10)?.blocks).toEqual([])
  })

  it('keeps a document page from deleting its final block', () => {
    const doc = page()

    expect(deleteBlockFromPage(doc, 'block-1', 10)).toBeNull()
  })
})
