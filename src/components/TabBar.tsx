import { X, Plus, Home, PanelLeftClose, PanelLeftOpen, Keyboard } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import AvatarMenu from './AvatarMenu'
import NotificationsMenu from './NotificationsMenu'

interface TabBarProps {
  onOpenShortcuts: () => void
}

export default function TabBar({ onOpenShortcuts }: TabBarProps) {
  const { tabs, activeTabId, pages, setActiveTab, closeTab, createPage, openTab, setHomeActive, sidebarOpen, toggleSidebar } = useWorkspace()

  const isHome = activeTabId === null

  function handleNewTab() {
    const id = createPage(null)
    openTab(id)
  }

  return (
    <div className="flex items-center h-10 bg-surface-1 border-b border-surface-3 select-none overflow-x-auto">
      {/* Sidebar toggle — flush left */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center w-10 h-full border-r border-surface-3 shrink-0 text-gray-500 hover:text-gray-200 hover:bg-surface-2/50 transition-colors"
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      {/* Home button */}
      <button
        onClick={() => setHomeActive()}
        className={`flex items-center justify-center w-10 h-full border-r border-surface-3 shrink-0 transition-colors ${
          isHome ? 'bg-surface-2 text-white' : 'text-gray-500 hover:text-gray-200 hover:bg-surface-2/50'
        }`}
        title="Home"
      >
        <Home size={14} />
      </button>

      {tabs.map(tab => {
        const page = pages[tab.pageId]
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group flex items-center gap-1.5 px-3 h-full text-sm border-r border-surface-3 max-w-[180px] shrink-0 transition-colors ${
              isActive ? 'bg-surface-2 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2/50'
            }`}
          >
            <span className="text-xs">{page?.icon ?? '📄'}</span>
            <span className="truncate">{page?.title || 'Untitled'}</span>
            <span
              onClick={e => { e.stopPropagation(); closeTab(tab.id) }}
              className="ml-auto p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-4 text-gray-400 hover:text-white transition-opacity"
            >
              <X size={12} />
            </span>
          </button>
        )
      })}

      <button
        onClick={handleNewTab}
        className="flex items-center justify-center w-8 h-full text-gray-500 hover:text-gray-200 hover:bg-surface-2/50 transition-colors shrink-0"
      >
        <Plus size={14} />
      </button>

      {/* Spacer pushes controls to far right */}
      <div className="flex-1" />

      <button
        onClick={onOpenShortcuts}
        className="flex h-full w-9 items-center justify-center border-l border-surface-3 text-gray-500 transition-colors hover:bg-surface-2/50 hover:text-gray-200"
        title="Keyboard shortcuts"
      >
        <Keyboard size={14} />
      </button>

      <NotificationsMenu />
      <AvatarMenu />
    </div>
  )
}
