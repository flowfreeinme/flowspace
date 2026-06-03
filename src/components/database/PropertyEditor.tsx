import { useState, useRef, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import type { PropertyDef, PropertyValue, SelectOption } from '@/lib/databaseTypes'
import { getSelectColor } from '@/lib/databaseTypes'

interface Props {
  def: PropertyDef
  value: PropertyValue
  onChange: (value: PropertyValue) => void
  onClose: () => void
  onSchemaChange?: (def: PropertyDef) => void
}

export default function PropertyEditor({ def, value, onChange, onClose, onSchemaChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  return (
    <div ref={ref} className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 min-w-[220px]">
      {def.type === 'text' && (
        <textarea
          autoFocus
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 resize-none outline-none"
          rows={3}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        />
      )}
      {def.type === 'url' && (
        <input
          autoFocus
          type="url"
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 outline-none"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onClose()}
        />
      )}
      {def.type === 'number' && (
        <input
          autoFocus
          type="number"
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 outline-none"
          value={value == null ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && onClose()}
        />
      )}
      {def.type === 'checkbox' && (
        <button onClick={() => { onChange(!value); onClose() }} className="flex items-center gap-2 text-sm text-gray-200">
          <span className={`text-lg ${value ? 'text-green-400' : 'text-gray-500'}`}>{value ? '✓' : '○'}</span>
          {value ? 'Checked' : 'Unchecked'}
        </button>
      )}
      {def.type === 'date' && (
        <input
          autoFocus
          type="date"
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 outline-none"
          value={typeof value === 'object' && value && 'start' in (value as object)
            ? (value as { start: string }).start.split('T')[0]
            : String(value ?? '')}
          onChange={e => onChange({ start: e.target.value })}
        />
      )}
      {def.type === 'relation' && (
        <div className="text-xs text-gray-400">
          {Array.isArray(value) && (value as string[]).length > 0
            ? `${(value as string[]).length} linked rows`
            : 'No linked rows'}
        </div>
      )}
      {(def.type === 'select' || def.type === 'multi_select') && (
        <SelectEditor def={def} value={value} onChange={onChange} onAddOption={(name) => {
          const opt: SelectOption = { id: uuid(), name, color: 'gray' }
          const options = [...(def.config?.options ?? []), opt]
          onSchemaChange?.({ ...def, config: { ...def.config, options } })
          return opt
        }} />
      )}
    </div>
  )
}

function SelectEditor({ def, value, onChange, onAddOption }: {
  def: PropertyDef; value: PropertyValue
  onChange: (v: PropertyValue) => void
  onAddOption: (name: string) => SelectOption
}) {
  const [search, setSearch] = useState('')
  const options = def.config?.options ?? []
  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
  const isMulti = def.type === 'multi_select'
  const selected = isMulti ? (Array.isArray(value) ? value : []) : [value as string].filter(Boolean)

  function toggle(optId: string) {
    if (isMulti) {
      const ids = Array.isArray(value) ? value : []
      onChange(ids.includes(optId) ? ids.filter(id => id !== optId) : [...ids, optId])
    } else {
      onChange(value === optId ? null : optId)
    }
  }

  function handleCreate() {
    if (!search.trim()) return
    const opt = onAddOption(search.trim())
    toggle(opt.id)
    setSearch('')
  }

  return (
    <div>
      <input
        autoFocus
        className="w-full bg-gray-700 text-gray-100 text-xs rounded p-1.5 mb-2 outline-none"
        placeholder="Search or create option…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
      />
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {filtered.map(opt => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`flex items-center gap-2 px-2 py-1 rounded text-left text-xs ${selected.includes(opt.id) ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
          >
            <span className={`px-1 rounded ${getSelectColor(opt.color)}`}>{opt.name}</span>
            {selected.includes(opt.id) && <span className="ml-auto text-green-400">✓</span>}
          </button>
        ))}
        {search && !filtered.find(o => o.name === search) && (
          <button onClick={handleCreate} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:bg-gray-700">
            <span className="text-gray-500">+</span> Create "{search}"
          </button>
        )}
      </div>
    </div>
  )
}
