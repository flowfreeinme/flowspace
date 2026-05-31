import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'

interface WidgetSettingsPopoverProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  children: React.ReactNode
}

export default function WidgetSettingsPopover({
  open, onOpen, onClose, children,
}: WidgetSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) { onClose(); return }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    onOpen()
  }

  return (
    <div className="relative" data-home-widget-edit-control="true">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 opacity-0 transition-opacity hover:bg-surface-3 hover:text-gray-300 group-hover/widget:opacity-100"
        title="Widget settings"
        aria-label="Widget settings"
      >
        <Settings size={13} />
      </button>

      {open && pos && (
        <div
          ref={popoverRef}
          className="fixed z-[9999] w-72 rounded-xl border border-surface-4 bg-surface-2 p-3 shadow-2xl"
          style={{ top: pos.top, right: pos.right }}
          data-home-widget-edit-control="true"
          onPointerDown={e => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  )
}
