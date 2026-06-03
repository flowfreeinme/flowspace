import { useState, useRef } from 'react'
import { Plus, Settings2 } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import type { PropertyDef, PropertyValue } from '@/lib/databaseTypes'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'
import PropertyEditor from '../PropertyEditor'
import SchemaEditor from '../SchemaEditor'

interface Props { dbId: string; onOpenRow: (rowId: string) => void }

export default function TableView({ dbId, onOpenRow }: Props) {
  const { databases, rows, addRow, updateRow, updateSchema } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  const [editing, setEditing] = useState<{ rowId: string; propId: string } | null>(null)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const cellRef = useRef<DOMRect | null>(null)

  if (!db) return null

  function handleCellClick(e: React.MouseEvent, rowId: string, propId: string) {
    cellRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setEditing({ rowId, propId })
  }

  function handleChange(value: PropertyValue) {
    if (!editing) return
    updateRow(dbId, editing.rowId, { [editing.propId]: value })
  }

  function handleSchemaChange(def: PropertyDef) {
    const next = db!.schema.map(p => p.id === def.id ? def : p)
    updateSchema(dbId, next)
  }

  const editingRow = editing ? dbRows.find(r => r.id === editing.rowId) : null
  const editingDef = editing ? db.schema.find(p => p.id === editing.propId) : null

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            {db.schema.map(prop => (
              <th key={prop.id} className="px-3 py-2 text-left text-xs font-medium text-gray-400 bg-gray-900 border-r border-gray-700 min-w-[140px]">
                {prop.name}
              </th>
            ))}
            <th className="px-2 py-2 bg-gray-900">
              <button onClick={() => setSchemaOpen(true)} className="text-gray-600 hover:text-gray-300"><Settings2 size={13} /></button>
            </th>
          </tr>
        </thead>
        <tbody>
          {dbRows.map(row => (
            <tr key={row.id} className="border-b border-gray-800 hover:bg-gray-800/40 group">
              {db.schema.map((prop, i) => (
                <td
                  key={prop.id}
                  className="px-3 py-2 border-r border-gray-800 relative cursor-pointer"
                  onClick={e => {
                    if (prop.id === TITLE_PROP_ID && i === 0) onOpenRow(row.id)
                    else handleCellClick(e, row.id, prop.id)
                  }}
                >
                  {prop.id === TITLE_PROP_ID ? (
                    <span className="text-gray-100 text-sm font-medium hover:underline cursor-pointer">
                      {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
                    </span>
                  ) : (
                    <PropertyCell def={prop} value={row.properties[prop.id] ?? null} compact />
                  )}
                </td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => addRow(dbId)}
        className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 w-full border-b border-gray-800"
      >
        <Plus size={12} /> New row
      </button>
      {editing && editingDef && editingRow && (
        <div className="fixed z-50" style={{ top: (cellRef.current?.bottom ?? 0) + 4, left: cellRef.current?.left ?? 0 }}>
          <PropertyEditor
            def={editingDef}
            value={editingRow.properties[editing.propId] ?? null}
            onChange={handleChange}
            onClose={() => setEditing(null)}
            onSchemaChange={handleSchemaChange}
          />
        </div>
      )}
      {schemaOpen && <SchemaEditor dbId={dbId} onClose={() => setSchemaOpen(false)} />}
    </div>
  )
}
