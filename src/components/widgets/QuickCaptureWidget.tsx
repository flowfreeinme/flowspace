import { useState } from 'react'
import { useWorkspace } from '@/stores/workspace'
import EventModal from '../EventModal'
import type { QuickCaptureConfig } from '@/types/widgetSettings'

export default function QuickCaptureWidget({ config }: { config: QuickCaptureConfig }) {
  const { createPage, createBoard, openTab } = useWorkspace()
  const [showNewEvent, setShowNewEvent] = useState(false)

  const enabledButtons = config.buttons.filter(b => b.enabled)
  const colCount = Math.max(1, enabledButtons.length)

  return (
    <>
      <div
        className="h-full p-3"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, gap: '0.5rem' }}
      >
        {enabledButtons.map(btn => {
          if (btn.id === 'board') return (
            <button
              key="board"
              onClick={() => { const id = createBoard(null); openTab(id) }}
              className="rounded-xl border border-surface-3 bg-surface-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent/40 hover:text-white"
            >
              {btn.label}
            </button>
          )
          if (btn.id === 'page') return (
            <button
              key="page"
              onClick={() => { const id = createPage(null); openTab(id) }}
              className="rounded-xl border border-surface-3 bg-surface-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent/40 hover:text-white"
            >
              {btn.label}
            </button>
          )
          return (
            <button
              key="event"
              onClick={() => setShowNewEvent(true)}
              className="rounded-xl border border-surface-3 bg-surface-2 text-xs font-medium text-gray-300 transition-colors hover:border-accent/40 hover:text-white"
            >
              {btn.label}
            </button>
          )
        })}
      </div>
      {showNewEvent && (
        <EventModal
          defaultDate={new Date()}
          onClose={() => setShowNewEvent(false)}
        />
      )}
    </>
  )
}
