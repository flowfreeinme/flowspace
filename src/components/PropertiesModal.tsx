import { X } from 'lucide-react'
import type { Page } from '@/types'

interface PropertiesModalProps {
  page: Page
  onClose: () => void
}

function fmt(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function wordCount(page: Page) {
  return page.blocks
    .map(b => b.content.trim())
    .filter(Boolean)
    .join(' ')
    .split(/\s+/).length
}

export default function PropertiesModal({ page, onClose }: PropertiesModalProps) {
  const rows = [
    { label: 'Title', value: page.title || 'Untitled' },
    { label: 'Icon', value: page.icon },
    { label: 'Page ID', value: <span className="font-mono text-xs text-gray-500">{page.id}</span> },
    { label: 'Blocks', value: page.blocks.length },
    { label: 'Sub-pages', value: page.children.length },
    { label: 'Word count', value: wordCount(page) },
    { label: 'Created', value: fmt(page.createdAt) },
    { label: 'Last edited', value: fmt(page.updatedAt) },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <span className="font-semibold text-white">Page Properties</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-4 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {rows.map(row => (
            <div key={row.label} className="flex items-start justify-between gap-4">
              <span className="text-gray-500 text-sm shrink-0">{row.label}</span>
              <span className="text-gray-200 text-sm text-right">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-surface-3 hover:bg-surface-4 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
