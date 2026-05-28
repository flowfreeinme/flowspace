import { useState } from 'react'
import { Settings, X, Moon, Sun, Type, Layout, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { formatBytes, getWorkspaceMetrics } from '@/lib/workspaceMetrics'
import { getStoredWorkspaceSortMode, setStoredWorkspaceSortMode, WORKSPACE_SORT_OPTIONS } from '@/lib/workspaceSort'
import type { WorkspaceSortMode } from '@/lib/boardOrganization'

type Tab = 'appearance' | 'layout' | 'shortcuts' | 'about'

interface Props {
  open?: boolean
  onClose?: () => void
  mobile?: boolean
}

export default function SettingsBox({ open: openProp, onClose, mobile }: Props = {}) {
  const { pages, rootPages } = useWorkspace()
  const [openInternal, setOpenInternal] = useState(false)
  const controlled = openProp !== undefined
  const open = controlled ? openProp! : openInternal
  const setOpen = controlled ? (v: boolean) => { if (!v) onClose?.() } : setOpenInternal
  const [tab, setTab] = useState<Tab>('appearance')
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [workspaceSortMode, setWorkspaceSortMode] = useState<WorkspaceSortMode>(getStoredWorkspaceSortMode)
  const [hiddenPages, setHiddenPages] = useState<Set<string>>(new Set())
  const [order, setOrder] = useState<string[]>([])
  const metrics = getWorkspaceMetrics({ pages, rootPages, tabs: [], activeTabId: null })

  function applyFontSize(size: 'sm' | 'md' | 'lg') {
    setFontSize(size)
    const map = { sm: '13px', md: '15px', lg: '17px' }
    document.documentElement.style.fontSize = map[size]
  }

  function updateWorkspaceSortMode(mode: WorkspaceSortMode) {
    setWorkspaceSortMode(mode)
    setStoredWorkspaceSortMode(mode)
  }

  function handleOpen() {
    setOrder([...rootPages])
    setOpen(true)
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...order]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setOrder(next)
  }

  function moveDown(idx: number) {
    if (idx === order.length - 1) return
    const next = [...order]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setOrder(next)
  }

  function toggleVisibility(id: string) {
    setHiddenPages(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function applyLayout() {
    const visibleOrder = order.filter(id => !hiddenPages.has(id))
    useWorkspace.setState({ rootPages: visibleOrder })
    useWorkspace.getState().persist()
    setOpen(false)
  }

  const shortcuts = [
    { keys: '⌘K', label: 'Command palette' },
    { keys: '⌘N', label: 'New page' },
    { keys: '⌘W', label: 'Close tab' },
    { keys: '⌘[', label: 'Toggle sidebar' },
    { keys: '⌘H', label: 'Go home' },
    { keys: '/', label: 'Insert block' },
  ]

  const TABS: { id: Tab; label: string }[] = ([
    { id: 'appearance', label: 'Appearance' },
    !mobile && { id: 'layout', label: 'Layout' },
    !mobile && { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'about', label: 'About' },
  ] as const).filter(Boolean) as { id: Tab; label: string }[]

  return (
    <>
      {!controlled && (
        <div className="px-3 py-2 border-t border-surface-3">
          <button
            onClick={handleOpen}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-surface-3 transition-colors text-xs"
          >
            <Settings size={13} />
            Settings
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-[440px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
              <h2 className="font-semibold text-white">Settings</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-surface-4 text-gray-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-surface-3">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t.id ? 'text-white border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">

              {/* Appearance */}
              {tab === 'appearance' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-300"><Moon size={14} /> Theme</div>
                    <div className="flex bg-surface-3 rounded-lg p-0.5 gap-0.5">
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-white text-xs">
                        <Moon size={11} /> Dark
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-gray-500 text-xs cursor-not-allowed" title="Coming soon">
                        <Sun size={11} /> Light
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-300"><Type size={14} /> Font size</div>
                    <div className="flex bg-surface-3 rounded-lg p-0.5 gap-0.5">
                      {(['sm', 'md', 'lg'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => applyFontSize(s)}
                          className={`px-2.5 py-1 rounded-md text-xs transition-colors ${fontSize === s ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-200'}`}
                        >
                          {s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Layout */}
              {tab === 'layout' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-surface-3 bg-surface-1 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-200">Workspace order</h3>
                        <p className="mt-0.5 text-xs text-gray-600">Choose how pages and boards appear in the sidebar.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-3 p-1">
                      {WORKSPACE_SORT_OPTIONS.map(option => {
                        const active = workspaceSortMode === option.mode
                        return (
                          <button
                            key={option.mode}
                            onClick={() => updateWorkspaceSortMode(option.mode)}
                            title={option.title}
                            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? 'bg-accent text-white'
                                : 'text-gray-500 hover:bg-surface-4 hover:text-gray-200'
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <Layout size={14} />
                    <span>Drag to reorder pages in your sidebar, or hide them.</span>
                  </div>
                  {order.length === 0 && (
                    <p className="text-xs text-gray-600 text-center py-4">No pages yet</p>
                  )}
                  <div className="space-y-1">
                    {order.map((id, idx) => {
                      const page = pages[id]
                      if (!page) return null
                      const hidden = hiddenPages.has(id)
                      return (
                        <div key={id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${hidden ? 'border-surface-3 opacity-40' : 'border-surface-3 bg-surface-3'}`}>
                          <span className="text-sm shrink-0">{page.icon}</span>
                          <span className={`flex-1 text-sm truncate ${hidden ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                            {page.title || 'Untitled'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleVisibility(id)} className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors" title={hidden ? 'Show' : 'Hide'}>
                              {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
                              <ChevronUp size={12} />
                            </button>
                            <button onClick={() => moveDown(idx)} disabled={idx === order.length - 1} className="p-1 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={applyLayout}
                    className="w-full mt-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Apply layout
                  </button>
                </div>
              )}

              {/* Shortcuts */}
              {tab === 'shortcuts' && (
                <div className="space-y-2">
                  {shortcuts.map(s => (
                    <div key={s.keys} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{s.label}</span>
                      <kbd className="text-xs bg-surface-3 border border-surface-4 text-gray-300 px-2 py-0.5 rounded-md font-mono">{s.keys}</kbd>
                    </div>
                  ))}
                </div>
              )}

              {/* About */}
              {tab === 'about' && (
                <div className="space-y-2">
                  {[
                    ['App', 'FlowSpace'],
                    ['Version', '0.1.0'],
                    ['Website', 'flowspaced.com'],
                    ['Boards', String(metrics.boardCount)],
                    ['Folders', String(metrics.folderCount)],
                    ['Blocks', String(metrics.blockCount)],
                    ['Workspace size', formatBytes(metrics.serializedBytes)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500">{k}</span>
                      <span className="text-gray-300">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Support</span>
                    <a href="mailto:supportinbox@flowspaced.com" className="text-accent hover:text-accent-hover transition-colors">supportinbox@flowspaced.com</a>
                  </div>
                  {metrics.splitRecommended && (
                    <p className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs leading-relaxed text-yellow-300">
                      This workspace is getting large. FlowSpace can continue working, but this is the point where per-board storage becomes worth prioritizing.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
