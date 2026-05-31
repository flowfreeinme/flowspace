import type { Page } from '@/types'

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','was','are','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','that','this',
  'these','those','it','its','they','them','their','we','our','you','your',
  'some','into','about','more','also','just','then','than','when','what',
  'which','who','how','all','any','each','both','very','here','there',
  'untitled',
])

export function extractKeywords(page: Page): string[] {
  const headingContent = page.blocks
    .filter(b => b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3')
    .map(b => b.content)
    .join(' ')

  const bodyContent = [page.title, ...page.blocks.map(b => b.content)].join(' ')
  const combined = `${headingContent} ${headingContent} ${bodyContent}`

  const freq = new Map<string, number>()
  for (const word of combined.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
    if (word.length > 3 && !STOP_WORDS.has(word)) {
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}

export function findRelatedPages(page: Page, allPages: Page[]): { id: string; title: string }[] {
  if (allPages.length < 2) return []
  const keywords = new Set(extractKeywords(page))
  if (keywords.size === 0) return []

  return allPages
    .filter(p => p.id !== page.id)
    .map(p => ({
      id: p.id,
      title: p.title || 'Untitled',
      score: extractKeywords(p).filter(k => keywords.has(k)).length,
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, title }) => ({ id, title }))
}

const ACTION_PATTERNS: RegExp[] = [
  /^[-*]\s*\[\s*\]\s*(.{5,})/m,
  /\bTODO[:\s]+(.{5,})/i,
  /\bAction[:\s]+(.{5,})/i,
  /\bFollow[\s-]up[:\s]+(.{5,})/i,
  /\bNeed to\s+(send|review|update|fix|check|create|write|schedule|meet|call|email|prepare|confirm|finalize)\s+(.{4,})/i,
]

export function detectCandidateActions(page: Page): string[] {
  const lines = page.blocks.map(b => b.content).join('\n').split('\n')
  const seen = new Set<string>()
  const actions: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    for (const pattern of ACTION_PATTERNS) {
      const match = trimmed.match(pattern)
      if (match) {
        const raw = (match[2] ?? match[1] ?? '').trim().slice(0, 120)
        if (raw.length > 5 && !seen.has(raw)) {
          seen.add(raw)
          actions.push(raw)
        }
        break
      }
    }
  }

  return actions.slice(0, 10)
}
