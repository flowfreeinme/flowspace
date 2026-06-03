import { useEffect, useState } from 'react'
import { useDatabase } from '@/stores/database'
import { useAuth } from '@/stores/auth'
import { useWorkspace } from '@/stores/workspace'
import type { Block } from '@/types'
import TableView from './views/TableView'
import DatabaseToolbar from './DatabaseToolbar'
import RowModal from './RowModal'

interface Props { block: Block; pageId: string }

export default function DatabaseBlock({ block }: Props) {
  const dbId = block.content
  const { databases, loading, loadDatabase, createDatabase } = useDatabase()
  const { user } = useAuth()
  const { openTab } = useWorkspace()
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  useEffect(() => {
    if (!dbId || !user) return
    loadDatabase(dbId).then(() => {
      const db = useDatabase.getState().databases[dbId]
      if (!db) {
        createDatabase(user.id, dbId, 'Embedded Database').then(d => setActiveViewId(d.views[0].id))
      } else {
        setActiveViewId(db.views[0].id)
      }
    })
  }, [dbId, user])

  const db = databases[dbId]
  if (!db) {
    return (
      <div className="my-2 px-3 py-2 bg-gray-800/50 rounded-lg text-sm text-gray-500 border border-gray-700">
        {loading[dbId] ? 'Loading database…' : 'Database not found'}
      </div>
    )
  }

  const activeView = db.views.find(v => v.id === activeViewId) ?? db.views[0]

  return (
    <div className="my-2 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-800/50">
        <span className="text-xs font-medium text-gray-400">⊞ {db.title}</span>
        <button onClick={() => openTab(dbId)} className="text-xs text-gray-500 hover:text-gray-300">Open full page →</button>
      </div>
      <DatabaseToolbar dbId={dbId} activeViewId={activeView?.id ?? ''} onSelectView={setActiveViewId} />
      <div className="max-h-80 overflow-auto">
        <TableView dbId={dbId} onOpenRow={setOpenRowId} />
      </div>
      {openRowId && <RowModal dbId={dbId} rowId={openRowId} onClose={() => setOpenRowId(null)} />}
    </div>
  )
}
