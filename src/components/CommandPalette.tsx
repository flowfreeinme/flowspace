import { useEffect, useRef, useState, useMemo } from 'react'
import { Search, Plus, PanelLeftClose, Home, Layout, Keyboard } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { STARTER_TEMPLATES } from '@/lib/starterTemplates'
import { searchBlocks } from '@/lib/search'

interface CommandPaletteProps {
  onClose: () => void
  onOpenShortcuts: () => void
  showShortcutsAction?: boolean
}

type ItemType = 'page' | 'action' | 'template' | 'content' | 'content-header'

interface PaletteItem {
  id: string
  type: ItemType
  icon: string | React.ReactNode
  label: string
  sub?: string
  action: () => void
}

export default function CommandPalette({ onClose, onOpenShortcuts, showShortcutsAction = true }: CommandPaletteProps) {
  const { pages, rootPages, openTab, setHomeActive, toggleSidebar, openTemplatePicker, applyStarterTemplate } = useWorkspace()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function createFromTemplate(templateId: string) {
    const template = STARTER_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    const id = applyStarterTemplate(templateId, null, 'merge')
    openTab(id)
    onClose()
  }

  const allItems = useMemo<PaletteItem[]>(() => {
    const q = query.toLowerCase().trim()

    const actions: PaletteItem[] = [
      {
        id: 'new-page',
        type: 'action',
        icon: <Plus size={14} />,
        label: 'New board',
        sub: '⌘N',
        action: () => { onClose(); openTemplatePicker(null) },
      },
      {
        id: 'home',
        type: 'action',
        icon: <Home size={14} />,
        label: 'Go home',
        sub: '⌘H',
        action: () => { setHomeActive(); onClose() },
      },
      {
        id: 'sidebar',
        type: 'action',
        icon: <PanelLeftClose size={14} />,
        label: 'Toggle sidebar',
        sub: '⌘[',
        action: () => { toggleSidebar(); onClose() },
      },
      ...(showShortcutsAction ? [{
        id: 'shortcuts',
        type: 'action' as const,
        icon: <Keyboard size={14} />,
        label: 'Keyboard shortcuts',
        sub: '⌘/',
        action: () => { onClose(); onOpenShortcuts() },
      }] : []),
    ]

    const templateItems: PaletteItem[] = STARTER_TEMPLATES.map(t => ({
      id: `tpl-${t.id}`,
      type: 'template',
      icon: t.icon,
      label: t.label,
      sub: t.category === 'workspace' ? `${t.boardCount} boards + widgets` : t.description,
      action: () => createFromTemplate(t.id),
    }))

    function flatPages(ids: string[], depth = 0): PaletteItem[] {
      return ids.flatMap(id => {
        const p = pages[id]
        if (!p) return []
        const item: PaletteItem = {
          id,
          type: 'page',
          icon: p.icon,
          label: p.title || 'Untitled',
          sub: depth > 0 ? '↳ sub-page' : undefined,
          action: () => { openTab(id); onClose() },
        }
        if (p.archived || p.folder) return [...flatPages(p.children, depth + 1)]
        return [item, ...flatPages(p.children, depth + 1)]
      })
    }
    const pageItems = flatPages(rootPages)

    if (!q) {
      return [...actions, { id: 'tpl-header', type: 'template', icon: <Layout size={14} />, label: 'Templates', sub: 'Start from a template', action: () => {} }, ...templateItems, ...pageItems]
    }

    const filtered = [
      ...actions.filter(a => a.label.toLowerCase().includes(q)),
      ...templateItems.filter(t => t.label.toLowerCase().includes(q) || (t.sub ?? '').toLowerCase().includes(q)),
      ...pageItems.filter(p => p.label.toLowerCase().includes(q)),
    ]

    const contentResults = searchBlocks(query, pages)
    // Deduplicate by pageId — one result per destination page
    const seenPages = new Set<string>()
    const uniqueContentResults = contentResults.filter(r => {
      if (seenPages.has(r.pageId)) return false
      seenPages.add(r.pageId)
      return true
    })
    const contentItems: PaletteItem[] = uniqueContentResults.map(r => ({
      id: `content-${r.blockId}`,
      type: 'content' as const,
      icon: r.pageIcon,
      label: r.pageTitle,
      sub: r.snippet,
      action: () => { openTab(r.pageId); onClose() },
    }))

    if (contentItems.length > 0) {
      filtered.push(
        { id: 'content-header', type: 'content-header' as const, icon: null, label: 'Content', sub: undefined, action: () => {} },
        ...contentItems,
      )
    }

    return filtered
  }, [query, pages, rootPages, onOpenShortcuts, showShortcutsAction, applyStarterTemplate, openTab, onClose, setHomeActive, toggleSidebar, openTemplatePicker])

  // Skip non-interactive header items
  const interactive = allItems.filter(i => i.id !== 'tpl-header' && i.id !== 'content-header')
  const selIdx = Math.min(selected, interactive.length - 1)

  useEffect(() => { setSelected(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.children[selIdx] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selIdx])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(i + 1, interactive.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); interactive[selIdx]?.action() }
    if (e.key === 'Escape') onClose()
  }

  const TYPE_COLOR: Record<ItemType, string> = {
    page: 'text-gray-400',
    action: 'text-accent',
    template: 'text-yellow-500',
    content: 'text-gray-400',
    'content-header': 'text-gray-600',
  }

  let interactiveIdx = 0

  return (
    <div
      className="fixed inset-0 z-60 flex items-start justify-center pt-24 bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-3">
          <Search size={16} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, blocks, actions…"
            className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none text-sm"
          />
          <kbd className="text-xs text-gray-600 bg-surface-3 px-1.5 py-0.5 rounded">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {allItems.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">No results</div>
          )}
          {allItems.map(item => {
            if (item.id === 'tpl-header') {
              return (
                <div key={item.id} className="px-4 pt-3 pb-1">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Templates</span>
                </div>
              )
            }

            if (item.id === 'content-header') {
              return (
                <div key={item.id} className="px-4 pt-3 pb-1">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Content</span>
                </div>
              )
            }

            const myIdx = interactiveIdx++
            const isActive = myIdx === selIdx

            return (
              <button
                key={item.id}
                onMouseEnter={() => setSelected(myIdx)}
                onClick={item.action}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left transition-colors ${
                  isActive ? 'bg-accent/20' : 'hover:bg-surface-3'
                }`}
              >
                <span className={`shrink-0 w-5 text-center ${TYPE_COLOR[item.type]}`}>
                  {typeof item.icon === 'string' ? item.icon : item.icon}
                </span>
                <span className="flex-1 text-sm text-gray-200 truncate">{item.label}</span>
                {item.sub && (
                  <span className="text-xs text-gray-600 shrink-0">{item.sub}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-surface-3 text-xs text-gray-700">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
