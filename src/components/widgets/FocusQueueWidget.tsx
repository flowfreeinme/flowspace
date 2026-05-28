import { Target } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import type { FocusQueueConfig } from '@/types/widgetSettings'

export default function FocusQueueWidget({ config }: { config: FocusQueueConfig }) {
  const { pages, openTab } = useWorkspace()

  const visiblePages = Object.values(pages).filter(p => !p.folder && !p.archived)
  const filteredPages = visiblePages
    .filter(p => {
      if (config.filter === 'pages') return !p.boardMode
      if (config.filter === 'boards') return p.boardMode
      return true
    })
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt))
    .slice(0, config.itemCount)

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        <Target size={14} className="text-accent" />
        {config.title}
      </div>
      <div className="space-y-2 overflow-hidden">
        {filteredPages.length === 0 ? (
          <p className="text-sm leading-relaxed text-gray-500">Open or edit a board to seed your focus queue.</p>
        ) : filteredPages.map((p, index) => (
          <button
            key={p.id}
            onClick={() => openTab(p.id)}
            className="flex w-full items-center gap-2 rounded-xl border border-surface-3 bg-surface-2 px-3 py-2 text-left transition-colors hover:border-accent/40"
          >
            <span className="text-xs text-gray-600">{index + 1}</span>
            <span className="truncate text-sm text-gray-200">{p.icon} {p.title || 'Untitled'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
