import { describe, expect, it } from 'vitest'
import type { WorkspaceData } from '@/types'
import { getWorkspaceMetrics } from './workspaceMetrics'

describe('workspace metrics', () => {
  it('summarizes workspace size and board usage', () => {
    const workspace: WorkspaceData = {
      pages: {
        board: {
          id: 'board',
          title: 'Board',
          icon: '🗃️',
          blocks: [{ id: 'block', type: 'textbox', content: '{}' }],
          children: [],
          parentId: null,
          createdAt: 1,
          updatedAt: 1,
          boardMode: true,
        },
        folder: {
          id: 'folder',
          title: 'Folder',
          icon: '📁',
          blocks: [],
          children: [],
          parentId: null,
          createdAt: 1,
          updatedAt: 1,
          folder: true,
        },
      },
      rootPages: ['board', 'folder'],
      tabs: [],
      activeTabId: null,
    }

    expect(getWorkspaceMetrics(workspace)).toMatchObject({
      pageCount: 2,
      boardCount: 1,
      folderCount: 1,
      blockCount: 1,
      archivedCount: 0,
    })
    expect(getWorkspaceMetrics(workspace).serializedBytes).toBeGreaterThan(0)
  })
})
