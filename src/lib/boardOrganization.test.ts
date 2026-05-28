import { describe, expect, it } from 'vitest'
import type { Page } from '@/types'
import {
  canDropPageIntoFolder,
  getArchivedBoardIds,
  getFavoriteBoardIds,
  getRecentBoardIds,
  getRootOrganizationIds,
  pageMatchesBoardQuery,
  sortOrganizationIds,
} from './boardOrganization'

function page(id: string, overrides: Partial<Page> = {}): Page {
  return {
    id,
    title: id,
    icon: '🗃️',
    blocks: [],
    children: [],
    parentId: null,
    createdAt: 1,
    updatedAt: 1,
    boardMode: true,
    ...overrides,
  }
}

describe('board organization helpers', () => {
  const pages: Record<string, Page> = {
    a: page('a', { title: 'Launch Plan', favorite: true, updatedAt: 20 }),
    b: page('b', { title: 'Archive Me', archived: true, updatedAt: 30 }),
    c: page('c', { title: 'Recent Work', lastOpenedAt: 50 }),
    d: page('d', { title: 'Older Work', lastOpenedAt: 10 }),
    f: page('f', { title: 'Clients', folder: true, boardMode: false, children: ['child', 'nested'] }),
    child: page('child', { title: 'Acme Sprint', parentId: 'f' }),
    nested: page('nested', { title: 'Nested Folder', folder: true, boardMode: false, parentId: 'f', children: ['deep'] }),
    deep: page('deep', { title: 'Deep Folder', folder: true, boardMode: false, parentId: 'nested' }),
    p: page('p', { title: 'Notes Page', boardMode: false, icon: '📄' }),
  }

  it('returns favorite boards without archived boards', () => {
    expect(getFavoriteBoardIds(pages)).toEqual(['a'])
  })

  it('returns recent boards ordered by last opened time', () => {
    expect(getRecentBoardIds(pages, 2)).toEqual(['c', 'd'])
  })

  it('returns archived boards separately', () => {
    expect(getArchivedBoardIds(pages)).toEqual(['b'])
  })

  it('matches folders when a child board matches search', () => {
    expect(pageMatchesBoardQuery('f', pages, 'acme')).toBe(true)
    expect(pageMatchesBoardQuery('f', pages, 'missing')).toBe(false)
  })

  it('keeps normal pages visible in the organization tree', () => {
    expect(getRootOrganizationIds(pages, ['a', 'p', 'f', 'b'])).toEqual(['a', 'p', 'f'])
    expect(pageMatchesBoardQuery('p', pages, 'notes')).toBe(true)
  })

  it('allows boards, pages, and folders to be dropped into valid folders', () => {
    expect(canDropPageIntoFolder('a', 'f', pages)).toBe(true)
    expect(canDropPageIntoFolder('p', 'f', pages)).toBe(true)
    expect(canDropPageIntoFolder('nested', 'deep', pages)).toBe(false)
    expect(canDropPageIntoFolder('deep', 'f', pages)).toBe(true)
    expect(canDropPageIntoFolder('child', 'f', pages)).toBe(false)
    expect(canDropPageIntoFolder('a', 'child', pages)).toBe(false)
    expect(canDropPageIntoFolder('f', 'f', pages)).toBe(false)
    expect(canDropPageIntoFolder('f', 'child', pages)).toBe(false)
  })

  it('orders workspace items with boards or pages first while keeping folders above content', () => {
    const ids = ['p', 'a', 'f', 'child']

    expect(sortOrganizationIds(ids, pages, 'custom')).toEqual(['p', 'a', 'f', 'child'])
    expect(sortOrganizationIds(ids, pages, 'boards-first')).toEqual(['f', 'a', 'child', 'p'])
    expect(sortOrganizationIds(ids, pages, 'pages-first')).toEqual(['f', 'p', 'a', 'child'])
  })
})
