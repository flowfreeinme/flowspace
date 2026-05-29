import { useState } from 'react'
import { Plus, Table2, Kanban, LayoutGrid, CalendarDays, List } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useDatabase } from '@/stores/database'
import type { ViewType, ViewDef } from '@/lib/databaseTypes'

const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table:    <Table2 size={13} />,
  board:    <Kanban size={13} />,
  gallery:  <LayoutGrid size={13} />,
  calendar: <CalendarDays size={13} />,
  list:     <List size={13} />,
}

const VIEW_LABELS: Record<ViewType, string> = {
  table: 'Table', board: 'Board', gallery: 'Gallery', calendar: 'Calendar', list: 'List',
}

interface Props {
  dbId: string
  activeViewId: string
  onSelectView: (viewId: string) => void
}

export default function DatabaseToolbar({ dbId, activeViewId, onSelectView }: Props) {
  const { databases, addView } = useDatabase()
  const db = databases[dbId]
  const [adding, setAdding] = useState(false)

  async function handleAddView(type: ViewType) {
    const view: ViewDef = { id: uuid(), name: VIEW_LABELS[type], type }
    await addView(dbId, view)
    onSelectView(view.id)
    setAdding(false)
  }

  if (!db) return null
  return (
    <div className="flex items-center gap-1 border-b border-gray-700 px-4 py-1 bg-gray-900">
      {db.views.map(view => (
        <button
          key={view.id}
          onClick={() => onSelectView(view.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors
            ${view.id === activeViewId
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
        >
          {VIEW_ICONS[view.type]}
          {view.name}
        </button>
      ))}
      {adding ? (
        <div className="flex items-center gap-1 ml-1">
          {(['table', 'board', 'gallery', 'calendar', 'list'] as ViewType[]).map(type => (
            <button
              key={type}
              onClick={() => handleAddView(type)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700"
            >
              {VIEW_ICONS[type]} {VIEW_LABELS[type]}
            </button>
          ))}
          <button onClick={() => setAdding(false)} className="ml-1 text-gray-500 hover:text-gray-300 text-xs">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 ml-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800"
        >
          <Plus size={11} /> Add view
        </button>
      )}
    </div>
  )
}
