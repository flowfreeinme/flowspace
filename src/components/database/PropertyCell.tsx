import type { PropertyDef, PropertyValue } from '@/lib/databaseTypes'
import { getSelectColor } from '@/lib/databaseTypes'

interface Props {
  def: PropertyDef
  value: PropertyValue
  compact?: boolean
}

export default function PropertyCell({ def, value, compact }: Props) {
  if (value == null || value === '') {
    return <span className="text-gray-600 text-xs">—</span>
  }

  switch (def.type) {
    case 'text':
      return <span className={`text-gray-200 ${compact ? 'text-xs' : 'text-sm'} truncate`}>{String(value)}</span>

    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-blue-400 hover:underline text-xs truncate max-w-[160px]"
        >
          {String(value)}
        </a>
      )

    case 'number': {
      const n = Number(value)
      const fmt = def.config?.numberFormat ?? 'plain'
      const display = fmt === 'dollar' ? `$${n.toLocaleString()}` : fmt === 'percent' ? `${n}%` : String(n)
      return <span className="text-gray-200 text-xs tabular-nums">{display}</span>
    }

    case 'checkbox':
      return <span className={`text-sm ${value ? 'text-green-400' : 'text-gray-600'}`}>{value ? '✓' : '○'}</span>

    case 'date': {
      const d = typeof value === 'object' && value !== null && 'start' in (value as object)
        ? (value as { start: string; end?: string })
        : { start: String(value) }
      return (
        <span className="text-gray-300 text-xs">
          {new Date(d.start).toLocaleDateString()}
          {d.end ? ` → ${new Date(d.end).toLocaleDateString()}` : ''}
        </span>
      )
    }

    case 'select': {
      const opt = def.config?.options?.find(o => o.id === value)
      if (!opt) return null
      return <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getSelectColor(opt.color)}`}>{opt.name}</span>
    }

    case 'multi_select': {
      const ids = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map(id => {
            const opt = def.config?.options?.find(o => o.id === id)
            if (!opt) return null
            return <span key={id} className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getSelectColor(opt.color)}`}>{opt.name}</span>
          })}
        </div>
      )
    }

    case 'relation': {
      const ids = Array.isArray(value) ? value : []
      return <span className="text-gray-400 text-xs">{ids.length} linked</span>
    }

    default:
      return <span className="text-gray-400 text-xs">{String(value)}</span>
  }
}
