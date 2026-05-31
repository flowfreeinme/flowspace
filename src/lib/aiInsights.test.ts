import { describe, it, expect } from 'vitest'
import { extractKeywords, findRelatedPages, detectCandidateActions } from './aiInsights'
import type { Page } from '@/types'

function makePage(overrides: Partial<Page> & { id: string }): Page {
  return {
    title: 'Untitled',
    blocks: [],
    children: [],
    rootPages: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
    archived: false,
    favorite: false,
    icon: '',
    database: false,
    boardMode: false,
    lastOpenedAt: Date.now(),
    ...overrides,
  } as unknown as Page
}

describe('extractKeywords', () => {
  it('returns top keywords from headings and content', () => {
    const page = makePage({
      id: 'p1',
      title: 'Product Launch Strategy',
      blocks: [
        { id: 'b1', type: 'heading1', content: 'Launch Timeline' },
        { id: 'b2', type: 'text', content: 'We need to finalize the launch timeline before the product ships.' },
      ],
    })
    const keywords = extractKeywords(page)
    expect(keywords).toContain('launch')
    expect(keywords).toContain('timeline')
    expect(keywords.length).toBeLessThanOrEqual(10)
  })

  it('filters stop words', () => {
    const page = makePage({
      id: 'p2',
      blocks: [{ id: 'b1', type: 'text', content: 'the and or but with from' }],
    })
    const keywords = extractKeywords(page)
    expect(keywords).not.toContain('the')
    expect(keywords).not.toContain('and')
  })

  it('returns empty array for empty page', () => {
    const page = makePage({ id: 'p3', blocks: [] })
    expect(extractKeywords(page)).toEqual([])
  })
})

describe('findRelatedPages', () => {
  it('finds pages with overlapping keywords', () => {
    const source = makePage({
      id: 'src',
      title: 'Product Launch Strategy',
      blocks: [{ id: 'b1', type: 'text', content: 'launch timeline product roadmap marketing' }],
    })
    const related = makePage({
      id: 'rel',
      title: 'Marketing Launch Plan',
      blocks: [{ id: 'b2', type: 'text', content: 'launch marketing plan timeline' }],
    })
    const unrelated = makePage({
      id: 'unrel',
      title: 'Vacation Photos',
      blocks: [{ id: 'b3', type: 'text', content: 'beach holiday summer relax' }],
    })
    const results = findRelatedPages(source, [source, related, unrelated])
    expect(results.map(r => r.id)).toContain('rel')
    expect(results.map(r => r.id)).not.toContain('unrel')
    expect(results.map(r => r.id)).not.toContain('src')
  })

  it('returns empty when only one page exists', () => {
    const page = makePage({ id: 'p1', blocks: [{ id: 'b1', type: 'text', content: 'hello world' }] })
    expect(findRelatedPages(page, [page])).toEqual([])
  })

  it('returns max 3 results', () => {
    const source = makePage({ id: 'src', blocks: [{ id: 'b', type: 'text', content: 'launch product marketing strategy roadmap timeline' }] })
    const pages = [source, ...Array.from({ length: 6 }, (_, i) =>
      makePage({ id: `p${i}`, blocks: [{ id: 'b', type: 'text', content: 'launch product marketing strategy roadmap timeline' }] })
    )]
    expect(findRelatedPages(source, pages).length).toBeLessThanOrEqual(3)
  })
})

describe('detectCandidateActions', () => {
  it('detects unchecked checkboxes', () => {
    const page = makePage({
      id: 'p1',
      blocks: [{ id: 'b1', type: 'text', content: '- [ ] Send the report to stakeholders' }],
    })
    const actions = detectCandidateActions(page)
    expect(actions.some(a => a.includes('Send the report'))).toBe(true)
  })

  it('detects TODO: prefix', () => {
    const page = makePage({
      id: 'p2',
      blocks: [{ id: 'b1', type: 'text', content: 'TODO: Review the Q3 budget numbers' }],
    })
    const actions = detectCandidateActions(page)
    expect(actions.some(a => a.includes('Review the Q3 budget'))).toBe(true)
  })

  it('detects Action: prefix', () => {
    const page = makePage({
      id: 'p3',
      blocks: [{ id: 'b1', type: 'text', content: 'Action: Schedule follow-up call' }],
    })
    const actions = detectCandidateActions(page)
    expect(actions.some(a => a.includes('Schedule follow-up call'))).toBe(true)
  })

  it('deduplicates actions', () => {
    const page = makePage({
      id: 'p5',
      blocks: [
        { id: 'b1', type: 'text', content: '- [ ] Send weekly report' },
        { id: 'b2', type: 'text', content: '- [ ] Send weekly report' },
      ],
    })
    const actions = detectCandidateActions(page)
    const count = actions.filter(a => a.includes('Send weekly report')).length
    expect(count).toBe(1)
  })

  it('returns empty for page with no actions', () => {
    const page = makePage({
      id: 'p6',
      blocks: [{ id: 'b1', type: 'text', content: 'Today was a great day. The sun was shining.' }],
    })
    expect(detectCandidateActions(page)).toEqual([])
  })
})
