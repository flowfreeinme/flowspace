import { useEffect, useRef } from 'react'
import { Pencil, Trash2, Info } from 'lucide-react'

interface ContextMenuOption {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  options: ContextMenuOption[]
  onClose: () => void
}

export default function ContextMenu({ x, y, options, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Keep menu within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 200),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 1000,
  }

  return (
    <div
      ref={ref}
      style={style}
      className="w-48 bg-surface-2 border border-surface-4 rounded-xl shadow-2xl overflow-hidden py-1"
    >
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => { opt.onClick(); onClose() }}
          className={`flex items-center gap-3 w-full px-3 py-2 text-sm text-left transition-colors ${
            opt.danger
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-gray-300 hover:bg-surface-3 hover:text-white'
          }`}
        >
          <span className="text-gray-500">{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export const MENU_ICONS = {
  edit: <Pencil size={14} />,
  delete: <Trash2 size={14} />,
  properties: <Info size={14} />,
}
