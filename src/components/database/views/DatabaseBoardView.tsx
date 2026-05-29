import { Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'

interface Props { dbId: string; viewId: string; onOpenRow: (rowId: string) => void }

export default function DatabaseBoardView({ dbId, viewId, onOpenRow }: Props) {
  const { databases, rows, addRow, updateRow, updateView } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  const view = db?.views.find(v => v.id === viewId)

  if (!db || !view) return null

  const groupProp = db.schema.find(p => p.id === view.groupByPropId && p.type === 'select')
  const selectProps = db.schema.filter(p => p.type === 'select')

  if (!groupProp && selectProps.length > 0) {
    updateView(dbId, viewId, { groupByPropId: selectProps[0].id })
    return null
  }

  if (!groupProp) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Board view requires a Select property. Add one in Properties (⚙).
      </div>
    )
  }

  const options = groupProp.config?.options ?? []
  const columns = [
    { id: '__none__', name: 'No status', optId: null as string | null },
    ...options.map(o => ({ id: o.id, name: o.name, optId: o.id as string | null })),
  ]

  function rowsForColumn(optId: string | null) {
    return dbRows.filter(r => {
      const val = r.properties[groupProp!.id]
      return optId === null ? (val == null || val === '') : val === optId
    })
  }

  async function addRowToColumn(optId: string | null) {
    const row = await addRow(dbId)
    if (optId) await updateRow(dbId, row.id, { [groupProp!.id]: optId })
  }

  const previewProps = db.schema.filter(p => p.id !== TITLE_PROP_ID && p.id !== groupProp.id).slice(0, 3)

  return (
    <div className="flex-1 overflow-x-auto p-4">
      <div className="flex gap-3">
        {columns.map(col => {
          const colRows = rowsForColumn(col.optId)
          return (
            <div key={col.id} className="flex flex-col w-64 shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {col.name} <span className="text-gray-600 font-normal ml-1">{colRows.length}</span>
                </span>
                <button onClick={() => addRowToColumn(col.optId)} className="text-gray-600 hover:text-gray-300"><Plus size={13} /></button>
              </div>
              <div className="flex flex-col gap-2">
                {colRows.map(row => (
                  <div
                    key={row.id}
                    onClick={() => onOpenRow(row.id)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-gray-500"
                  >
                    <p className="text-sm text-gray-100 font-medium mb-2">{String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}</p>
                    {previewProps.map(prop => (
                      <div key={prop.id} className="mb-1">
                        <PropertyCell def={prop} value={row.properties[prop.id] ?? null} compact />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
