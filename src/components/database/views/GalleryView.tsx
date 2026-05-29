import { Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'

interface Props { dbId: string; onOpenRow: (rowId: string) => void }

export default function GalleryView({ dbId, onOpenRow }: Props) {
  const { databases, rows, addRow } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  if (!db) return null

  const urlProp = db.schema.find(p => p.type === 'url')
  const previewProps = db.schema.filter(p => p.id !== TITLE_PROP_ID && p.id !== urlProp?.id).slice(0, 3)

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-3 gap-3">
        {dbRows.map(row => {
          const coverUrl = urlProp ? String(row.properties[urlProp.id] ?? '') : ''
          return (
            <div key={row.id} onClick={() => onOpenRow(row.id)}
              className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-gray-500">
              {coverUrl
                ? <img src={coverUrl} alt="" className="w-full h-32 object-cover" />
                : <div className="w-full h-24 bg-gray-700/50 flex items-center justify-center text-gray-600 text-2xl">⊞</div>
              }
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-100 mb-2 truncate">{String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}</p>
                {previewProps.map(prop => (
                  <div key={prop.id} className="mb-1"><PropertyCell def={prop} value={row.properties[prop.id] ?? null} compact /></div>
                ))}
              </div>
            </div>
          )
        })}
        <button onClick={() => addRow(dbId)}
          className="border-2 border-dashed border-gray-700 rounded-xl h-48 flex flex-col items-center justify-center text-gray-600 hover:text-gray-400 hover:border-gray-500 gap-2">
          <Plus size={20} /><span className="text-xs">New</span>
        </button>
      </div>
    </div>
  )
}
