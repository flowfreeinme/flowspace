import { useState } from 'react'
import { useAiInsightsStore } from '@/stores/aiInsightsStore'

interface Props {
  pageId: string
  onNavigate: (pageId: string) => void
}

export default function PageInsightBar({ pageId, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const insights = useAiInsightsStore(s => s.byPage[pageId])
  const dismissed = useAiInsightsStore(s => s.dismissedHints.has(pageId))
  const dismissHint = useAiInsightsStore(s => s.dismissHint)

  if (!insights || insights.status === 'idle' || insights.status === 'error' || dismissed) return null
  if (insights.status === 'ready' && !insights.actionItems.length && !insights.relatedPages.length) return null

  const parts = [
    insights.actionItems.length ? `${insights.actionItems.length} action item${insights.actionItems.length !== 1 ? 's' : ''}` : '',
    insights.relatedPages.length ? `${insights.relatedPages.length} related page${insights.relatedPages.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ')

  const isAnalyzing = insights.status === 'analyzing'

  return (
    <div className="border-b border-accent/20 bg-accent/5 transition-all">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-sm" aria-hidden>🧠</span>
        <span className="flex-1 text-xs text-surface-11">
          {isAnalyzing ? 'Analysing…' : parts}
        </span>
        {!isAnalyzing && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            {expanded ? 'Close' : 'Review →'}
          </button>
        )}
        <button
          onClick={() => dismissHint(pageId)}
          className="text-xs text-surface-9 hover:text-surface-11 px-1 transition-colors"
          aria-label="Dismiss AI hints"
        >
          ✕
        </button>
      </div>

      {expanded && insights.status === 'ready' && (
        <div className="grid grid-cols-2 gap-4 px-4 pb-3 pt-1">
          {insights.actionItems.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-accent">Action Items</div>
              <ul className="space-y-1">
                {insights.actionItems.map((item, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-surface-11">
                    <span className="shrink-0 text-surface-9">☐</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insights.relatedPages.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-accent">Related Pages</div>
              <ul className="space-y-1">
                {insights.relatedPages.map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => onNavigate(p.id)}
                      className="text-xs text-accent hover:underline text-left"
                    >
                      → {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
