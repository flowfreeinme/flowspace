import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { STARTER_TEMPLATES, type StarterTemplateId, type TemplateHomeMode } from '@/lib/starterTemplates'
import type { WorkspaceData, Page, Block, Tab, BlockType, HomeWidget, HomeWidgetType } from '@/types'
import type { WidgetConfigMap } from '@/types/widgetSettings'
import { loadWorkspace, saveWorkspace, saveTabState, loadTabState } from '@/lib/storage'
import { createDefaultWorkspace } from '@/lib/defaults'
import { supabase } from '@/lib/supabase'
import { getOrCreateKey } from '@/lib/crypto'
import { resolveActiveTabId, resolveSyncedActiveTabId, shouldRestoreMostRecentTab } from '@/lib/workspaceTabs'
import { deleteBlockFromPage } from '@/lib/workspaceBlocks'
import {
  addHomeWidget,
  autoArrangeHomeWidgets,
  DEFAULT_HOME_WIDGETS,
  mergeHomeWidgets,
  moveHomeWidget,
  normalizeHomeWidgets,
  removeHomeWidget,
  resizeHomeWidget,
  resizeHomeWidgetFromCorner,
  type HomeWidgetResizeCorner,
} from '@/lib/homeCenter'

interface WorkspaceStore extends WorkspaceData {
  initialized: boolean
  templatePickerOpen: boolean
  templatePickerParentId: string | null
  sidebarOpen: boolean
  cryptoKey: CryptoKey | null
  init: () => Promise<void>
  reset: () => void
  persist: () => void
  syncFromRemote: () => Promise<void>
  toggleSidebar: () => void

  // Pages
  createPage: (parentId?: string | null) => string
  createBoard: (parentId?: string | null) => string
  createFolder: (parentId?: string | null) => string
  updatePageTitle: (id: string, title: string) => void
  updatePageIcon: (id: string, icon: string) => void
  togglePageFavorite: (id: string) => void
  archivePage: (id: string) => void
  restorePage: (id: string) => void
  movePage: (id: string, parentId: string | null) => void
  deletePage: (id: string) => void

  // Blocks
  updateBlock: (pageId: string, blockId: string, changes: Partial<Block>) => void
  addBlock: (pageId: string, afterId: string, type?: BlockType) => string
  deleteBlock: (pageId: string, blockId: string) => void
  changeBlockType: (pageId: string, blockId: string, type: BlockType) => void

  // Tabs
  openTab: (pageId: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  setHomeActive: () => void

  // Home center
  updateHomeWidgets: (widgets: HomeWidget[]) => void
  addHomeCenterWidget: (type: HomeWidgetType) => void
  removeHomeCenterWidget: (id: string) => void
  moveHomeCenterWidget: (id: string, dx: number, dy: number) => void
  resizeHomeCenterWidget: (id: string, dw: number, dh: number) => void
  resizeHomeCenterWidgetFromCorner: (id: string, corner: HomeWidgetResizeCorner, dx: number, dy: number) => void
  autoArrangeHomeCenter: () => void
  resetHomeCenter: () => void
  updateWidgetSettings: <K extends HomeWidgetType>(type: K, patch: Partial<WidgetConfigMap[K]>) => void
  openTemplatePicker: (parentId?: string | null) => void
  closeTemplatePicker: () => void
  applyStarterTemplate: (templateId: StarterTemplateId, parentId?: string | null, homeMode?: TemplateHomeMode) => string
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let initInProgress = false
// Incremented by reset() so any in-flight init() knows it has been superseded
let initGeneration = 0

export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  initialized: false,
  templatePickerOpen: false,
  templatePickerParentId: null,
  sidebarOpen: true,
  cryptoKey: null,
  pages: {},
  rootPages: [],
  tabs: [],
  activeTabId: null,
  homeCenter: undefined,

  async init() {
    if (get().initialized || initInProgress) return
    initInProgress = true
    const gen = initGeneration

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { initInProgress = false; return }

    const cryptoKey = await getOrCreateKey(user.id)
    set({ cryptoKey })

    const data = await loadWorkspace(cryptoKey)
    // If reset() was called while we were awaiting, discard this load
    if (gen !== initGeneration) { initInProgress = false; return }
    const workspace = data ?? createDefaultWorkspace()

    // localStorage is saved synchronously on every persist() call (when tabs are
    // open), so it's always more up-to-date than the debounced Supabase/file save.
    // Prefer it; fall back to the workspace file/RPC data.
    const saved = await loadTabState(cryptoKey)
    const rawTabs: Tab[] =
      (saved?.tabs?.length ? saved.tabs : null) ??
      (workspace.tabs?.length ? workspace.tabs : null) ??
      []
    const hasSavedTabState = saved !== null

    // Drop tabs whose pages no longer exist in the loaded workspace
    const validTabs = rawTabs.filter(t => workspace.pages[t.pageId])

    // Resolve the active tab. A saved null means "home is active"; do not reopen
    // a page behind the user's back.
    let activeTabId = resolveActiveTabId({
      validTabs,
      savedActiveTabId: saved?.activeTabId,
      workspaceActiveTabId: workspace.activeTabId,
      hasSavedTabState,
    })

    // Last resort: if we have pages but ended up with no tabs, open the most
    // recently updated root page so the user never lands on a blank home screen
    if (shouldRestoreMostRecentTab({ activeTabId, rootPageCount: workspace.rootPages.length, hasSavedTabState })) {
      const mostRecent = workspace.rootPages
        .map(id => workspace.pages[id])
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
      if (mostRecent) {
        const tab: Tab = { id: uuid(), pageId: mostRecent.id }
        validTabs.push(tab)
        activeTabId = tab.id
      }
    }

    set({ ...workspace, tabs: validTabs, activeTabId, initialized: true })
    // Persist resolved tab state to localStorage immediately so the next reload
    // (e.g. browser tab discard) can restore without waiting for Supabase
    saveTabState(validTabs, activeTabId, cryptoKey).catch(() => {})
    initInProgress = false
  },

  reset() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    initInProgress = false
    initGeneration++
    try { localStorage.removeItem('flowspace_tab_state') } catch {}
    set({ initialized: false, cryptoKey: null, pages: {}, rootPages: [], tabs: [], activeTabId: null })
  },

  persist() {
    if (!get().initialized) return
    const { tabs, activeTabId, cryptoKey } = get()
    if (cryptoKey) saveTabState(tabs, activeTabId, cryptoKey).catch(() => {})
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      const { initialized, pages, rootPages, tabs, activeTabId, homeCenter, cryptoKey } = get()
      if (!initialized || !cryptoKey) return
      await saveWorkspace({ pages, rootPages, tabs, activeTabId, homeCenter }, cryptoKey)
    }, 500)
  },

  async syncFromRemote() {
    if (!get().initialized) return
    const { cryptoKey } = get()
    if (!cryptoKey) return
    const remote = await loadWorkspace(cryptoKey)
    if (!remote) return
    let syncedTabs: Tab[] = []
    let syncedActiveTabId: string | null = null
    set(s => {
      const validTabs = s.tabs.filter(t => remote.pages[t.pageId])
      const activeTabId = resolveSyncedActiveTabId({
        validTabs,
        currentActiveTabId: s.activeTabId,
      })
      syncedTabs = validTabs
      syncedActiveTabId = activeTabId
      return { pages: remote.pages, rootPages: remote.rootPages, tabs: validTabs, activeTabId, homeCenter: remote.homeCenter }
    })
    saveTabState(syncedTabs, syncedActiveTabId, cryptoKey).catch(() => {})
  },

  createPage(parentId = null) {
    const id = uuid()
    const page: Page = {
      id,
      title: 'Untitled',
      icon: '📄',
      blocks: [{ id: uuid(), type: 'text', content: '' }],
      children: [],
      parentId: parentId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set(s => {
      const pages = { ...s.pages, [id]: page }
      const rootPages = parentId ? s.rootPages : [...s.rootPages, id]
      if (parentId && s.pages[parentId]) {
        pages[parentId] = { ...pages[parentId], children: [...pages[parentId].children, id] }
      }
      return { pages, rootPages }
    })
    get().persist()
    return id
  },

  createBoard(parentId = null) {
    const id = uuid()
    const page: Page = {
      id,
      title: 'Untitled board',
      icon: '🗃️',
      blocks: [],
      children: [],
      parentId: parentId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      boardMode: true,
    }
    set(s => {
      const pages = { ...s.pages, [id]: page }
      const rootPages = parentId ? s.rootPages : [...s.rootPages, id]
      if (parentId && s.pages[parentId]) {
        pages[parentId] = { ...pages[parentId], children: [...pages[parentId].children, id] }
      }
      return { pages, rootPages }
    })
    get().persist()
    return id
  },

  createFolder(parentId = null) {
    const id = uuid()
    const folder: Page = {
      id,
      title: 'New folder',
      icon: '📁',
      blocks: [],
      children: [],
      parentId: parentId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folder: true,
    }
    set(s => {
      const pages = { ...s.pages, [id]: folder }
      const rootPages = parentId ? s.rootPages : [...s.rootPages, id]
      if (parentId && s.pages[parentId]) {
        pages[parentId] = { ...pages[parentId], children: [...pages[parentId].children, id], updatedAt: Date.now() }
      }
      return { pages, rootPages }
    })
    get().persist()
    return id
  },

  updatePageTitle(id, title) {
    set(s => ({ pages: { ...s.pages, [id]: { ...s.pages[id], title, updatedAt: Date.now() } } }))
    get().persist()
  },

  updatePageIcon(id, icon) {
    set(s => ({ pages: { ...s.pages, [id]: { ...s.pages[id], icon, updatedAt: Date.now() } } }))
    get().persist()
  },

  togglePageFavorite(id) {
    set(s => {
      const page = s.pages[id]
      if (!page) return s
      return { pages: { ...s.pages, [id]: { ...page, favorite: !page.favorite, updatedAt: Date.now() } } }
    })
    get().persist()
  },

  archivePage(id) {
    set(s => {
      const pages = { ...s.pages }
      const page = pages[id]
      if (!page) return s
      const toArchive = new Set<string>()
      const collect = (pid: string) => {
        toArchive.add(pid)
        pages[pid]?.children.forEach(collect)
      }
      collect(id)
      toArchive.forEach(pid => {
        const current = pages[pid]
        if (current) pages[pid] = { ...current, archived: true, updatedAt: Date.now() }
      })
      const tabs = s.tabs.filter(t => !toArchive.has(t.pageId))
      const activeTabId = s.activeTabId && tabs.some(t => t.id === s.activeTabId)
        ? s.activeTabId
        : (tabs[tabs.length - 1]?.id ?? null)
      return { pages, tabs, activeTabId }
    })
    get().persist()
  },

  restorePage(id) {
    set(s => {
      const pages = { ...s.pages }
      const page = pages[id]
      if (!page) return s
      const toRestore = new Set<string>()
      const collect = (pid: string) => {
        toRestore.add(pid)
        pages[pid]?.children.forEach(collect)
      }
      collect(id)
      toRestore.forEach(pid => {
        const current = pages[pid]
        if (current) pages[pid] = { ...current, archived: false, updatedAt: Date.now() }
      })
      return { pages }
    })
    get().persist()
  },

  movePage(id, parentId) {
    if (id === parentId) return
    set(s => {
      const page = s.pages[id]
      if (!page) return s
      if (parentId && !s.pages[parentId]?.folder) return s

      const isDescendantOfPage = (candidateId: string): boolean => {
        const current = s.pages[id]
        if (!current) return false
        const walk = (pid: string): boolean => {
          const page = s.pages[pid]
          if (!page) return false
          if (page.children.includes(candidateId)) return true
          return page.children.some(walk)
        }
        return walk(id)
      }
      if (parentId && isDescendantOfPage(parentId)) return s

      const pages = { ...s.pages }
      let rootPages = s.rootPages.filter(pid => pid !== id)
      if (page.parentId && pages[page.parentId]) {
        pages[page.parentId] = {
          ...pages[page.parentId],
          children: pages[page.parentId].children.filter(childId => childId !== id),
          updatedAt: Date.now(),
        }
      }
      if (parentId) {
        pages[parentId] = {
          ...pages[parentId],
          children: pages[parentId].children.includes(id) ? pages[parentId].children : [...pages[parentId].children, id],
          updatedAt: Date.now(),
        }
      } else if (!rootPages.includes(id)) {
        rootPages = [...rootPages, id]
      }
      pages[id] = { ...page, parentId, updatedAt: Date.now() }
      return { pages, rootPages }
    })
    get().persist()
  },

  deletePage(id) {
    set(s => {
      const pages = { ...s.pages }
      const page = pages[id]
      if (!page) return s

      // Remove from parent or root
      const rootPages = s.rootPages.filter(p => p !== id)
      if (page.parentId && pages[page.parentId]) {
        pages[page.parentId] = {
          ...pages[page.parentId],
          children: pages[page.parentId].children.filter(c => c !== id),
        }
      }

      // Recursively collect ids to delete
      const toDelete = new Set<string>()
      const collect = (pid: string) => {
        toDelete.add(pid)
        pages[pid]?.children.forEach(collect)
      }
      collect(id)
      toDelete.forEach(pid => delete pages[pid])

      // Close tabs for deleted pages
      const tabs = s.tabs.filter(t => !toDelete.has(t.pageId))
      const activeTabId = toDelete.has(
        s.tabs.find(t => t.id === s.activeTabId)?.pageId ?? ''
      )
        ? (tabs[0]?.id ?? null)
        : s.activeTabId

      return { pages, rootPages, tabs, activeTabId }
    })
    get().persist()
  },

  updateBlock(pageId, blockId, changes) {
    set(s => {
      const page = s.pages[pageId]
      if (!page) return s
      const blocks = page.blocks.map(b => b.id === blockId ? { ...b, ...changes } : b)
      return { pages: { ...s.pages, [pageId]: { ...page, blocks, updatedAt: Date.now() } } }
    })
    get().persist()
  },

  addBlock(pageId, afterId, type = 'text') {
    const id = uuid()
    set(s => {
      const page = s.pages[pageId]
      if (!page) return s
      const idx = page.blocks.findIndex(b => b.id === afterId)
      const newBlock: Block = { id, type, content: '' }
      const blocks = [...page.blocks]
      blocks.splice(idx + 1, 0, newBlock)
      return { pages: { ...s.pages, [pageId]: { ...page, blocks, updatedAt: Date.now() } } }
    })
    get().persist()
    return id
  },

  deleteBlock(pageId, blockId) {
    set(s => {
      const page = s.pages[pageId]
      if (!page) return s
      const nextPage = deleteBlockFromPage(page, blockId)
      if (!nextPage) return s
      return { pages: { ...s.pages, [pageId]: nextPage } }
    })
    get().persist()
  },

  changeBlockType(pageId, blockId, type) {
    set(s => {
      const page = s.pages[pageId]
      if (!page) return s
      const blocks = page.blocks.map(b => b.id === blockId ? { ...b, type } : b)
      return { pages: { ...s.pages, [pageId]: { ...page, blocks, updatedAt: Date.now() } } }
    })
    get().persist()
  },

  openTab(pageId) {
    const existing = get().tabs.find(t => t.pageId === pageId)
    if (existing) {
      set(s => ({
        activeTabId: existing.id,
        pages: s.pages[pageId]
          ? { ...s.pages, [pageId]: { ...s.pages[pageId], lastOpenedAt: Date.now() } }
          : s.pages,
      }))
      get().persist()
      return
    }
    const tab: Tab = { id: uuid(), pageId }
    set(s => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
      pages: s.pages[pageId]
        ? { ...s.pages, [pageId]: { ...s.pages[pageId], lastOpenedAt: Date.now() } }
        : s.pages,
    }))
    get().persist()
  },

  closeTab(tabId) {
    set(s => {
      const tabs = s.tabs.filter(t => t.id !== tabId)
      const activeTabId =
        s.activeTabId === tabId ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId
      return { tabs, activeTabId }
    })
    get().persist()
  },

  setActiveTab(tabId) {
    set(s => {
      const tab = s.tabs.find(t => t.id === tabId)
      if (!tab || !s.pages[tab.pageId]) return { activeTabId: tabId }
      return {
        activeTabId: tabId,
        pages: { ...s.pages, [tab.pageId]: { ...s.pages[tab.pageId], lastOpenedAt: Date.now() } },
      }
    })
    get().persist()
  },

  setHomeActive() {
    set({ activeTabId: null })
    get().persist()
  },

  updateHomeWidgets(widgets) {
    set(s => ({ homeCenter: { ...s.homeCenter, widgets: normalizeHomeWidgets(widgets) } }))
    get().persist()
  },

  addHomeCenterWidget(type) {
    set(s => ({
      homeCenter: {
        ...s.homeCenter,
        widgets: addHomeWidget(s.homeCenter?.widgets ?? DEFAULT_HOME_WIDGETS, type),
      },
    }))
    get().persist()
  },

  removeHomeCenterWidget(id) {
    set(s => ({
      homeCenter: {
        ...s.homeCenter,
        widgets: removeHomeWidget(s.homeCenter?.widgets ?? DEFAULT_HOME_WIDGETS, id),
      },
    }))
    get().persist()
  },

  moveHomeCenterWidget(id, dx, dy) {
    set(s => ({
      homeCenter: {
        ...s.homeCenter,
        widgets: moveHomeWidget(s.homeCenter?.widgets ?? DEFAULT_HOME_WIDGETS, id, dx, dy),
      },
    }))
    get().persist()
  },

  resizeHomeCenterWidget(id, dw, dh) {
    set(s => ({
      homeCenter: {
        ...s.homeCenter,
        widgets: resizeHomeWidget(s.homeCenter?.widgets ?? DEFAULT_HOME_WIDGETS, id, dw, dh),
      },
    }))
    get().persist()
  },

  resizeHomeCenterWidgetFromCorner(id, corner, dx, dy) {
    set(s => ({
      homeCenter: {
        ...s.homeCenter,
        widgets: resizeHomeWidgetFromCorner(s.homeCenter?.widgets ?? DEFAULT_HOME_WIDGETS, id, corner, dx, dy),
      },
    }))
    get().persist()
  },

  autoArrangeHomeCenter() {
    set(s => ({
      homeCenter: {
        ...s.homeCenter,
        widgets: autoArrangeHomeWidgets(s.homeCenter?.widgets ?? DEFAULT_HOME_WIDGETS),
      },
    }))
    get().persist()
  },

  resetHomeCenter() {
    set({ homeCenter: { widgets: DEFAULT_HOME_WIDGETS } })
    get().persist()
  },

  updateWidgetSettings(type, patch) {
    set(s => {
      const hc = s.homeCenter ?? { widgets: [] }
      const current = hc.widgetSettings?.[type] ?? {}
      return {
        homeCenter: {
          ...hc,
          widgetSettings: {
            ...hc.widgetSettings,
            [type]: { ...current, ...patch },
          },
        },
      }
    })
    get().persist()
  },

  toggleSidebar() {
    set(s => ({ sidebarOpen: !s.sidebarOpen }))
  },

  openTemplatePicker(parentId = null) {
    set({ templatePickerOpen: true, templatePickerParentId: parentId ?? null })
  },

  closeTemplatePicker() {
    set({ templatePickerOpen: false, templatePickerParentId: null })
  },

  applyStarterTemplate(templateId, parentId = null, homeMode = 'merge') {
    const template = STARTER_TEMPLATES.find(t => t.id === templateId)
    if (!template) throw new Error(`Unknown template: ${templateId}`)

    const now = Date.now()
    const entries: Array<[string, Page]> = template.buildBoards().map(def => {
      const id = uuid()
      return [id, {
        id,
        title: def.title,
        icon: def.icon,
        blocks: def.blocks,
        children: [],
        parentId: parentId ?? null,
        createdAt: now,
        updatedAt: now,
        boardMode: true as const,
      }]
    })

    set(s => {
      const newPages = Object.fromEntries(entries)
      const pages = { ...s.pages, ...newPages }
      const newIds = entries.map(([id]) => id)
      const rootPages = parentId ? s.rootPages : [...s.rootPages, ...newIds]

      if (parentId && pages[parentId]) {
        pages[parentId] = {
          ...pages[parentId],
          children: [...pages[parentId].children, ...newIds],
          updatedAt: now,
        }
      }

      const shouldApplyHome = template.widgets.length > 0 && homeMode !== 'none'
      const prevWidgets = s.homeCenter?.widgets ?? DEFAULT_HOME_WIDGETS
      const prevSettings = s.homeCenter?.widgetSettings ?? {}
      const mergedSettings = { ...prevSettings }

      if (shouldApplyHome && template.widgetSettings) {
        for (const [key, patch] of Object.entries(template.widgetSettings)) {
          const k = key as keyof WidgetConfigMap
          mergedSettings[k] = { ...(prevSettings[k] ?? {}), ...(patch ?? {}) } as never
        }
      }

      return {
        pages,
        rootPages,
        homeCenter: shouldApplyHome
          ? {
            ...s.homeCenter,
            widgets: homeMode === 'replace' ? normalizeHomeWidgets(template.widgets) : mergeHomeWidgets(prevWidgets, template.widgets),
            widgetSettings: mergedSettings,
          }
          : s.homeCenter,
      }
    })
    get().persist()
    return entries[0][0]
  },
}))
