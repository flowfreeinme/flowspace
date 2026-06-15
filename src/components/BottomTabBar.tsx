import { Home, LayoutGrid, Search, Plus } from 'lucide-react'
import type { MobileTab } from '@/lib/mobileTabs'

interface BottomTabBarProps {
  active: MobileTab | null
  onHome: () => void
  onBoards: () => void
  onSearch: () => void
  onNew: () => void
}

export default function BottomTabBar({ active, onHome, onBoards, onSearch, onNew }: BottomTabBarProps) {
  return (
    <nav className="mobile-bottom-nav shrink-0 bg-surface-1 border-t border-surface-3 flex items-stretch justify-around relative z-30">
      <TabButton label="Home" active={active === 'home'} onClick={onHome}>
        <Home size={20} />
      </TabButton>
      <TabButton label="Boards" active={active === 'boards'} onClick={onBoards}>
        <LayoutGrid size={20} />
      </TabButton>
      <TabButton label="Search" active={active === 'search'} onClick={onSearch}>
        <Search size={20} />
      </TabButton>
      <button
        onClick={onNew}
        aria-label="New"
        className="focus-ring flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-1.5 text-gray-500 transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-[var(--shadow-accent)]" style={{ backgroundImage: 'var(--accent-gradient)' }}>
          <Plus size={18} />
        </span>
        <span className="text-[10px] font-medium">New</span>
      </button>
    </nav>
  )
}

function TabButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`focus-ring flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors ${
        active ? 'text-accent' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
