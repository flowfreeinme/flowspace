import { useWorkspace } from '@/stores/workspace'
import TabBar from './TabBar'
import Sidebar from './Sidebar'
import PageView from './PageView'
import BoardView from './BoardView'
import HomeScreen from './HomeScreen'
import CommandPalette from './CommandPalette'
import BoardTemplateModal from './BoardTemplateModal'
import DatabasePage from './database/DatabasePage'

interface Props {
  paletteOpen: boolean
  onClosePalette: () => void
  onOpenShortcuts: () => void
}

export default function DesktopShell({ paletteOpen, onClosePalette, onOpenShortcuts }: Props) {
  const { tabs, activeTabId, pages, sidebarOpen } = useWorkspace()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const activePage = activeTab ? pages[activeTab.pageId] : null

  return (
    <div className="h-screen bg-surface-0 flex flex-col overflow-hidden text-sm">
      <TabBar onOpenShortcuts={onOpenShortcuts} />
      <div className="flex flex-1 overflow-hidden">
        <div className={`transition-all duration-200 ease-in-out overflow-hidden shrink-0 ${sidebarOpen ? 'w-56' : 'w-0'}`}>
          <Sidebar />
        </div>
        {activeTab ? (
          activePage?.database
            ? <DatabasePage key={activeTab.pageId} pageId={activeTab.pageId} />
            : activePage?.boardMode
              ? <BoardView key={activeTab.pageId} pageId={activeTab.pageId} />
              : <PageView key={activeTab.pageId} pageId={activeTab.pageId} />
        ) : (
          <HomeScreen />
        )}
      </div>
      {paletteOpen && <CommandPalette onClose={onClosePalette} onOpenShortcuts={onOpenShortcuts} />}
      <BoardTemplateModal />
    </div>
  )
}
