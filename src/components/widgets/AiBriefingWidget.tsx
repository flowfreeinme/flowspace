import { useAiInsightsStore } from '@/stores/aiInsightsStore'
import { useWorkspace } from '@/stores/workspace'

export default function AiBriefingWidget() {
  const whatNext = useAiInsightsStore(s => s.whatNext)
  const byPage = useAiInsightsStore(s => s.byPage)
  const openTab = useWorkspace(s => s.openTab)
  const pages = useWorkspace(s => s.pages)

  const allActions = Object.entries(byPage)
    .filter(([, insights]) => insights.status === 'ready' && insights.actionItems.length > 0)
    .flatMap(([pageId, insights]) =>
      insights.actionItems.slice(0, 2).map(item => ({ item, pageId }))
    )
    .slice(0, 5)

  const isEmpty = !whatNext && allActions.length === 0

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden>🧠</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">AI Briefing</span>
      </div>

      {isEmpty ? (
        <p className="text-xs text-surface-9">
          Open and edit some pages — I'll start surfacing insights as you work.
        </p>
      ) : (
        <>
          {whatNext && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-surface-9">Pick up where you left off</div>
              <div className="text-sm font-semibold text-surface-12">{whatNext.title}</div>
              <div className="text-xs text-surface-10">{whatNext.reason}</div>
              <button
                onClick={() => openTab(whatNext.pageId)}
                className="mt-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Open page →
              </button>
            </div>
          )}

          {allActions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-surface-9">Pending actions</div>
              <ul className="space-y-1">
                {allActions.map(({ item, pageId }, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-surface-11">
                    <span className="mt-px shrink-0 text-surface-9">☐</span>
                    <span className="flex-1">{item}</span>
                    {pages[pageId]?.title && (
                      <button
                        onClick={() => openTab(pageId)}
                        className="shrink-0 text-surface-8 hover:text-accent transition-colors"
                        title={pages[pageId].title}
                      >
                        · {pages[pageId].title.slice(0, 14)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
