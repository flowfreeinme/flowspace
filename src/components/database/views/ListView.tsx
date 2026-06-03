import { Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'

interface Props { dbId: string; onOpenRow: (rowId: string) => void }

export default function ListView({ dbId, onOpenRow }: Props) {
  const { databases, rows, addRow } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  if (!db) return null

  const previewProps = db.schema.filter(p => p.id !== TITLE_PROP_ID).slice(0, 4)

  return (
    <div className="flex-1 overflow-y-auto">
      {dbRows.map(row => (
        <div key={row.id} onClick={() => onOpenRow(row.id)}
          className="flex items-center gap-4 px-4 py-2 border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer">
          <span className="text-sm text-gray-100 font-medium w-48 truncate shrink-0">
            {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            {previewProps.map(prop => (
              <PropertyCell key={prop.id} def={prop} value={row.properties[prop.id] ?? null} compact />
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => addRow(dbId)}
        className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 w-full">
        <Plus size={12} /> New row
      </button>
    </div>
  )
}
