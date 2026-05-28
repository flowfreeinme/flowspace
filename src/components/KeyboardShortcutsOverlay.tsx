import { Keyboard, X } from 'lucide-react'

interface KeyboardShortcutsOverlayProps {
  onClose: () => void
}

const SHORTCUT_GROUPS = [
  {
    title: 'Workspace',
    items: [
      ['⌘ K', 'Open command palette'],
      ['⌘ N', 'Create a new board'],
      ['⌘ W', 'Close active tab'],
      ['⌘ H', 'Go to home calendar'],
      ['⌘ [', 'Toggle sidebar'],
      ['⌘ /', 'Show keyboard shortcuts'],
    ],
  },
  {
    title: 'Board',
    items: [
      ['Double-click canvas', 'Add a textbox'],
      ['Right-click canvas', 'Open board actions'],
      ['Delete', 'Remove selected board items'],
      ['⌘ A', 'Select all board items'],
      ['Esc', 'Deselect or close menus'],
    ],
  },
  {
    title: 'Textbox Editing',
    items: [
      ['⌘ B', 'Bold'],
      ['⌘ I', 'Italic'],
      ['⌘ U', 'Underline'],
      ['⌘ K', 'Add link'],
      ['⌘ ⇧ 7', 'Numbered list'],
      ['⌘ ⇧ 8', 'Bullet list'],
      ['⌘ ]', 'Indent'],
      ['⌘ [', 'Outdent'],
      ['⌘ ⇧ L/E/R', 'Align left, center, or right'],
    ],
  },
  {
    title: 'Calendar',
    items: [
      ['Click a day', 'Open week view'],
      ['Day + button', 'Create an event on that day'],
      ['Click event', 'Edit event details'],
      ['Blue + button', 'Import calendars or create event'],
    ],
  },
]

export default function KeyboardShortcutsOverlay({ onClose }: KeyboardShortcutsOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/65 px-4 pt-16 md:pt-24"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-surface-4 bg-surface-2 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Keyboard size={17} />
            </div>
            <div>
              <h2 id="keyboard-shortcuts-title" className="text-sm font-semibold text-white">Keyboard shortcuts</h2>
              <p className="mt-0.5 text-xs text-gray-500">Fast paths for boards, calendar, and textbox editing.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-surface-3 hover:text-white"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid max-h-[68vh] gap-4 overflow-y-auto p-5 md:grid-cols-2">
          {SHORTCUT_GROUPS.map(group => (
            <section key={group.title} className="rounded-xl border border-surface-3 bg-surface-1/70 p-4">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{group.title}</h3>
              <div className="space-y-2.5">
                {group.items.map(([keys, label]) => (
                  <div key={`${group.title}-${keys}`} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-sm text-gray-300">{label}</span>
                    <kbd className="shrink-0 rounded-md border border-surface-4 bg-surface-3 px-2 py-1 text-[11px] font-semibold tabular-nums text-gray-300 shadow-inner">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t border-surface-3 px-5 py-3 text-xs text-gray-600">
          Press <kbd className="rounded bg-surface-3 px-1.5 py-0.5 text-gray-400">Esc</kbd> to close.
        </div>
      </div>
    </div>
  )
}
