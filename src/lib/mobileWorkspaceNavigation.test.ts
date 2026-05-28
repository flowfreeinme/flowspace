import { describe, expect, it } from 'vitest'
import type { Page } from '@/types'
import { getMobileWorkspaceChildIds, getMobileWorkspaceRootIds } from './mobileWorkspaceNavigation'

function page(id: string, overrides: Partial<Page> = {}): Page {
  return {
    id,
    title: id,
    icon: '📄',
    blocks: [],
    children: [],
    parentId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('mobile workspace navigation', () => {
  const pages: Record<string, Page> = {
    folder: page('folder', { title: 'Client Folder', icon: '📁', folder: true, children: ['board', 'notes'] }),
    board: page('board', { title: 'Client Board', icon: '🗃️', boardMode: true, parentId: 'folder' }),
    notes: page('notes', { title: 'Client Notes', parentId: 'folder' }),
    rootPage: page('rootPage', { title: 'Root Notes' }),
    archived: page('archived', { title: 'Archived', archived: true }),
  }

  it('shows folders, boards, and pages instead of only top-level boards', () => {
    expect(getMobileWorkspaceRootIds(pages, ['folder', 'rootPage', 'archived'], '', 'custom')).toEqual(['folder', 'rootPage'])
    expect(getMobileWorkspaceChildIds('folder', pages, '', 'custom')).toEqual(['board', 'notes'])
  })

  it('keeps matching folders visible when a nested page matches search', () => {
    expect(getMobileWorkspaceRootIds(pages, ['folder', 'rootPage'], 'notes', 'custom')).toEqual(['folder', 'rootPage'])
    expect(getMobileWorkspaceChildIds('folder', pages, 'board', 'custom')).toEqual(['board'])
  })
})
