import { useEffect, useState, useRef } from 'react'
import { Archive, ChevronRight, Clock, FileText, FolderPlus, LayoutDashboard, LogOut, Plus, RotateCcw, Search, Share2, Star, Users } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { useSharing } from '@/stores/sharing'
import { useAuth } from '@/stores/auth'
import SettingsBox from './SettingsBox'
import ContextMenu, { MENU_ICONS } from './ContextMenu'
import PropertiesModal from './PropertiesModal'
import ShareModal from './ShareModal'
import type { Page } from '@/types'
import { normalizeFolderName } from '@/lib/folderNaming'
import {
  canDropPageIntoFolder,
  getArchivedBoardIds,
  getFavoriteBoardIds,
  getRecentBoardIds,
  getRootOrganizationIds,
  pageMatchesBoardQuery,
  sortOrganizationIds,
} from '@/lib/boardOrganization'
import type { WorkspaceSortMode } from '@/lib/boardOrganization'
import { getStoredWorkspaceSortMode, WORKSPACE_SORT_CHANGED_EVENT } from '@/lib/workspaceSort'

interface ContextState { x: number; y: number; pageId: string }
interface FolderNameDialogState {
  mode: 'create' | 'rename'
  pageId?: string
  value: string
}

interface PageItemProps {
  pageId: string
  depth: number
  onContext: (e: React.MouseEvent, pageId: string) => void
  query: string
  sortMode: WorkspaceSortMode
  draggingPageId: string | null
  dropTargetId: string | null
  onDragStart: (pageId: string, e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOverFolder: (folderId: string, e: React.DragEvent) => void
  onDropOnFolder: (folderId: string, e: React.DragEvent) => void
}

function PageItem({
  pageId,
  depth,
  onContext,
  query,
  sortMode,
  draggingPageId,
  dropTargetId,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDropOnFolder,
}: PageItemProps) {
  const { pages, activeTabId, tabs, openTab } = useWorkspace()
  const [expanded, setExpanded] = useState(false)
  const page = pages[pageId]
  if (!page) return null

  if (page.archived || !pageMatchesBoardQuery(pageId, pages, query)) return null

  const isActive = tabs.find(t => t.id === activeTabId)?.pageId === pageId
  const visibleChildren = sortOrganizationIds(
    page.children.filter(childId => {
      const child = pages[childId]
      return child && !child.archived && pageMatchesBoardQuery(childId, pages, query)
    }),
    pages,
    sortMode,
  )
  const hasChildren = visibleChildren.length > 0
  const isFolder = !!page.folder
  const isExpanded = expanded || !!query
  const canAcceptDrop = isFolder && canDropPageIntoFolder(draggingPageId, pageId, pages)
  const isDropTarget = dropTargetId === pageId && canAcceptDrop

  return (
    <div>
      <div
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => isFolder ? setExpanded(!expanded) : openTab(pageId)}
        onContextMenu={e => onContext(e, pageId)}
        draggable={!page.archived}
        onDragStart={e => onDragStart(pageId, e)}
        onDragEnd={onDragEnd}
        onDragOver={e => {
          if (!canAcceptDrop) return
          onDragOverFolder(pageId, e)
          setExpanded(true)
        }}
        onDrop={e => onDropOnFolder(pageId, e)}
        className={`group flex items-center gap-1 py-1 pr-2 rounded-md cursor-pointer text-sm transition-colors ${
          isDropTarget
            ? 'bg-accent/25 text-white ring-1 ring-accent/70'
            : isActive && !isFolder
              ? 'bg-accent/20 text-white'
              : draggingPageId === pageId
                ? 'text-gray-500 opacity-50'
                : 'text-gray-400 hover:text-gray-100 hover:bg-surface-3'
        }`}
      >
        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
          className={`p-0.5 rounded transition-transform ${isExpanded ? 'rotate-90' : ''} ${hasChildren ? 'opacity-60 hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronRight size={12} />
        </button>
        <span className="text-xs shrink-0">{page.icon}</span>
        <span className="truncate flex-1">{page.title || 'Untitled'}</span>
        {page.favorite && !isFolder && <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {visibleChildren.map(childId => (
            <PageItem
              key={childId}
              pageId={childId}
              depth={depth + 1}
              onContext={onContext}
              query={query}
              sortMode={sortMode}
              draggingPageId={draggingPageId}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverFolder={onDragOverFolder}
              onDropOnFolder={onDropOnFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuickBoardItem({ pageId, icon, onClick }: { pageId: string; icon: React.ReactNode; onClick: () => void }) {
  const page = useWorkspace(s => s.pages[pageId])
  if (!page) return null
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-gray-400 transition-colors hover:bg-surface-3 hover:text-gray-100"
    >
      <span className="text-gray-600 shrink-0">{icon}</span>
      <span className="truncate">{page.title || 'Untitled'}</span>
    </button>
  )
}

function ArchivedBoardItem({ pageId, onRestore }: { pageId: string; onRestore: () => void }) {
  const page = useWorkspace(s => s.pages[pageId])
  if (!page) return null
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-500">
      <Archive size={11} className="shrink-0 text-gray-700" />
      <span className="truncate flex-1">{page.title || 'Untitled'}</span>
      <button onClick={onRestore} className="rounded p-0.5 text-gray-600 transition-colors hover:text-gray-200" title="Restore">
        <RotateCcw size={11} />
      </button>
    </div>
  )
}

function SharedPageItem({ icon, title, pageData, ownerEmail, onOpen, onLeave }: {
  icon: string; title: string; pageData: Page; ownerEmail: string
  onOpen: (page: Page) => void; onLeave: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={() => onOpen(pageData)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer text-sm text-gray-400 hover:text-gray-100 hover:bg-surface-3 transition-colors"
      title={`Shared by ${ownerEmail}`}
    >
      <span className="text-xs shrink-0">{icon}</span>
      <span className="truncate flex-1">{title || 'Untitled'}</span>
      {hovered ? (
        <button
          onClick={e => { e.stopPropagation(); onLeave() }}
          title="Leave board"
          className="p-0.5 rounded text-gray-600 hover:text-red-400 transition-colors"
        >
          <LogOut size={11} />
        </button>
      ) : (
        <Users size={10} className="text-gray-600 shrink-0" />
      )}
    </div>
  )
}

export default function Sidebar() {
  const {
    rootPages,
    pages,
    createPage,
    createDatabase,
    createFolder,
    openTab,
    openTemplatePicker,
    deletePage,
    updatePageTitle,
    togglePageFavorite,
    archivePage,
    restorePage,
    movePage,
  } = useWorkspace()
  const { sharedWithMe, myShares, loadMyShares, leaveShare, notifyBoardDeleted } = useSharing()
  const { user } = useAuth()
  const [context, setContext] = useState<ContextState | null>(null)
  const [propertiesPageId, setPropertiesPageId] = useState<string | null>(null)
  const [sharePageId, setSharePageId] = useState<string | null>(null)
  const [deletePageId, setDeletePageId] = useState<string | null>(null)
  const [leavePageId, setLeavePageId] = useState<string | null>(null)
  const [movePageId, setMovePageId] = useState<string | null>(null)
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [folderNameDialog, setFolderNameDialog] = useState<FolderNameDialogState | null>(null)
  const [sortMode, setSortMode] = useState<WorkspaceSortMode>(getStoredWorkspaceSortMode)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const renamingRef = useRef<string | null>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const folderNameInputRef = useRef<HTMLInputElement>(null)
  const folderNameDialogFocusedRef = useRef(false)

  useEffect(() => {
    if (!addMenuOpen) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    return () => document.removeEventListener('mousedown', closeOnOutsidePointer)
  }, [addMenuOpen])

  useEffect(() => {
    if (!folderNameDialog) {
      folderNameDialogFocusedRef.current = false
      return
    }
    if (folderNameDialogFocusedRef.current) return
    folderNameDialogFocusedRef.current = true
    window.setTimeout(() => {
      folderNameInputRef.current?.focus()
      folderNameInputRef.current?.select()
    }, 0)
  }, [folderNameDialog])

  useEffect(() => {
    const syncSortMode = () => setSortMode(getStoredWorkspaceSortMode())
    window.addEventListener(WORKSPACE_SORT_CHANGED_EVENT, syncSortMode)
    window.addEventListener('storage', syncSortMode)
    return () => {
      window.removeEventListener(WORKSPACE_SORT_CHANGED_EVENT, syncSortMode)
      window.removeEventListener('storage', syncSortMode)
    }
  }, [])

  function handleContext(e: React.MouseEvent, pageId: string) {
    e.preventDefault()
    setContext({ x: e.clientX, y: e.clientY, pageId })
  }

  function handleNewBoard() {
    setAddMenuOpen(false)
    openTemplatePicker(null)
  }

  function handleNewPage() {
    const id = createPage(null)
    openTab(id)
    setAddMenuOpen(false)
  }

  function handleNewFolder() {
    setFolderNameDialog({ mode: 'create', value: 'New folder' })
  }

  function submitFolderName(e: React.FormEvent) {
    e.preventDefault()
    if (!folderNameDialog) return
    const name = normalizeFolderName(folderNameDialog.value)
    if (folderNameDialog.mode === 'create') {
      const id = createFolder(null)
      updatePageTitle(id, name)
    } else if (folderNameDialog.pageId) {
      updatePageTitle(folderNameDialog.pageId, name)
    }
    setFolderNameDialog(null)
  }

  function startRename(pageId: string) {
    if (pages[pageId]?.folder) {
      setFolderNameDialog({
        mode: 'rename',
        pageId,
        value: pages[pageId].title || 'New folder',
      })
      return
    }
    openTab(pageId)
    renamingRef.current = pageId
    setTimeout(() => {
      const titleEl = document.querySelector('[data-page-title]') as HTMLElement
      if (titleEl) {
        titleEl.focus()
        const range = document.createRange()
        range.selectNodeContents(titleEl)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    }, 50)
  }

  function openSharedPage(page: Page) {
    // Only inject if not already in workspace — preserves any local edits
    if (!useWorkspace.getState().pages[page.id]) {
      useWorkspace.setState(s => ({
        pages: { ...s.pages, [page.id]: { ...page, parentId: null } },
      }))
    }
    openTab(page.id)
  }

  function handleDragStart(pageId: string, e: React.DragEvent) {
    if (!pages[pageId] || pages[pageId].archived) {
      e.preventDefault()
      return
    }
    setDraggingPageId(pageId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-flowspace-page-id', pageId)
    e.dataTransfer.setData('text/plain', pageId)
  }

  function handleDragEnd() {
    setDraggingPageId(null)
    setDropTargetId(null)
  }

  function getDraggedPageId(e: React.DragEvent) {
    return draggingPageId || e.dataTransfer.getData('application/x-flowspace-page-id') || e.dataTransfer.getData('text/plain')
  }

  function handleDragOverFolder(folderId: string, e: React.DragEvent) {
    const pageId = getDraggedPageId(e)
    if (!canDropPageIntoFolder(pageId, folderId, pages)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(folderId)
  }

  function handleDropOnFolder(folderId: string, e: React.DragEvent) {
    const pageId = getDraggedPageId(e)
    if (!canDropPageIntoFolder(pageId, folderId, pages)) return
    e.preventDefault()
    e.stopPropagation()
    movePage(pageId, folderId)
    setDraggingPageId(null)
    setDropTargetId(null)
  }

  const contextPage = context ? pages[context.pageId] : null
  const propertiesPage = propertiesPageId ? pages[propertiesPageId] : null
  const sharePage = sharePageId ? pages[sharePageId] : null
  const favoriteIds = getFavoriteBoardIds(pages)
  const recentIds = getRecentBoardIds(pages, 4)
  const archivedIds = getArchivedBoardIds(pages)
  const rootOrganizationIds = getRootOrganizationIds(pages, rootPages, query, sortMode)
  const folderOptions = Object.values(pages)
    .filter(p => p.folder && !p.archived && (!movePageId || canDropPageIntoFolder(movePageId, p.id, pages)))
    .sort((a, b) => a.title.localeCompare(b.title))

  return (
    <>
      <div className="w-56 h-full bg-surface-1 border-r border-surface-3 flex flex-col select-none">

        {/* Workspace */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace</span>
            <div className="flex items-center gap-0.5">
              <button onClick={handleNewFolder} title="New folder" className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-surface-3 transition-colors">
                <FolderPlus size={14} />
              </button>
              <div ref={addMenuRef} className="relative">
                <button
                  onClick={() => setAddMenuOpen(v => !v)}
                  title="Add"
                  aria-expanded={addMenuOpen}
                  className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-surface-3 transition-colors"
                >
                  <Plus size={14} />
                </button>
                {addMenuOpen && (
                  <div className="absolute right-0 top-7 z-50 w-40 overflow-hidden rounded-lg border border-surface-4 bg-surface-2 py-1 shadow-2xl">
                    <button
                      onClick={handleNewBoard}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-surface-3 hover:text-white"
                    >
                      <LayoutDashboard size={13} className="text-gray-500" />
                      Board
                    </button>
                    <button
                      onClick={handleNewPage}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-surface-3 hover:text-white"
                    >
                      <FileText size={13} className="text-gray-500" />
                      Page
                    </button>
                    <button
                      onClick={() => { const id = createDatabase(null); openTab(id); setAddMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-surface-3 hover:text-white"
                    >
                      <span className="text-gray-500 text-xs font-mono">⊞</span>
                      Database
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
            <Search size={12} className="text-gray-600 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search workspace"
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {!query && favoriteIds.length > 0 && (
            <div className="mb-2">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">Favorites</div>
              {favoriteIds.map(id => (
                <QuickBoardItem key={id} pageId={id} icon={<Star size={11} className="fill-yellow-400 text-yellow-400" />} onClick={() => openTab(id)} />
              ))}
            </div>
          )}

          {!query && recentIds.length > 0 && (
            <div className="mb-2">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">Recent</div>
              {recentIds.map(id => (
                <QuickBoardItem key={id} pageId={id} icon={<Clock size={11} />} onClick={() => openTab(id)} />
              ))}
            </div>
          )}

          {/* Own boards */}
          {rootOrganizationIds.length === 0 && sharedWithMe.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-600 gap-2">
              <FileText size={24} />
              <span className="text-xs text-center">{query ? 'No matching items.' : 'No items yet.'}<br />{query ? 'Try another search.' : 'Click + to create one.'}</span>
            </div>
          ) : (
            rootOrganizationIds.map(id => (
              <PageItem
                key={id}
                pageId={id}
                depth={0}
                onContext={handleContext}
                query={query}
                sortMode={sortMode}
                draggingPageId={draggingPageId}
                dropTargetId={dropTargetId}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOverFolder={handleDragOverFolder}
                onDropOnFolder={handleDropOnFolder}
              />
            ))
          )}

          {!query && archivedIds.length > 0 && (
            <div className="mt-3 border-t border-surface-3/50 pt-2">
              <button
                onClick={() => setShowArchived(v => !v)}
                className="flex w-full items-center justify-between px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-400"
              >
                Archived
                <span>{showArchived ? 'Hide' : archivedIds.length}</span>
              </button>
              {showArchived && archivedIds.map(id => (
                <ArchivedBoardItem key={id} pageId={id} onRestore={() => restorePage(id)} />
              ))}
            </div>
          )}

          {/* Accepted shared boards */}
          {sharedWithMe.length > 0 && (
            <>
              {rootOrganizationIds.length > 0 && <div className="border-t border-surface-3/50 my-1.5 mx-1" />}
              {sharedWithMe.map(s => (
                <SharedPageItem
                  key={s.shareId}
                  icon={s.icon}
                  title={s.title}
                  pageData={s.pageData}
                  ownerEmail={s.ownerEmail}
                  onOpen={openSharedPage}
                  onLeave={() => setLeavePageId(s.pageId)}
                />
              ))}
            </>
          )}
        </div>

        <SettingsBox />
      </div>

      {context && contextPage && (
        <ContextMenu
          x={context.x}
          y={context.y}
          onClose={() => setContext(null)}
          options={[
            { label: 'Edit', icon: MENU_ICONS.edit, onClick: () => startRename(context.pageId) },
            ...(contextPage.folder ? [{
              label: 'New board here',
              icon: <Plus size={14} />,
              onClick: () => { openTemplatePicker(context.pageId); setContext(null) },
            }] : []),
            ...(!contextPage.folder ? [{
              label: contextPage.favorite ? 'Unfavorite' : 'Favorite',
              icon: <Star size={14} />,
              onClick: () => togglePageFavorite(context.pageId),
            }] : []),
            {
              label: 'Move to folder',
              icon: <FolderPlus size={14} />,
              onClick: () => setMovePageId(context.pageId),
            },
            ...(!contextPage.folder ? [{
              label: 'Share',
              icon: <Share2 size={14} />,
              onClick: () => { setSharePageId(context.pageId); loadMyShares(user!.id) },
            }] : []),
            { label: 'Properties', icon: MENU_ICONS.properties, onClick: () => setPropertiesPageId(context.pageId) },
            { label: 'Archive', icon: <Archive size={14} />, onClick: () => archivePage(context.pageId) },
            { label: 'Delete', icon: MENU_ICONS.delete, onClick: () => setDeletePageId(context.pageId), danger: true },
          ]}
        />
      )}

      {propertiesPage && <PropertiesModal page={propertiesPage} onClose={() => setPropertiesPageId(null)} />}
      {sharePage && <ShareModal page={sharePage} onClose={() => setSharePageId(null)} />}

      {folderNameDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onMouseDown={e => { if (e.target === e.currentTarget) setFolderNameDialog(null) }}
        >
          <form
            onSubmit={submitFolderName}
            className="w-[360px] overflow-hidden rounded-2xl border border-surface-4 bg-surface-2 shadow-2xl"
          >
            <div className="border-b border-surface-3 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-blue-300">
                  <FolderPlus size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {folderNameDialog.mode === 'create' ? 'New folder' : 'Rename folder'}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">Name the folder before it appears in your workspace.</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-400" htmlFor="folder-name-input">
                Folder name
              </label>
              <input
                id="folder-name-input"
                ref={folderNameInputRef}
                value={folderNameDialog.value}
                onChange={e => setFolderNameDialog({ ...folderNameDialog, value: e.target.value })}
                className="w-full rounded-lg border border-surface-4 bg-surface-1 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-gray-700 focus:border-accent"
                placeholder="New folder"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-surface-3 px-5 py-3">
              <button
                type="button"
                onClick={() => setFolderNameDialog(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-surface-3 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
              >
                {folderNameDialog.mode === 'create' ? 'Create folder' : 'Save name'}
              </button>
            </div>
          </form>
        </div>
      )}

      {movePageId && pages[movePageId] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onMouseDown={e => { if (e.target === e.currentTarget) setMovePageId(null) }}>
          <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-[360px] overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-3">
              <h2 className="text-sm font-semibold text-white">Move "{pages[movePageId].title || 'Untitled'}"</h2>
              <p className="mt-1 text-xs text-gray-500">Choose where this board or folder should live.</p>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              <button
                onClick={() => { movePage(movePageId, null); setMovePageId(null) }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-surface-3 hover:text-white"
              >
                <span>🏠</span>
                Top level
              </button>
              {folderOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-gray-600">No folders yet.</p>
              ) : folderOptions.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => { movePage(movePageId, folder.id); setMovePageId(null) }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-surface-3 hover:text-white"
                >
                  <span>{folder.icon}</span>
                  <span className="truncate">{folder.title || 'New folder'}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end border-t border-surface-3 px-5 py-3">
              <button onClick={() => setMovePageId(null)} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-surface-3 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {leavePageId && (() => {
        const leavingPage = sharedWithMe.find(s => s.pageId === leavePageId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onMouseDown={e => { if (e.target === e.currentTarget) setLeavePageId(null) }}>
            <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-[420px] overflow-hidden">
              <div className="px-6 py-5">
                <h2 className="text-base font-semibold text-white mb-2">
                  Leave "{leavingPage?.title || 'Untitled'}"?
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  You will lose access to this board immediately.{' '}
                  <span className="text-white font-medium">You will need a new invitation from{' '}
                  {leavingPage?.ownerEmail ?? 'the owner'}</span>{' '}
                  to regain access.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-3">
                <button
                  onClick={() => setLeavePageId(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    leaveShare(leavePageId)
                    // Remove the page and close its tabs from local workspace
                    const ws = useWorkspace.getState()
                    const tabsToClose = ws.tabs.filter(t => t.pageId === leavePageId)
                    tabsToClose.forEach(t => ws.closeTab(t.id))
                    useWorkspace.setState(s => {
                      const pages = { ...s.pages }
                      delete pages[leavePageId]
                      return { pages }
                    })
                    setLeavePageId(null)
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Leave board
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {deletePageId && (() => {
        const pageToDelete = pages[deletePageId]
        const sharedWith = myShares[deletePageId] ?? []
        const isShared = sharedWith.length > 0
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onMouseDown={e => { if (e.target === e.currentTarget) setDeletePageId(null) }}>
            <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-[420px] overflow-hidden">
              <div className="px-6 py-5">
                <h2 className="text-base font-semibold text-white mb-2">
                  Delete "{pageToDelete?.title || 'Untitled'}"?
                </h2>
                {isShared ? (
                  <p className="text-sm text-gray-400 leading-relaxed">
                    This board is shared with{' '}
                    <span className="text-white font-medium">{sharedWith.join(', ')}</span>.
                    Deleting it will remove access for everyone.{' '}
                    All recipients will be notified.{' '}
                    <span className="text-red-400 font-medium">This cannot be undone.</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 leading-relaxed">
                    This board and all of its contents will be permanently deleted.{' '}
                    <span className="text-red-400 font-medium">This cannot be undone.</span>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-3">
                <button
                  onClick={() => setDeletePageId(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (isShared) {
                      await notifyBoardDeleted(deletePageId, pageToDelete?.title || 'Untitled')
                    }
                    deletePage(deletePageId)
                    setDeletePageId(null)
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
