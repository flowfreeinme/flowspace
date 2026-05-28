import { X } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import WidgetSettingsPopover from './settings/WidgetSettingsPopover'
import type { HomeWidget } from '@/types'
import type { HomeWidgetResizeCorner } from '@/lib/homeCenter'

interface WidgetShellProps {
  widget: HomeWidget
  editingHome: boolean
  isResizing: boolean
  openSettings: boolean
  onOpenSettings: () => void
  onCloseSettings: () => void
  onStartResize: (e: React.PointerEvent<HTMLButtonElement>, corner: HomeWidgetResizeCorner) => void
  onRemove: () => void
  settingsForm: React.ReactNode
  children: React.ReactNode
}

const RESIZE_HANDLES: Array<{
  corner: HomeWidgetResizeCorner
  className: string
  cursorClass: string
  label: string
}> = [
  { corner: 'nw', className: 'left-1 top-1', cursorClass: 'cursor-nwse-resize', label: 'Resize from top left' },
  { corner: 'ne', className: 'right-1 top-1', cursorClass: 'cursor-nesw-resize', label: 'Resize from top right' },
  { corner: 'sw', className: 'bottom-1 left-1', cursorClass: 'cursor-nesw-resize', label: 'Resize from bottom left' },
  { corner: 'se', className: 'bottom-1 right-1', cursorClass: 'cursor-nwse-resize', label: 'Resize from bottom right' },
]

function widgetGridStyle(widget: HomeWidget, isMobile: boolean): React.CSSProperties {
  if (isMobile) {
    return {
      gridColumn: '1 / -1',
      gridRow: `span ${Math.min(12, Math.max(3, widget.h))}`,
    }
  }
  return {
    gridColumn: `${widget.x + 1} / span ${widget.w}`,
    gridRow: `${widget.y + 1} / span ${widget.h}`,
  }
}

export default function WidgetShell({
  widget,
  editingHome,
  isResizing,
  openSettings,
  onOpenSettings,
  onCloseSettings,
  onStartResize,
  onRemove,
  settingsForm,
  children,
}: WidgetShellProps) {
  const isMobile = useIsMobile()

  function handleClickCapture(event: React.MouseEvent<HTMLElement>) {
    if (!editingHome) return
    if (event.target instanceof HTMLElement && event.target.closest('[data-home-widget-edit-control="true"]')) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <section
      onClickCapture={handleClickCapture}
      className={`relative min-h-0 overflow-hidden rounded-2xl border bg-surface-1 shadow-sm transition-colors ${
        editingHome ? 'select-none border-accent/45 ring-1 ring-accent/20' : 'border-surface-3'
      } ${isResizing ? 'z-20 border-accent ring-2 ring-accent/30' : ''}`}
      style={widgetGridStyle(widget, isMobile)}
    >
      <div
        className="absolute right-2 top-2 z-50 flex items-center gap-1 group/widget"
        data-home-widget-edit-control="true"
      >
        <WidgetSettingsPopover
          open={openSettings}
          onOpen={onOpenSettings}
          onClose={onCloseSettings}
        >
          {settingsForm}
        </WidgetSettingsPopover>
        {editingHome && widget.type !== 'calendar' && (
          <button
            type="button"
            data-home-widget-edit-control="true"
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-surface-4 bg-surface-0/90 text-gray-400 shadow-xl backdrop-blur transition-colors hover:bg-red-500/15 hover:text-red-200"
            title="Remove widget"
            aria-label="Remove widget"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {editingHome && (
        <>
          <div className="pointer-events-none absolute inset-0 z-30 rounded-2xl border border-accent/80 ring-2 ring-accent/15" />
          {RESIZE_HANDLES.map(handle => (
            <button
              key={handle.corner}
              type="button"
              data-home-widget-edit-control="true"
              onPointerDown={event => onStartResize(event, handle.corner)}
              className={`absolute z-50 h-6 w-6 touch-none rounded-md border-2 border-surface-0 bg-accent shadow-lg shadow-accent/25 transition-transform hover:scale-110 active:scale-95 md:h-5 md:w-5 ${handle.className} ${handle.cursorClass}`}
              title={handle.label}
              aria-label={handle.label}
            />
          ))}
        </>
      )}

      {children}
    </section>
  )
}
