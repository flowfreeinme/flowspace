export type MobileTab = 'home' | 'boards' | 'search'
export type MobilePanel = 'none' | 'boards' | 'search'

export function getActiveMobileTab(state: {
  activeTabId: string | null
  panel: MobilePanel
}): MobileTab | null {
  if (state.panel === 'boards') return 'boards'
  if (state.panel === 'search') return 'search'
  if (state.activeTabId === null) return 'home'
  return null
}
