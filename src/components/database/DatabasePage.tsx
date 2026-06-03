import { useEffect, useState } from 'react'
import { useDatabase } from '@/stores/database'
import { useAuth } from '@/stores/auth'
import { useWorkspace } from '@/stores/workspace'
import DatabaseToolbar from './DatabaseToolbar'
import TableView from './views/TableView'
import DatabaseBoardView from './views/DatabaseBoardView'
import GalleryView from './views/GalleryView'
import ListView from './views/ListView'
import DatabaseCalendarView from './views/DatabaseCalendarView'
import RowModal from './RowModal'

interface Props { pageId: string }

export default function DatabasePage({ pageId }: Props) {
  const { loadDatabase, createDatabase, databases, loading } = useDatabase()
  const { user } = useAuth()
  const { pages } = useWorkspace()
  const page = pages[pageId]
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const db = databases[pageId]
    if (db) {
      if (!activeViewId && db.views.length > 0) setActiveViewId(db.views[0].id)
      return
    }
    loadDatabase(pageId).then(() => {
      const loaded = useDatabase.getState().databases[pageId]
      if (!loaded) {
        createDatabase(user.id, pageId, page?.title ?? 'Untitled')
          .then(db => setActiveViewId(db.views[0].id))
      } else if (loaded.views.length > 0) {
        setActiveViewId(loaded.views[0].id)
      }
    })
  }, [pageId, user])

  const db = databases[pageId]
  const isLoading = loading[pageId]

  if (isLoading || !db) {
    return <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Loading database…</div>
  }

  const activeView = db.views.find(v => v.id === activeViewId) ?? db.views[0]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      <div className="px-6 pt-5 pb-2">
        <h1 className="text-xl font-semibold text-gray-100">{page?.title ?? db.title}</h1>
      </div>
      <DatabaseToolbar dbId={pageId} activeViewId={activeView?.id ?? ''} onSelectView={setActiveViewId} />
      {activeView?.type === 'table'    && <TableView dbId={pageId} onOpenRow={setOpenRowId} />}
      {activeView?.type === 'board'    && <DatabaseBoardView dbId={pageId} viewId={activeView.id} onOpenRow={setOpenRowId} />}
      {activeView?.type === 'gallery'  && <GalleryView dbId={pageId} onOpenRow={setOpenRowId} />}
      {activeView?.type === 'list'     && <ListView dbId={pageId} onOpenRow={setOpenRowId} />}
      {activeView?.type === 'calendar' && <DatabaseCalendarView dbId={pageId} viewId={activeView.id} onOpenRow={setOpenRowId} />}
      {openRowId && <RowModal dbId={pageId} rowId={openRowId} onClose={() => setOpenRowId(null)} />}
    </div>
  )
}
