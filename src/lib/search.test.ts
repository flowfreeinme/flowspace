import { describe, it, expect } from 'vitest'
import { searchBlocks } from './search'
import type { Page } from '@/types'

function makePage(overrides: Partial<Page> = {}): Page {
  return {
    id: 'p1',
    title: 'Test Page',
    icon: '📄',
    blocks: [],
    children: [],
    parentId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('searchBlocks', () => {
  it('returns empty array for empty query', () => {
    const pages = { p1: makePage({ blocks: [{ id: 'b1', type: 'text', content: 'hello world' }] }) }
    expect(searchBlocks('', pages)).toEqual([])
  })

  it('returns empty array for whitespace-only query', () => {
    const pages = { p1: makePage({ blocks: [{ id: 'b1', type: 'text', content: 'hello world' }] }) }
    expect(searchBlocks('   ', pages)).toEqual([])
  })

  it('matches block content case-insensitively', () => {
    const pages = {
      p1: makePage({ blocks: [{ id: 'b1', type: 'text', content: 'Hello World' }] }),
    }
    const results = searchBlocks('hello', pages)
    expect(results).toHaveLength(1)
    expect(results[0].blockId).toBe('b1')
    expect(results[0].pageId).toBe('p1')
    expect(results[0].pageTitle).toBe('Test Page')
    expect(results[0].pageIcon).toBe('📄')
  })

  it('skips archived pages', () => {
    const pages = {
      p1: makePage({ archived: true, blocks: [{ id: 'b1', type: 'text', content: 'hello world' }] }),
    }
    expect(searchBlocks('hello', pages)).toHaveLength(0)
  })

  it('skips folder pages', () => {
    const pages = {
      p1: makePage({ folder: true, blocks: [{ id: 'b1', type: 'text', content: 'hello world' }] }),
    }
    expect(searchBlocks('hello', pages)).toHaveLength(0)
  })

  it('skips non-searchable block types', () => {
    const pages = {
      p1: makePage({
        blocks: [
          { id: 'b1', type: 'kanban', content: 'hello world' },
          { id: 'b2', type: 'divider', content: '' },
          { id: 'b3', type: 'image', content: 'hello.png' },
          { id: 'b4', type: 'flowchart', content: 'hello data' },
          { id: 'b5', type: 'timeline', content: 'hello data' },
          { id: 'b6', type: 'boardWidget', content: 'hello data' },
          { id: 'b7', type: 'database', content: 'hello data' },
        ],
      }),
    }
    expect(searchBlocks('hello', pages)).toHaveLength(0)
  })

  it('matches in heading, todo, bullet, code, quote, numbered, textbox, section blocks', () => {
    const blockDefs = [
      { id: 'b1', type: 'heading1' as const, content: 'Meeting Notes' },
      { id: 'b2', type: 'heading2' as const, content: 'meeting prep' },
      { id: 'b3', type: 'heading3' as const, content: 'pre-meeting tasks' },
      { id: 'b4', type: 'todo' as const, content: 'schedule meeting' },
      { id: 'b5', type: 'bullet' as const, content: 'attend the meeting' },
      { id: 'b6', type: 'numbered' as const, content: 'first meeting item' },
      { id: 'b7', type: 'code' as const, content: '// meeting scheduler' },
      { id: 'b8', type: 'quote' as const, content: 'as discussed in the meeting' },
      { id: 'b9', type: 'textbox' as const, content: 'meeting room notes' },
      { id: 'b10', type: 'section' as const, content: 'meeting section' },
    ]
    const pages = Object.fromEntries(
      blockDefs.map((block, i) => [
        `p${i}`,
        makePage({ id: `p${i}`, blocks: [block] }),
      ])
    )
    const results = searchBlocks('meeting', pages)
    expect(results.length).toBeGreaterThanOrEqual(8)
    expect(results.map(r => r.blockType)).toEqual(
      expect.arrayContaining(['heading1', 'heading2', 'heading3', 'todo', 'bullet', 'numbered', 'code', 'quote']),
    )
  })

  it('generates snippet containing the matched term', () => {
    const content = 'a very long piece of text with the keyword buried inside it somewhere near the end'
    const pages = {
      p1: makePage({ blocks: [{ id: 'b1', type: 'text', content }] }),
    }
    const results = searchBlocks('keyword', pages)
    expect(results[0].snippet).toContain('keyword')
  })

  it('adds ellipsis when snippet is truncated from the start', () => {
    const content = 'padding'.repeat(10) + ' keyword ' + 'padding'.repeat(10)
    const pages = {
      p1: makePage({ blocks: [{ id: 'b1', type: 'text', content }] }),
    }
    const results = searchBlocks('keyword', pages)
    expect(results[0].snippet.startsWith('…')).toBe(true)
  })

  it('caps results at 8', () => {
    const pages = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [
        `p${i}`,
        makePage({ id: `p${i}`, blocks: [{ id: `b${i}`, type: 'text' as const, content: `item ${i} contains the keyword` }] }),
      ])
    )
    expect(searchBlocks('keyword', pages)).toHaveLength(8)
  })

  it('returns results from multiple pages even when one page has many matches', () => {
    const manyBlocks = Array.from({ length: 10 }, (_, i) => ({
      id: `b${i}`,
      type: 'text' as const,
      content: `needle block ${i}`,
    }))
    const pages = {
      p1: makePage({ id: 'p1', blocks: manyBlocks }),
      p2: makePage({ id: 'p2', blocks: [{ id: 'b_p2', type: 'text' as const, content: 'needle in page two' }] }),
    }
    const results = searchBlocks('needle', pages)
    expect(results.map(r => r.pageId)).toContain('p2')
  })

  it('matches in textbox and section blocks', () => {
    const pages = {
      p1: makePage({ id: 'p1', blocks: [{ id: 'b1', type: 'textbox' as const, content: 'meeting room notes' }] }),
      p2: makePage({ id: 'p2', blocks: [{ id: 'b2', type: 'section' as const, content: 'meeting section header' }] }),
    }
    const results = searchBlocks('meeting', pages)
    expect(results).toHaveLength(2)
    expect(results.map(r => r.blockId)).toEqual(expect.arrayContaining(['b1', 'b2']))
  })

  it('adds ellipsis when snippet is truncated at the end', () => {
    const content = 'keyword ' + 'padding'.repeat(10)
    const pages = {
      p1: makePage({ blocks: [{ id: 'b1', type: 'text', content }] }),
    }
    const results = searchBlocks('keyword', pages)
    expect(results[0].snippet.endsWith('…')).toBe(true)
  })

  it('finds results across multiple pages', () => {
    const pages = {
      p1: makePage({ id: 'p1', blocks: [{ id: 'b1', type: 'text', content: 'needle in page one' }] }),
      p2: makePage({ id: 'p2', blocks: [{ id: 'b2', type: 'text', content: 'needle in page two' }] }),
    }
    const results = searchBlocks('needle', pages)
    expect(results).toHaveLength(2)
    expect(results.map(r => r.pageId)).toEqual(expect.arrayContaining(['p1', 'p2']))
  })

  it('skips blocks with empty content', () => {
    const pages = {
      p1: makePage({ blocks: [{ id: 'b1', type: 'text', content: '' }] }),
    }
    expect(searchBlocks('anything', pages)).toHaveLength(0)
  })
})
