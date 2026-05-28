import { History } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import type { RecentWorkConfig } from '@/types/widgetSettings'

export default function RecentWorkWidget({ config }: { config: RecentWorkConfig }) {
  const { pages, openTab } = useWorkspace()

  const visiblePages = Object.values(pages).filter(p => !p.folder && !p.archived)
  const filteredPages = visiblePages
    .filter(p => {
      if (config.filter === 'pages') return !p.boardMode
      if (config.filter === 'boards') return p.boardMode
      return true
    })
    .sort((a, b) => {
      if (config.sortBy === 'lastModified') return b.updatedAt - a.updatedAt
      return (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt)
    })
    .slice(0, config.itemCount)

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        <History size={14} className="text-accent" />
        {config.title}
      </div>
      <div className="space-y-1.5 overflow-hidden">
        {filteredPages.length === 0 ? (
          <p className="text-sm text-gray-500">Your recent boards and pages will appear here.</p>
        ) : filteredPages.map(p => (
          <button
            key={p.id}
            onClick={() => openTab(p.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
          >
            <span>{p.icon}</span>
            <span className="truncate text-sm text-gray-300">{p.title || 'Untitled'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
