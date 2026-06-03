import { create } from 'zustand'

export interface RelatedPage {
  id: string
  title: string
}

export interface PageInsights {
  relatedPages: RelatedPage[]
  actionItems: string[]
  analyzedAt: number
  status: 'idle' | 'analyzing' | 'ready' | 'error'
}

export interface WhatNext {
  pageId: string
  title: string
  reason: string
}

interface AiInsightsState {
  byPage: Record<string, PageInsights>
  whatNext: WhatNext | null
  dismissedHints: Set<string>
  analyzeOnSave: (
    pageId: string,
    pageContent: string,
    candidateActions: string[],
    heuristicRelated: RelatedPage[],
    pageSummaries: { id: string; title: string; updatedAt: number }[],
    authToken: string | null
  ) => void
  dismissHint: (pageId: string) => void
}

const timers: Record<string, ReturnType<typeof setTimeout>> = {}

export const useAiInsightsStore = create<AiInsightsState>((set) => ({
  byPage: {},
  whatNext: null,
  dismissedHints: new Set(),

  analyzeOnSave(pageId, pageContent, candidateActions, heuristicRelated, pageSummaries, authToken) {
    set(s => ({
      byPage: {
        ...s.byPage,
        [pageId]: {
          relatedPages: heuristicRelated,
          actionItems: candidateActions,
          analyzedAt: s.byPage[pageId]?.analyzedAt ?? 0,
          status: 'analyzing',
        },
      },
    }))

    if (timers[pageId]) clearTimeout(timers[pageId])
    timers[pageId] = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai-insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ pageId, pageContent, candidateActions, pageSummaries }),
        })
        if (!res.ok) throw new Error('API error')
        const data = await res.json()

        const mergedRelated = [
          ...heuristicRelated,
          ...(data.additionalRelated ?? []).filter(
            (r: RelatedPage) => !heuristicRelated.some(h => h.id === r.id)
          ),
        ].slice(0, 3)

        set(s => {
          const dismissed = new Set(s.dismissedHints)
          dismissed.delete(pageId)

          const whatNext: WhatNext | null = data.whatNext?.pageId
            ? {
                pageId: data.whatNext.pageId,
                title: pageSummaries.find(p => p.id === data.whatNext.pageId)?.title ?? 'Untitled',
                reason: data.whatNext.reason ?? '',
              }
            : s.whatNext

          return {
            byPage: {
              ...s.byPage,
              [pageId]: {
                relatedPages: mergedRelated,
                actionItems: data.confirmedActions?.length ? data.confirmedActions : candidateActions,
                analyzedAt: Date.now(),
                status: 'ready',
              },
            },
            whatNext,
            dismissedHints: dismissed,
          }
        })
      } catch {
        set(s => ({
          byPage: {
            ...s.byPage,
            [pageId]: { ...s.byPage[pageId], status: 'error' },
          },
        }))
      }
    }, 2000)
  },

  dismissHint(pageId) {
    set(s => {
      const dismissed = new Set(s.dismissedHints)
      dismissed.add(pageId)
      return { dismissedHints: dismissed }
    })
  },
}))
