import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ToolboxItem {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}

interface BoardToolboxProps {
  zoom: number
  toolboxItems: ToolboxItem[]
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
}

export default function BoardToolbox({ zoom, toolboxItems, onZoomIn, onZoomOut, onResetView }: BoardToolboxProps) {
  const isMobile = useIsMobile()
  return (
    <div
      className="fixed right-6 z-40 flex flex-col bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl overflow-hidden"
      // On mobile, sit clear of the bottom tab bar (~48px) instead of overlapping it
      style={{ bottom: isMobile ? 'calc(4rem + env(safe-area-inset-bottom, 0px))' : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      <div className="flex flex-col gap-1 p-1.5">
        {toolboxItems.map(t => (
          <button key={t.label} onClick={t.onClick} title={t.label}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${t.active ? 'bg-accent/20 text-accent' : 'text-gray-500 hover:text-white hover:bg-surface-3'}`}>
            {t.icon}<span className="text-[10px] leading-none">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-surface-3 mx-1.5" />
      <div className="flex items-center gap-0.5 p-1.5">
        <button onClick={onZoomOut} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"><ZoomOut size={13} /></button>
        <button onClick={onResetView} className="px-1.5 py-1 text-[10px] text-gray-400 hover:text-white transition-colors min-w-[2.8rem] text-center">{Math.round(zoom * 100)}%</button>
        <button onClick={onZoomIn} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"><ZoomIn size={13} /></button>
        <button onClick={onResetView} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"><Maximize2 size={13} /></button>
      </div>
    </div>
  )
}
