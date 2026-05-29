import { useState } from 'react'
import { X } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import type { PropertyValue, PropertyDef } from '@/lib/databaseTypes'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from './PropertyCell'
import PropertyEditor from './PropertyEditor'

interface Props { dbId: string; rowId: string; onClose: () => void }

export default function RowModal({ dbId, rowId, onClose }: Props) {
  const { databases, rows, updateRow, updateSchema } = useDatabase()
  const db = databases[dbId]
  const row = (rows[dbId] ?? []).find(r => r.id === rowId)
  const [editingPropId, setEditingPropId] = useState<string | null>(null)

  if (!db || !row) return null

  function handleChange(propId: string, value: PropertyValue) {
    updateRow(dbId, rowId, { [propId]: value })
  }

  function handleSchemaChange(def: PropertyDef) {
    const next = db!.schema.map(p => p.id === def.id ? def : p)
    updateSchema(dbId, next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[560px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <input
            className="text-xl font-semibold text-gray-100 bg-transparent outline-none flex-1"
            value={String(row.properties[TITLE_PROP_ID] ?? '')}
            onChange={e => handleChange(TITLE_PROP_ID, e.target.value)}
            placeholder="Untitled"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 ml-3 mt-0.5"><X size={16} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {db.schema.filter(p => p.id !== TITLE_PROP_ID).map(prop => (
            <div key={prop.id} className="flex items-start gap-4">
              <span className="text-xs text-gray-500 w-28 pt-1 shrink-0">{prop.name}</span>
              <div className="relative flex-1">
                <div className="cursor-pointer rounded p-1 hover:bg-gray-800 min-h-[28px]"
                  onClick={() => setEditingPropId(editingPropId === prop.id ? null : prop.id)}>
                  <PropertyCell def={prop} value={row.properties[prop.id] ?? null} />
                </div>
                {editingPropId === prop.id && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <PropertyEditor
                      def={prop}
                      value={row.properties[prop.id] ?? null}
                      onChange={v => handleChange(prop.id, v)}
                      onClose={() => setEditingPropId(null)}
                      onSchemaChange={handleSchemaChange}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
