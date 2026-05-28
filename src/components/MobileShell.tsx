// src/components/MobileShell.tsx
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Clock, FileText, Home, LayoutDashboard, Search, Star, Users } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { useSharing } from '@/stores/sharing'
import type { Page } from '@/types'
import type { WorkspaceSortMode } from '@/lib/boardOrganization'
import { getFavoriteBoardIds, getRecentBoardIds } from '@/lib/boardOrganization'
import { getMobileWorkspaceChildIds, getMobileWorkspaceRootIds } from '@/lib/mobileWorkspaceNavigation'
import { getStoredWorkspaceSortMode, WORKSPACE_SORT_CHANGED_EVENT } from '@/lib/workspaceSort'
import PageView from './PageView'
import BoardView from './BoardView'
import HomeScreen from './HomeScreen'
import NotificationsMenu from './NotificationsMenu'
import AvatarMenu from './AvatarMenu'
import CommandPalette from './CommandPalette'
import BoardTemplateModal from './BoardTemplateModal'

interface Props {
  paletteOpen: boolean
  onClosePalette: () => void
}

interface MobileWorkspaceItemProps {
  pageId: string
  depth: number
  query: string
  sortMode: WorkspaceSortMode
  activePageId?: string
  expandedFolders: Set<string>
  onToggleFolder: (id: string) => void
  onOpenPage: (id: string) => void
}

function MobileWorkspaceItem({
  pageId,
  depth,
  query,
  sortMode,
  activePageId,
  expandedFolders,
  onToggleFolder,
  onOpenPage,
}: MobileWorkspaceItemProps) {
  const pages = useWorkspace(s => s.pages)
  const page = pages[pageId]
  if (!page || page.archived) return null

  const children = getMobileWorkspaceChildIds(pageId, pages, query, sortMode)
  const isFolder = !!page.folder
  const isExpanded = !!query || expandedFolders.has(pageId)
  const isActive = activePageId === pageId

  return (
    <div>
      <button
        onClick={() => isFolder ? onToggleFolder(pageId) : onOpenPage(pageId)}
        className={`flex min-h-[44px] w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
          isActive && !isFolder ? 'bg-surface-3 text-white' : 'text-gray-400 hover:bg-surface-3 hover:text-white'
        }`}
        style={{ paddingLeft: `${16 + depth * 18}px` }}
      >
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-transform ${isExpanded ? 'rotate-90' : ''} ${children.length ? 'text-gray-500' : 'text-transparent'}`}>
          <ChevronRight size={13} />
        </span>
        <span className="text-base shrink-0">{page.icon || (isFolder ? '📁' : page.boardMode ? '🗃️' : '📄')}</span>
        <span className="min-w-0 flex-1 truncate text-left">{page.title || 'Untitled'}</span>
        <span className="rounded-md border border-surface-4 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
          {isFolder ? 'Folder' : page.boardMode ? 'Board' : 'Page'}
        </span>
      </button>
      {isFolder && isExpanded && children.length > 0 && (
        <div>
          {children.map(childId => (
            <MobileWorkspaceItem
              key={childId}
              pageId={childId}
              depth={depth + 1}
              query={query}
              sortMode={sortMode}
              activePageId={activePageId}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onOpenPage={onOpenPage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MobileShell({ paletteOpen, onClosePalette }: Props) {
  const { tabs, activeTabId, rootPages, pages, createPage, openTab, setHomeActive, openTemplatePicker } = useWorkspace()
  const { sharedWithMe } = useSharing()
  const [tabPickerOpen, setTabPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<WorkspaceSortMode>(getStoredWorkspaceSortMode)

  const activeTab = tabs.find(t => t.id === activeTabId)
  const activePage = activeTab ? pages[activeTab.pageId] : null
  const activePageId = activeTab?.pageId

  const rootWorkspaceIds = getMobileWorkspaceRootIds(pages, rootPages, query, sortMode)
  const favoriteIds = getFavoriteBoardIds(pages)
  const recentIds = getRecentBoardIds(pages, 4)

  function openSharedBoard(pageId: string, pageData: Page) {
    if (!useWorkspace.getState().pages[pageId]) {
      useWorkspace.setState(s => ({ pages: { ...s.pages, [pageId]: { ...pageData, parentId: null } } }))
    }
    openTab(pageId)
    setTabPickerOpen(false)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (paletteOpen) { onClosePalette(); return }
      if (tabPickerOpen) { setTabPickerOpen(false); return }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paletteOpen, tabPickerOpen, onClosePalette])

  useEffect(() => {
    const syncSortMode = () => setSortMode(getStoredWorkspaceSortMode())
    window.addEventListener(WORKSPACE_SORT_CHANGED_EVENT, syncSortMode)
    window.addEventListener('storage', syncSortMode)
    return () => {
      window.removeEventListener(WORKSPACE_SORT_CHANGED_EVENT, syncSortMode)
      window.removeEventListener('storage', syncSortMode)
    }
  }, [])

  function openWorkspacePage(pageId: string) {
    openTab(pageId)
    setTabPickerOpen(false)
    setQuery('')
  }

  function toggleFolder(pageId: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(pageId) ? next.delete(pageId) : next.add(pageId)
      return next
    })
  }

  function handleNewBoard() {
    setTabPickerOpen(false)
    setQuery('')
    openTemplatePicker(null)
  }

  function handleNewPage() {
    const id = createPage(null)
    openTab(id)
    setTabPickerOpen(false)
    setQuery('')
  }

  return (
    <div className="mobile-shell bg-surface-0 flex flex-col text-sm">

      {/* ── Header ── */}
      <div className="mobile-shell-header bg-surface-1 border-b border-surface-3 shrink-0 relative z-30">
        <div className="flex items-center h-12 px-2 gap-2">
        {/* Tab picker pill */}
        <button
          onClick={() => setTabPickerOpen(p => !p)}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-3 text-sm min-w-0"
        >
          <span className="text-xs shrink-0">{activePage?.icon ?? '🏠'}</span>
          <span className="truncate flex-1 text-left text-white">
            {activePage?.title || (activeTabId === null ? 'Home' : 'Untitled')}
          </span>
          <ChevronDown size={14} className="text-gray-500 shrink-0" />
        </button>

        <NotificationsMenu />
        <AvatarMenu />
        </div>
      </div>

      {/* ── Workspace picker dropdown ── */}
      {tabPickerOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setTabPickerOpen(false)} />
          <div className="mobile-shell-dropdown absolute left-0 right-0 z-30 bg-surface-2 border-b border-surface-3 shadow-xl overflow-y-auto">
            <div className="px-4 py-3 border-b border-surface-3">
              <button
                onClick={() => { setHomeActive(); setTabPickerOpen(false); setQuery('') }}
                className={`mb-3 flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeTabId === null ? 'bg-surface-3 text-white' : 'text-gray-400 hover:bg-surface-3 hover:text-white'
                }`}
              >
                <Home size={16} className="shrink-0" />
                <span className="flex-1 text-left">Home calendar</span>
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-surface-3 bg-surface-1 px-3 py-2">
                <Search size={14} className="shrink-0 text-gray-600" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search workspace"
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
                />
              </div>
            </div>

            {!query && favoriteIds.length > 0 && (
              <div className="border-b border-surface-3/70 py-2">
                <div className="px-4 pb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Favorites</div>
                {favoriteIds.map(pageId => {
                  const page = pages[pageId]
                  if (!page) return null
                  return (
                    <button
                      key={pageId}
                      onClick={() => openWorkspacePage(pageId)}
                      className="flex min-h-[40px] w-full items-center gap-3 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-surface-3 hover:text-white"
                    >
                      <Star size={13} className="shrink-0 fill-yellow-400 text-yellow-400" />
                      <span className="truncate text-left">{page.title || 'Untitled'}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {!query && recentIds.length > 0 && (
              <div className="border-b border-surface-3/70 py-2">
                <div className="px-4 pb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Recent</div>
                {recentIds.map(pageId => {
                  const page = pages[pageId]
                  if (!page) return null
                  return (
                    <button
                      key={pageId}
                      onClick={() => openWorkspacePage(pageId)}
                      className="flex min-h-[40px] w-full items-center gap-3 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-surface-3 hover:text-white"
                    >
                      <Clock size={13} className="shrink-0 text-gray-600" />
                      <span className="truncate text-left">{page.title || 'Untitled'}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Workspace */}
            <div className="px-4 pt-3 pb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Workspace</span>
            </div>
            {rootWorkspaceIds.length === 0 && (
              <p className="px-4 py-3 text-xs text-gray-500">{query ? 'No matching items' : 'No workspace items yet'}</p>
            )}
            {rootWorkspaceIds.map(pageId => (
              <MobileWorkspaceItem
                key={pageId}
                pageId={pageId}
                depth={0}
                query={query}
                sortMode={sortMode}
                activePageId={activePageId}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onOpenPage={openWorkspacePage}
              />
            ))}

            <div className="grid grid-cols-2 gap-2 border-t border-surface-3 px-4 py-3">
              <button
                onClick={handleNewBoard}
                className="flex items-center justify-center gap-2 rounded-lg border border-surface-3 bg-surface-1 px-3 py-2.5 text-sm text-accent transition-colors hover:bg-surface-3"
              >
                <LayoutDashboard size={14} />
                <span>Board</span>
              </button>
              <button
                onClick={handleNewPage}
                className="flex items-center justify-center gap-2 rounded-lg border border-surface-3 bg-surface-1 px-3 py-2.5 text-sm text-accent transition-colors hover:bg-surface-3"
              >
                <FileText size={14} />
                <span>Page</span>
              </button>
            </div>

            {/* Shared with Me */}
            {sharedWithMe.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1 border-t border-surface-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Shared with Me</span>
                </div>
                {sharedWithMe.map(s => {
                  const isActive = activeTab?.pageId === s.pageId
                  return (
                    <button
                      key={s.shareId}
                      onClick={() => openSharedBoard(s.pageId, s.pageData)}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${
                        isActive ? 'text-white bg-surface-3' : 'text-gray-400 hover:text-white hover:bg-surface-3'
                      }`}
                    >
                      <span className="text-base shrink-0">{s.icon || '📋'}</span>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="truncate">{s.title || 'Untitled'}</div>
                        <div className="text-xs text-gray-600 truncate flex items-center gap-1">
                          <Users size={10} />
                          {s.ownerEmail}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Content ── */}
      <div className="min-h-0 flex-1 overflow-hidden relative flex">
        {activeTab ? (
          activePage?.boardMode
            ? <BoardView key={activeTab.pageId} pageId={activeTab.pageId} />
            : <PageView key={activeTab.pageId} pageId={activeTab.pageId} />
        ) : (
          <HomeScreen />
        )}
      </div>

      {paletteOpen && <CommandPalette onClose={onClosePalette} onOpenShortcuts={() => {}} showShortcutsAction={false} />}
      <BoardTemplateModal />
    </div>
  )
}
