import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { X, GripVertical } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import type { PropertyDef, PropertyType } from '@/lib/databaseTypes'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'

const PROPERTY_TYPES: { type: PropertyType; label: string; icon: string }[] = [
  { type: 'text',         label: 'Text',         icon: 'T'  },
  { type: 'number',       label: 'Number',       icon: '#'  },
  { type: 'select',       label: 'Select',       icon: '◉'  },
  { type: 'multi_select', label: 'Multi-select', icon: '◉◉' },
  { type: 'checkbox',     label: 'Checkbox',     icon: '☑'  },
  { type: 'date',         label: 'Date',         icon: '📅' },
  { type: 'url',          label: 'URL',          icon: '🔗' },
  { type: 'relation',     label: 'Relation',     icon: '↗'  },
]

interface Props { dbId: string; onClose: () => void }

export default function SchemaEditor({ dbId, onClose }: Props) {
  const { databases, updateSchema } = useDatabase()
  const db = databases[dbId]
  const [schema, setSchema] = useState<PropertyDef[]>(db?.schema ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)

  if (!db) return null

  function save(next: PropertyDef[]) {
    setSchema(next)
    updateSchema(dbId, next)
  }

  function addProp(type: PropertyType) {
    const prop: PropertyDef = { id: uuid(), name: PROPERTY_TYPES.find(p => p.type === type)!.label, type }
    save([...schema, prop])
    setEditingId(prop.id)
  }

  function renameProp(id: string, name: string) {
    save(schema.map(p => p.id === id ? { ...p, name } : p))
  }

  function deleteProp(id: string) {
    save(schema.filter(p => p.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-100">Properties</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
        </div>
        <div className="flex flex-col gap-1 mb-3">
          {schema.map(prop => (
            <div key={prop.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 group">
              <GripVertical size={12} className="text-gray-600" />
              <span className="text-xs text-gray-500 w-4">{PROPERTY_TYPES.find(p => p.type === prop.type)?.icon ?? 'T'}</span>
              {editingId === prop.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-gray-600 text-gray-100 text-xs rounded px-1.5 py-0.5 outline-none"
                  value={prop.name}
                  onChange={e => renameProp(prop.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                />
              ) : (
                <button className="flex-1 text-left text-xs text-gray-200" onClick={() => prop.id !== TITLE_PROP_ID && setEditingId(prop.id)}>
                  {prop.name}
                </button>
              )}
              {prop.id !== TITLE_PROP_ID && (
                <button onClick={() => deleteProp(prop.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2">Add property</p>
          <div className="grid grid-cols-2 gap-1">
            {PROPERTY_TYPES.filter(p => p.type !== 'text').map(p => (
              <button key={p.type} onClick={() => addProp(p.type)} className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700">
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
