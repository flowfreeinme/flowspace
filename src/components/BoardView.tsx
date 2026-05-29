import { useRef, useState, useEffect, useCallback } from 'react'
import { X, Lasso, Pencil, Type, Paperclip, Trash2, Sparkles, Bold, Italic, Underline, Strikethrough, Highlighter, LayoutGrid, LayoutDashboard, ChevronRight } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useWorkspace } from '@/stores/workspace'
import { useAuth } from '@/stores/auth'
import { uploadToR2 } from '@/lib/r2'
import { useNotifications } from '@/stores/notifications'
import { useBoardCollab } from '@/hooks/useBoardCollab'
import { useSharing } from '@/stores/sharing'
import { useCalendar } from '@/stores/calendar'
import DrawingCanvas from './DrawingCanvas'
import AiPanel from './AiPanel'
import type { AiAction, WorkspaceContext } from '@/lib/aiTypes'
import { clampFontSize, dispatchCardEditorInput, findCardEditorFromSelection, normalizeLinkUrl, runRichTextCommand } from '@/lib/richTextEditor'
import BoardCard from './BoardCard'
import BoardSection from './BoardSection'
import BoardImageCard from './BoardImageCard'
import BoardToolbox from './BoardToolbox'
import KanbanBlock from './blocks/KanbanBlock'
import FlowchartBlock from './blocks/FlowchartBlock'
import TimelineBlock from './blocks/TimelineBlock'
import BoardWidgetBlock from './blocks/BoardWidgetBlock'
import {
  parseKanban, parseFlowchart, parseTimeline,
  defaultKanban, defaultFlowchart, defaultTimeline,
} from '@/lib/workflowBlocks'
import { buildTodoContext, buildWorkflowContext, formatCalendarEventsForAi } from '@/lib/aiContext'
import {
  BOARD_WIDGET_MIN_HEIGHT,
  BOARD_WIDGET_MIN_WIDTH,
  BOARD_WIDGET_TYPES,
  defaultBoardWidget,
  getBoardWidgetMeta,
  parseBoardWidget,
  type BoardWidgetType,
} from '@/lib/boardWidgets'
import { createWorkflowBlockFromAiAction } from '@/lib/aiWorkflowActions'


// ── types ──────────────────────────────────────────────────────────────────
interface CardData   { text: string; x: number; y: number; width: number; height: number }
interface SectionData { title: string; x: number; y: number }
interface ImageData  { url: string; x: number; y: number; width: number; height: number }
interface Pt { x: number; y: number }
interface BBox { x: number; y: number; w: number; h: number }

type Tool = 'pan' | 'lasso'

type DragOp =
  | { kind: 'pan';         mx0: number; my0: number; px0: number; py0: number }
  | { kind: 'card';        id: string;  mx0: number; my0: number; cx0: number; cy0: number }
  | { kind: 'section';     id: string;  mx0: number; my0: number; cx0: number; cy0: number }
  | { kind: 'image';       id: string;  mx0: number; my0: number; cx0: number; cy0: number }
  | { kind: 'resize';      id: string; handle: string; mx0: number; my0: number; cx0: number; cy0: number; w0: number; h0: number }
  | { kind: 'lasso' }
  | { kind: 'lasso-move';  mx0: number; my0: number; ids: string[]; origins: Record<string, Pt> }
  | { kind: 'lasso-resize'; handle: string; mx0: number; my0: number; bbox0: BBox; items0: Record<string, { x: number; y: number; w?: number; h?: number }> }
  | { kind: 'workflow'; id: string; mx0: number; my0: number; cx0: number; cy0: number }
  | { kind: 'workflow-resize'; id: string; handle: string; mx0: number; my0: number; cx0: number; cy0: number; w0: number; h0: number }
  | { kind: 'board-widget'; id: string; mx0: number; my0: number; cx0: number; cy0: number }
  | { kind: 'board-widget-resize'; id: string; handle: string; mx0: number; my0: number; cx0: number; cy0: number; w0: number; h0: number }

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3
const CARD_W = 280
const CARD_H = 140
const EMOJIS = ['📄','📝','📋','📌','⭐','🎯','💡','🔥','✅','📊','🗂️','🚀','💬','🎨','📅','🔖']
const SECTION_W = 280
const SECTION_H = 36

function parseCard(c: string): CardData {
  try { const d = JSON.parse(c) as CardData; if (typeof d.x === 'number') return d } catch {}
  return { text: c, x: 0, y: 260, width: CARD_W, height: CARD_H }
}
function parseSection(c: string): SectionData {
  try { const d = JSON.parse(c) as SectionData; if (typeof d.x === 'number') return d } catch {}
  return { title: 'Section', x: 0, y: 260 }
}
function parseImage(c: string): ImageData {
  try { const d = JSON.parse(c) as ImageData; if (typeof d.x === 'number') return d } catch {}
  return { url: '', x: 0, y: 260, width: 320, height: 220 }
}

// Ray-casting point-in-polygon
function pointInPolygon(px: number, py: number, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const { x: xi, y: yi } = poly[i], { x: xj, y: yj } = poly[j]
    if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// True if any corner or center of rect is inside polygon
function polyHitsRect(poly: Pt[], rx: number, ry: number, rw: number, rh: number): boolean {
  const pts: Pt[] = [
    { x: rx, y: ry }, { x: rx + rw, y: ry }, { x: rx, y: ry + rh }, { x: rx + rw, y: ry + rh },
    { x: rx + rw / 2, y: ry + rh / 2 },
  ]
  return pts.some(p => pointInPolygon(p.x, p.y, poly))
}

// ── BoardView ──────────────────────────────────────────────────────────────
export default function BoardView({ pageId }: { pageId: string }) {
  const { pages, updatePageTitle, updatePageIcon, updateBlock, deleteBlock } = useWorkspace()
  const allPagesMap = useWorkspace(s => s.pages)
  const calendarEvents = useCalendar(s => s.events)
  const { user } = useAuth()
  const notify = useNotifications(s => s.add)
  const page = pages[pageId]
  const { collaborators, broadcastBlocks } = useBoardCollab(pageId, user?.id ?? '', user?.email ?? '')
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef    = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const attachRef   = useRef<HTMLInputElement>(null)

  const [zoom, setZoom] = useState(1)
  const [pan,  setPan]  = useState<Pt>({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panRef  = useRef<Pt>({ x: 0, y: 0 })
  const dragOp  = useRef<DragOp | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const [activeTool,  setActiveTool]  = useState<Tool>('pan')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [ctxMenu,     setCtxMenu]     = useState<{ sx: number; sy: number; cx: number; cy: number } | null>(null)
  const [ctxSubmenu,  setCtxSubmenu]  = useState<'widgets' | null>(null)
  const [aiPanel,     setAiPanel]     = useState<{ sx: number; sy: number } | null>(null)
  const [showDraw,    setShowDraw]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [cardEditing, setCardEditing] = useState(false)
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false, align: 'left', size: 3 })
  const [activePicker, setActivePicker] = useState<'text' | 'highlight' | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null)
  const [linkVal, setLinkVal] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [workflowMenu, setWorkflowMenu] = useState(false)
  const [widgetMenu, setWidgetMenu] = useState(false)
  const appliedColorRef = useRef('#e5e7eb')
  const appliedHighlightRef = useRef('transparent')
  const savedSelectionRef = useRef<Range | null>(null)

  // Lasso path stored in a ref (for closure access) + state (for SVG re-render)
  const lassoPathRef = useRef<Pt[]>([])
  const [lassoPath, setLassoPath] = useState<Pt[] | null>(null)

  // ── sync title on board switch ──
  useEffect(() => {
    if (titleRef.current && titleRef.current.textContent !== page?.title)
      titleRef.current.textContent = page?.title ?? ''
  }, [pageId])

  // ── card text editor toolbar state ──
  useEffect(() => {
    function isCardEditor(el: Element | null) {
      return el instanceof HTMLElement && el.dataset.cardEditor === 'true'
    }
    function onFocusIn(e: FocusEvent) {
      if (isCardEditor(e.target as Element)) setCardEditing(true)
    }
    function onFocusOut(e: FocusEvent) {
      if (isCardEditor(e.target as Element)) {
        setTimeout(() => {
          const active = document.activeElement
          if (!isCardEditor(active) && !toolbarRef.current?.contains(active)) setCardEditing(false)
        }, 100)
      }
    }
    function onSelChange() {
      const sel = window.getSelection()
      if (isCardEditor(sel?.anchorNode?.parentElement ?? null) || isCardEditor(sel?.anchorNode as Element)) {
        const rawSize = document.queryCommandValue('fontSize')
        setFmt({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strike: document.queryCommandState('strikeThrough'),
          align: document.queryCommandState('justifyCenter') ? 'center'
            : document.queryCommandState('justifyRight') ? 'right'
            : document.queryCommandState('justifyFull') ? 'full' : 'left',
          size: clampFontSize(rawSize || 3),
        })
      }
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('selectionchange', onSelChange)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('selectionchange', onSelChange)
    }
  }, [])

  // ── close toolbar dropdowns on click outside ──
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setActivePicker(null)
        setShowLinkInput(false)
        setShowShortcuts(false)
        setPopoverPos(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ── card editor keyboard shortcuts ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!cardEditing) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'k') { e.preventDefault(); setShowLinkInput(v => !v) }
      if (mod && e.shiftKey && e.key === '7') { e.preventDefault(); runRichTextCommand('insertOrderedList') }
      if (mod && e.shiftKey && e.key === '8') { e.preventDefault(); runRichTextCommand('insertUnorderedList') }
      if (mod && e.key === ']') { e.preventDefault(); runRichTextCommand('indent') }
      if (mod && e.key === '[') { e.preventDefault(); runRichTextCommand('outdent') }
      if (mod && e.shiftKey && e.key === 'e') { e.preventDefault(); runRichTextCommand('justifyCenter') }
      if (mod && e.shiftKey && e.key === 'l') { e.preventDefault(); runRichTextCommand('justifyLeft') }
      if (mod && e.shiftKey && e.key === 'r') { e.preventDefault(); runRichTextCommand('justifyRight') }
      if (e.key === 'Escape') { setShowLinkInput(false); setActivePicker(null); setShowShortcuts(false) }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [cardEditing])

  // ── fit all content into view (pan + zoom) ──
  function fitToContent() {
    const el = viewportRef.current; if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const blocks = useWorkspace.getState().pages[pageId]?.blocks ?? []
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const b of blocks) {
      if (b.type === 'textbox') {
        const d = parseCard(b.content)
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
        maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
      } else if (b.type === 'section') {
        const d = parseSection(b.content)
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
        maxX = Math.max(maxX, d.x + SECTION_W); maxY = Math.max(maxY, d.y + SECTION_H)
      } else if (b.type === 'image') {
        const d = parseImage(b.content)
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
        maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
      } else if (b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline') {
        const parse = b.type === 'kanban' ? parseKanban : b.type === 'flowchart' ? parseFlowchart : parseTimeline
        const d = parse(b.content)
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
        maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
      } else if (b.type === 'boardWidget') {
        const d = parseBoardWidget(b.content)
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
        maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
      }
    }
    if (isFinite(minX)) {
      const PAD = 60
      const cw = maxX - minX + PAD * 2, ch = maxY - minY + PAD * 2
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(width / cw, height / ch)))
      const px = (width  - cw * scale) / 2 - (minX - PAD) * scale
      const py = (height - ch * scale) / 2 - (minY - PAD) * scale
      zoomRef.current = scale; panRef.current = { x: px, y: py }; setZoom(scale); setPan({ x: px, y: py })
    } else {
      // empty board: place first card in upper-center
      const p = { x: width / 2 - CARD_W / 2, y: 40 }
      zoomRef.current = 1; panRef.current = p; setZoom(1); setPan(p)
    }
  }

  // ── fit view on board switch ──
  useEffect(() => { fitToContent() }, [pageId])

  useEffect(() => { setSelectedIds(new Set()) }, [pageId])

  // ── broadcast block changes to collaborators + keep shared snapshot fresh ──
  const { syncSharedPage, myShares } = useSharing()
  useEffect(() => {
    if (!page?.blocks || !user) return
    broadcastBlocks(page.blocks)
    // Owner: debounce-sync page_shares.page_data so late-joining recipients get latest state
    if (myShares[pageId]?.length) {
      if (syncTimer.current) clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => syncSharedPage(page, user.id), 1500)
    }
  }, [page?.blocks])

  // ── context menu dismiss ──
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => { setCtxMenu(null); setCtxSubmenu(null) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('mousedown', close); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', onKey) }
  }, [ctxMenu])

  // ── workflow submenu dismiss ──
  useEffect(() => {
    if (!workflowMenu && !widgetMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWorkflowMenu(false)
        setWidgetMenu(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [workflowMenu, widgetMenu])

  // ── keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).isContentEditable) return
      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size) {
        selectedIds.forEach(id => deleteBlock(pageId, id)); setSelectedIds(new Set()); return
      }
      // Cmd/Ctrl+A — select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        const p = useWorkspace.getState().pages[pageId]
        if (p) setSelectedIds(new Set(p.blocks.filter(b => b.type === 'textbox' || b.type === 'section' || b.type === 'image' || b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline' || b.type === 'boardWidget').map(b => b.id)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, pageId, deleteBlock])

  const cards    = (page?.blocks ?? []).filter(b => b.type === 'textbox').map(b => ({ id: b.id, data: parseCard(b.content) }))
  const sections = (page?.blocks ?? []).filter(b => b.type === 'section').map(b => ({ id: b.id, data: parseSection(b.content) }))
  const images   = (page?.blocks ?? []).filter(b => b.type === 'image').map(b => ({ id: b.id, data: parseImage(b.content) }))
  const workflowBlocks = (page?.blocks ?? []).filter(b => b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline')
  const boardWidgetBlocks = (page?.blocks ?? []).filter(b => b.type === 'boardWidget')

  const now = new Date()
  const activeContextPages = Object.values(allPagesMap)
    .filter(p => !p.folder && !p.archived)
    .sort((a, b) => (a.id === pageId ? -1 : b.id === pageId ? 1 : (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt)))
    .slice(0, 8)
  const workspaceContext: WorkspaceContext = {
    mode: 'board',
    board: {
      title: page?.title ?? '',
      sections: sections.map(s => ({ title: s.data.title || '' })),
      cards: cards.map(c => ({ text: (c.data.text || '').replace(/<[^>]*>/g, '') })),
    },
    allBoards: Object.values(allPagesMap)
      .filter(p => p.boardMode && p.id !== pageId)
      .map(p => ({
        title: p.title,
        sections: p.blocks
          .filter(b => b.type === 'section')
          .map(b => { try { return JSON.parse(b.content).title || '' } catch { return '' } })
          .filter(Boolean),
      })),
    calendar: formatCalendarEventsForAi(calendarEvents, now),
    workflows: buildWorkflowContext(activeContextPages).slice(0, 12),
    todos: buildTodoContext(activeContextPages).slice(0, 12),
  }

  // ── auto-create first card ──
  useEffect(() => {
    if (!page || page.blocks.some(b => b.type === 'textbox' || b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline' || b.type === 'boardWidget')) return
    const id = uuid()
    const data: CardData = { text: '', x: 0, y: 260, width: CARD_W, height: CARD_H }
    useWorkspace.setState(s => ({
      pages: { ...s.pages, [pageId]: { ...page, blocks: [{ id, type: 'textbox' as const, content: JSON.stringify(data) }], updatedAt: Date.now() } },
    })); useWorkspace.getState().persist()
  }, [pageId])

  // ── wheel zoom ──
  useEffect(() => {
    const el = viewportRef.current; if (!el) return
    const onWheel = (e: WheelEvent) => {
      // let scroll events inside card text areas reach the overflow-auto container
      const target = e.target as HTMLElement
      const scrollable = target.closest('.overflow-auto')
      if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const oldZ = zoomRef.current
      const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * factor))
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top
      const np = { x: cx - (cx - panRef.current.x) * (newZ / oldZ), y: cy - (cy - panRef.current.y) * (newZ / oldZ) }
      zoomRef.current = newZ; panRef.current = np; setZoom(newZ); setPan(np)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── touch pan + pinch-to-zoom ──
  useEffect(() => {
    const el = viewportRef.current; if (!el) return
    const viewport = el

    let lastTouchDist: number | null = null
    let lastSingleTouch: { x: number; y: number } | null = null

    function getTouchDist(touches: TouchList): number {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.hypot(dx, dy)
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        lastTouchDist = null
      } else if (e.touches.length === 2) {
        lastTouchDist = getTouchDist(e.touches)
        lastSingleTouch = null
        e.preventDefault()
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1 && lastSingleTouch) {
        const dx = e.touches[0].clientX - lastSingleTouch.x
        const dy = e.touches[0].clientY - lastSingleTouch.y
        const np = { x: panRef.current.x + dx, y: panRef.current.y + dy }
        panRef.current = np; setPan(np)
        lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        e.preventDefault()
      } else if (e.touches.length === 2 && lastTouchDist !== null) {
        const newDist = getTouchDist(e.touches)
        const factor = newDist / lastTouchDist
        lastTouchDist = newDist

        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const rect = viewport.getBoundingClientRect()
        const cx = midX - rect.left, cy = midY - rect.top
        const oldZ = zoomRef.current
        const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * factor))
        const np = { x: cx - (cx - panRef.current.x) * (newZ / oldZ), y: cy - (cy - panRef.current.y) * (newZ / oldZ) }
        zoomRef.current = newZ; panRef.current = np; setZoom(newZ); setPan(np)
        e.preventDefault()
      }
    }

    function onTouchEnd() {
      lastSingleTouch = null
      lastTouchDist = null
    }

    viewport.addEventListener('touchstart', onTouchStart, { passive: false })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', onTouchEnd)
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // ── compute selection bounding box (canvas coords) ──
  const selBBox: BBox | null = (() => {
    if (!selectedIds.size) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    page?.blocks.forEach(b => {
      if (!selectedIds.has(b.id)) return
      if (b.type === 'textbox') { const d = parseCard(b.content); minX = Math.min(minX, d.x); minY = Math.min(minY, d.y); maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height) }
      else if (b.type === 'section') { const d = parseSection(b.content); minX = Math.min(minX, d.x); minY = Math.min(minY, d.y); maxX = Math.max(maxX, d.x + SECTION_W); maxY = Math.max(maxY, d.y + SECTION_H) }
      else if (b.type === 'image') { const d = parseImage(b.content); minX = Math.min(minX, d.x); minY = Math.min(minY, d.y); maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height) }
      else if (b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline') {
        const parse = b.type === 'kanban' ? parseKanban : b.type === 'flowchart' ? parseFlowchart : parseTimeline
        const d = parse(b.content)
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
        maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
      } else if (b.type === 'boardWidget') {
        const d = parseBoardWidget(b.content)
        minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
        maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
      }
    })
    if (!isFinite(minX)) return null
    const pad = 10
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
  })()

  // ── mouse move ──
  const onMouseMove = useCallback((e: MouseEvent) => {
    const op = dragOp.current; if (!op) return

    if (op.kind === 'pan') {
      const np = { x: op.px0 + (e.clientX - op.mx0), y: op.py0 + (e.clientY - op.my0) }
      panRef.current = np; setPan(np); return
    }

    if (op.kind === 'lasso') {
      const vp = viewportRef.current?.getBoundingClientRect(); if (!vp) return
      const pt: Pt = { x: (e.clientX - vp.left - panRef.current.x) / zoomRef.current, y: (e.clientY - vp.top - panRef.current.y) / zoomRef.current }
      const last = lassoPathRef.current[lassoPathRef.current.length - 1]
      if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) * zoomRef.current > 4) {
        lassoPathRef.current = [...lassoPathRef.current, pt]
        setLassoPath([...lassoPathRef.current])
      }
      return
    }

    if (op.kind === 'lasso-move') {
      const dx = (e.clientX - op.mx0) / zoomRef.current, dy = (e.clientY - op.my0) / zoomRef.current
      op.ids.forEach(id => {
        const origin = op.origins[id]; if (!origin) return
        const block = useWorkspace.getState().pages[pageId]?.blocks.find(b => b.id === id); if (!block) return
        if (block.type === 'textbox') updateBlock(pageId, id, { content: JSON.stringify({ ...parseCard(block.content), x: origin.x + dx, y: origin.y + dy }) })
        else if (block.type === 'section') updateBlock(pageId, id, { content: JSON.stringify({ ...parseSection(block.content), x: origin.x + dx, y: origin.y + dy }) })
        else if (block.type === 'image') updateBlock(pageId, id, { content: JSON.stringify({ ...parseImage(block.content), x: origin.x + dx, y: origin.y + dy }) })
        else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
          const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
          updateBlock(pageId, id, { content: JSON.stringify({ ...parse(block.content), x: origin.x + dx, y: origin.y + dy }) })
        } else if (block.type === 'boardWidget') {
          updateBlock(pageId, id, { content: JSON.stringify({ ...parseBoardWidget(block.content), x: origin.x + dx, y: origin.y + dy }) })
        }
      }); return
    }

    if (op.kind === 'lasso-resize') {
      const dx = (e.clientX - op.mx0) / zoomRef.current, dy = (e.clientY - op.my0) / zoomRef.current
      const b0 = op.bbox0
      let newX = b0.x, newY = b0.y, newW = b0.w, newH = b0.h
      const h = op.handle
      if (h.includes('e')) newW = Math.max(60, b0.w + dx)
      if (h.includes('s')) newH = Math.max(60, b0.h + dy)
      if (h.includes('w')) { newW = Math.max(60, b0.w - dx); newX = b0.x + b0.w - newW }
      if (h.includes('n')) { newH = Math.max(60, b0.h - dy); newY = b0.y + b0.h - newH }
      const sx = newW / b0.w, sy = newH / b0.h
      Object.entries(op.items0).forEach(([id, orig]) => {
        const block = useWorkspace.getState().pages[pageId]?.blocks.find(b => b.id === id); if (!block) return
        const relX = orig.x - b0.x, relY = orig.y - b0.y
        const nx = newX + relX * sx, ny = newY + relY * sy
        if (block.type === 'textbox') {
          const d = parseCard(block.content)
          updateBlock(pageId, id, { content: JSON.stringify({ ...d, x: nx, y: ny, width: Math.max(80, (orig.w ?? d.width) * sx), height: Math.max(40, (orig.h ?? d.height) * sy) }) })
        } else if (block.type === 'image') {
          const d = parseImage(block.content)
          updateBlock(pageId, id, { content: JSON.stringify({ ...d, x: nx, y: ny, width: Math.max(60, (orig.w ?? d.width) * sx), height: Math.max(40, (orig.h ?? d.height) * sy) }) })
        } else if (block.type === 'section') {
          const d = parseSection(block.content)
          updateBlock(pageId, id, { content: JSON.stringify({ ...d, x: nx, y: ny }) })
        } else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
          const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
          const d = parse(block.content)
          const minW = block.type === 'timeline' ? 260 : 320
          const minH = block.type === 'timeline' ? 150 : 200
          updateBlock(pageId, id, { content: JSON.stringify({ ...d, x: nx, y: ny, width: Math.max(minW, (orig.w ?? d.width) * sx), height: Math.max(minH, (orig.h ?? d.height) * sy) }) })
        } else if (block.type === 'boardWidget') {
          const d = parseBoardWidget(block.content)
          updateBlock(pageId, id, { content: JSON.stringify({ ...d, x: nx, y: ny, width: Math.max(BOARD_WIDGET_MIN_WIDTH, (orig.w ?? d.width) * sx), height: Math.max(BOARD_WIDGET_MIN_HEIGHT, (orig.h ?? d.height) * sy) }) })
        }
      }); return
    }

    const dx = (e.clientX - op.mx0) / zoomRef.current, dy = (e.clientY - op.my0) / zoomRef.current
    if (op.kind === 'card') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...parseCard(block.content), x: op.cx0 + dx, y: op.cy0 + dy }) }); return
    }
    if (op.kind === 'section') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...parseSection(block.content), x: op.cx0 + dx, y: op.cy0 + dy }) }); return
    }
    if (op.kind === 'image') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...parseImage(block.content), x: op.cx0 + dx, y: op.cy0 + dy }) }); return
    }
    if (op.kind === 'workflow') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...parse(block.content), x: op.cx0 + dx, y: op.cy0 + dy }) }); return
    }
    if (op.kind === 'workflow-resize') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
      const d = parse(block.content)
      let { w0: w, h0: h, cx0: x, cy0: y } = op; const hh = op.handle
      const minW = block.type === 'timeline' ? 260 : 320
      const minH = block.type === 'timeline' ? 150 : 200
      if (hh.includes('e')) w = Math.max(minW, op.w0 + dx)
      if (hh.includes('s')) h = Math.max(minH, op.h0 + dy)
      if (hh.includes('w')) { w = Math.max(minW, op.w0 - dx); x = op.cx0 + op.w0 - w }
      if (hh.includes('n')) { h = Math.max(minH, op.h0 - dy); y = op.cy0 + op.h0 - h }
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...d, x, y, width: Math.round(w), height: Math.round(h) }) }); return
    }
    if (op.kind === 'board-widget') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...parseBoardWidget(block.content), x: op.cx0 + dx, y: op.cy0 + dy }) }); return
    }
    if (op.kind === 'board-widget-resize') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      const d = parseBoardWidget(block.content)
      let { w0: w, h0: h, cx0: x, cy0: y } = op; const hh = op.handle
      if (hh.includes('e')) w = Math.max(BOARD_WIDGET_MIN_WIDTH, op.w0 + dx)
      if (hh.includes('s')) h = Math.max(BOARD_WIDGET_MIN_HEIGHT, op.h0 + dy)
      if (hh.includes('w')) { w = Math.max(BOARD_WIDGET_MIN_WIDTH, op.w0 - dx); x = op.cx0 + op.w0 - w }
      if (hh.includes('n')) { h = Math.max(BOARD_WIDGET_MIN_HEIGHT, op.h0 - dy); y = op.cy0 + op.h0 - h }
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...d, x, y, width: Math.round(w), height: Math.round(h) }) }); return
    }
    if (op.kind === 'resize') {
      const block = page?.blocks.find(b => b.id === op.id); if (!block) return
      const d = parseCard(block.content)
      let { w0: w, h0: h, cx0: x, cy0: y } = op; const hh = op.handle
      if (hh.includes('e')) w = Math.max(120, op.w0 + dx)
      if (hh.includes('s')) h = Math.max(80, op.h0 + dy)
      if (hh.includes('w')) { w = Math.max(120, op.w0 - dx); x = op.cx0 + op.w0 - w }
      if (hh.includes('n')) { h = Math.max(80, op.h0 - dy); y = op.cy0 + op.h0 - h }
      updateBlock(pageId, op.id, { content: JSON.stringify({ ...d, x, y, width: Math.round(w), height: Math.round(h) }) })
    }
  }, [page, pageId, updateBlock])

  // ── mouse up: commit lasso ──
  const onMouseUp = useCallback(() => {
    const op = dragOp.current
    if (op?.kind === 'lasso') {
      const poly = lassoPathRef.current
      if (poly.length > 2) {
        const hits = new Set<string>()
        const p = useWorkspace.getState().pages[pageId]
        p?.blocks.forEach(b => {
          if (b.type === 'textbox') { const d = parseCard(b.content); if (polyHitsRect(poly, d.x, d.y, d.width, d.height)) hits.add(b.id) }
          else if (b.type === 'section') { const d = parseSection(b.content); if (polyHitsRect(poly, d.x, d.y, SECTION_W, SECTION_H)) hits.add(b.id) }
          else if (b.type === 'image') { const d = parseImage(b.content); if (polyHitsRect(poly, d.x, d.y, d.width, d.height)) hits.add(b.id) }
          else if (b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline') {
            const parse = b.type === 'kanban' ? parseKanban : b.type === 'flowchart' ? parseFlowchart : parseTimeline
            const d = parse(b.content)
            if (polyHitsRect(poly, d.x, d.y, d.width, d.height)) hits.add(b.id)
          } else if (b.type === 'boardWidget') {
            const d = parseBoardWidget(b.content)
            if (polyHitsRect(poly, d.x, d.y, d.width, d.height)) hits.add(b.id)
          }
        })
        setSelectedIds(hits)
      }
      lassoPathRef.current = []; setLassoPath(null)
    }
    dragOp.current = null
  }, [pageId])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onMouseMove, onMouseUp])

  // ── helpers ──
  function screenToCanvas(sx: number, sy: number): Pt {
    const r = viewportRef.current!.getBoundingClientRect()
    return { x: (sx - r.left - panRef.current.x) / zoomRef.current, y: (sy - r.top - panRef.current.y) / zoomRef.current }
  }

  function addCard(sx?: number, sy?: number) {
    const r = viewportRef.current!.getBoundingClientRect()
    const cx = sx !== undefined ? (sx - r.left - panRef.current.x) / zoomRef.current : (r.width / 2 - panRef.current.x) / zoomRef.current
    const cy = sy !== undefined ? (sy - r.top - panRef.current.y) / zoomRef.current : (r.height / 2 - panRef.current.y) / zoomRef.current
    const id = uuid(); const data: CardData = { text: '', x: cx - CARD_W / 2, y: cy - CARD_H / 2, width: CARD_W, height: CARD_H }
    const p = pages[pageId]; if (!p) return
    useWorkspace.setState(s => ({ pages: { ...s.pages, [pageId]: { ...p, blocks: [...p.blocks, { id, type: 'textbox' as const, content: JSON.stringify(data) }], updatedAt: Date.now() } } }))
    useWorkspace.getState().persist()
  }

  function addImage(url: string) {
    const r = viewportRef.current?.getBoundingClientRect() ?? { width: 800, height: 600 }
    const cx = (r.width / 2 - panRef.current.x) / zoomRef.current - 160
    const cy = (r.height / 2 - panRef.current.y) / zoomRef.current - 110
    const id = uuid(); const data: ImageData = { url, x: cx, y: cy, width: 320, height: 220 }
    const p = pages[pageId]; if (!p) return
    useWorkspace.setState(s => ({ pages: { ...s.pages, [pageId]: { ...p, blocks: [...p.blocks, { id, type: 'image' as const, content: JSON.stringify(data) }], updatedAt: Date.now() } } }))
    useWorkspace.getState().persist()
  }

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !user) return
    setUploading(true)
    try {
      const { url } = await uploadToR2(file, user.id, pageId, file.name)
      addImage(url)
      notify({ type: 'success', message: 'Attachment added', sub: file.name })
    } catch (err) {
      notify({
        type: 'error',
        message: 'Attachment failed',
        sub: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setUploading(false)
      if (attachRef.current) attachRef.current.value = ''
    }
  }

  function addSection(cx: number, cy: number) {
    const id = uuid(); const data: SectionData = { title: 'Section', x: cx, y: cy }
    const p = pages[pageId]; if (!p) return
    useWorkspace.setState(s => ({ pages: { ...s.pages, [pageId]: { ...p, blocks: [...p.blocks, { id, type: 'section' as const, content: JSON.stringify(data) }], updatedAt: Date.now() } } }))
    useWorkspace.getState().persist(); setCtxMenu(null)
  }

  function addWorkflowBlock(type: 'kanban' | 'flowchart' | 'timeline', sx?: number, sy?: number) {
    const r = viewportRef.current!.getBoundingClientRect()
    const cx = sx !== undefined ? (sx - r.left - panRef.current.x) / zoomRef.current : (r.width / 2 - panRef.current.x) / zoomRef.current
    const cy = sy !== undefined ? (sy - r.top - panRef.current.y) / zoomRef.current : (r.height / 2 - panRef.current.y) / zoomRef.current
    const x = cx - 260, y = cy - 180
    const id = uuid()
    let data: object
    if (type === 'kanban') data = defaultKanban(x, y)
    else if (type === 'flowchart') data = defaultFlowchart(x, y)
    else data = defaultTimeline(x, y)
    const p = pages[pageId]; if (!p) return
    useWorkspace.setState(s => ({ pages: { ...s.pages, [pageId]: { ...p, blocks: [...p.blocks, { id, type, content: JSON.stringify(data) }], updatedAt: Date.now() } } }))
    useWorkspace.getState().persist()
    setCtxMenu(null)
  }

  function addBoardWidget(type: BoardWidgetType, sx?: number, sy?: number) {
    const r = viewportRef.current!.getBoundingClientRect()
    const cx = sx !== undefined ? (sx - r.left - panRef.current.x) / zoomRef.current : (r.width / 2 - panRef.current.x) / zoomRef.current
    const cy = sy !== undefined ? (sy - r.top - panRef.current.y) / zoomRef.current : (r.height / 2 - panRef.current.y) / zoomRef.current
    const base = defaultBoardWidget(type, 0, 0)
    const data = defaultBoardWidget(type, cx - base.width / 2, cy - base.height / 2)
    const id = uuid()
    const p = pages[pageId]; if (!p) return
    useWorkspace.setState(s => ({ pages: { ...s.pages, [pageId]: { ...p, blocks: [...p.blocks, { id, type: 'boardWidget' as const, content: JSON.stringify(data) }], updatedAt: Date.now() } } }))
    useWorkspace.getState().persist()
    setCtxMenu(null)
  }

  function deleteSelected() { selectedIds.forEach(id => deleteBlock(pageId, id)); setSelectedIds(new Set()) }

  function startGroupMove(e: React.MouseEvent) {
    if (e.button !== 0) return; e.preventDefault(); e.stopPropagation()
    const origins: Record<string, Pt> = {}
    const p = useWorkspace.getState().pages[pageId]
    selectedIds.forEach(id => {
      const block = p?.blocks.find(b => b.id === id); if (!block) return
      if (block.type === 'textbox') { const d = parseCard(block.content); origins[id] = { x: d.x, y: d.y } }
      else if (block.type === 'section') { const d = parseSection(block.content); origins[id] = { x: d.x, y: d.y } }
      else if (block.type === 'image') { const d = parseImage(block.content); origins[id] = { x: d.x, y: d.y } }
      else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
        const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
        const d = parse(block.content)
        origins[id] = { x: d.x, y: d.y }
      } else if (block.type === 'boardWidget') {
        const d = parseBoardWidget(block.content)
        origins[id] = { x: d.x, y: d.y }
      }
    })
    dragOp.current = { kind: 'lasso-move', mx0: e.clientX, my0: e.clientY, ids: [...selectedIds], origins }
  }

  function startBboxResize(e: React.MouseEvent, handle: string, bbox: BBox) {
    e.preventDefault(); e.stopPropagation()
    const items0: Record<string, { x: number; y: number; w?: number; h?: number }> = {}
    const p = useWorkspace.getState().pages[pageId]
    selectedIds.forEach(id => {
      const block = p?.blocks.find(b => b.id === id); if (!block) return
      if (block.type === 'textbox') { const d = parseCard(block.content); items0[id] = { x: d.x, y: d.y, w: d.width, h: d.height } }
      else if (block.type === 'section') { const d = parseSection(block.content); items0[id] = { x: d.x, y: d.y } }
      else if (block.type === 'image') { const d = parseImage(block.content); items0[id] = { x: d.x, y: d.y, w: d.width, h: d.height } }
      else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
        const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
        const d = parse(block.content)
        items0[id] = { x: d.x, y: d.y, w: d.width, h: d.height }
      } else if (block.type === 'boardWidget') {
        const d = parseBoardWidget(block.content)
        items0[id] = { x: d.x, y: d.y, w: d.width, h: d.height }
      }
    })
    dragOp.current = { kind: 'lasso-resize', handle, mx0: e.clientX, my0: e.clientY, bbox0: bbox, items0 }
  }

  function handleViewportMouseDown(e: React.MouseEvent) {
    setWorkflowMenu(false)
    setWidgetMenu(false)
    if ((e.target as HTMLElement).closest('[data-card],[data-title],[data-section],[data-bbox]')) return
    if (e.button !== 0) return
    if (activeTool === 'lasso') {
      const pt = screenToCanvas(e.clientX, e.clientY)
      setSelectedIds(new Set()); lassoPathRef.current = [pt]; setLassoPath([pt])
      dragOp.current = { kind: 'lasso' }
      return
    }
    dragOp.current = { kind: 'pan', mx0: e.clientX, my0: e.clientY, px0: panRef.current.x, py0: panRef.current.y }
  }

  function handleViewportDoubleClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-card],[data-title],[data-section]')) return
    if (activeTool === 'lasso') return
    addCard(e.clientX, e.clientY)
  }

  function handleContextMenu(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-card],[data-title],[data-section]')) return
    e.preventDefault()
    setWorkflowMenu(false)
    setWidgetMenu(false)
    setCtxSubmenu(null)
    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY)
    setCtxMenu({ sx: e.clientX, sy: e.clientY, cx, cy })
  }

  function zoomBy(factor: number) {
    const r = viewportRef.current!.getBoundingClientRect()
    const cx = r.width / 2, cy = r.height / 2, oldZ = zoomRef.current
    const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * factor))
    const np = { x: cx - (cx - panRef.current.x) * (newZ / oldZ), y: cy - (cy - panRef.current.y) * (newZ / oldZ) }
    zoomRef.current = newZ; panRef.current = np; setZoom(newZ); setPan(np)
  }

  function resetView() { fitToContent() }

  if (!page) return null

  // bbox resize handle definitions (position as fraction of bbox)
  const bboxHandles = [
    { id: 'nw', fx: 0,   fy: 0,   cursor: 'nw-resize' },
    { id: 'n',  fx: 0.5, fy: 0,   cursor: 'n-resize'  },
    { id: 'ne', fx: 1,   fy: 0,   cursor: 'ne-resize'  },
    { id: 'e',  fx: 1,   fy: 0.5, cursor: 'e-resize'   },
    { id: 'se', fx: 1,   fy: 1,   cursor: 'se-resize'  },
    { id: 's',  fx: 0.5, fy: 1,   cursor: 's-resize'   },
    { id: 'sw', fx: 0,   fy: 1,   cursor: 'sw-resize'  },
    { id: 'w',  fx: 0,   fy: 0.5, cursor: 'w-resize'   },
  ]

  const HS = 8 / zoom // handle size in canvas units — stays ~8px on screen

  const toolboxItems = [
    { icon: <Lasso size={15} />, label: 'Lasso',   active: activeTool === 'lasso', onClick: () => setActiveTool(t => t === 'lasso' ? 'pan' : 'lasso') },
    { icon: <Pencil size={15} />, label: 'Draw',   active: showDraw,               onClick: () => setShowDraw(true) },
    { icon: <Type size={15} />,   label: 'Text box', active: false,                onClick: () => addCard() },
    { icon: uploading ? <span className="text-[9px]">…</span> : <Paperclip size={15} />, label: uploading ? 'Uploading' : 'Attach', active: false, onClick: () => attachRef.current?.click() },
    { icon: <LayoutGrid size={15} />, label: 'Workflow', active: workflowMenu, onClick: () => { setWidgetMenu(false); setWorkflowMenu(v => !v) } },
    { icon: <LayoutDashboard size={15} />, label: 'Widgets', active: widgetMenu, onClick: () => { setWorkflowMenu(false); setWidgetMenu(v => !v) } },
  ]

  function applyFmt(cmd: string, value?: string) { runRichTextCommand(cmd, value) }

  function rememberEditorSelection() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && findCardEditorFromSelection(sel)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  function restoreSavedSelection() {
    const saved = savedSelectionRef.current
    if (!saved) return
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(saved)
  }

  function applyFontSize(size: number) {
    const next = clampFontSize(size)
    restoreSavedSelection()
    runRichTextCommand('fontSize', String(next))
    setFmt(f => ({ ...f, size: next }))
  }

  function changeFontSize(delta: number) {
    const val = document.queryCommandValue('fontSize')
    const current = clampFontSize(val || fmt.size)
    applyFontSize(current + delta)
  }

  function handleFontSizeInput(value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    if (!digit) return
    applyFontSize(clampFontSize(digit, fmt.size))
  }

  function applyColor(hex: string) {
    appliedColorRef.current = hex
    runRichTextCommand('foreColor', hex)
    setActivePicker(null)
    setPopoverPos(null)
  }

  function applyHighlight(color: string) {
    appliedHighlightRef.current = color
    runRichTextCommand('hiliteColor', color)
    setActivePicker(null)
    setPopoverPos(null)
  }

  function insertLink() {
    const url = linkVal.trim()
    if (!url) return
    restoreSavedSelection()
    savedSelectionRef.current = null
    runRichTextCommand('createLink', normalizeLinkUrl(url))
    setShowLinkInput(false)
    setPopoverPos(null)
    setLinkVal('')
  }

  function insertCode() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    try {
      const range = sel.getRangeAt(0)
      const code = document.createElement('code')
      code.style.cssText = 'background:#1e1e2e;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em;color:#e2e8f0'
      range.surroundContents(code)
      dispatchCardEditorInput(findCardEditorFromSelection(sel))
    } catch {}
  }

  const TEXT_COLORS = [
    '#ffffff', '#d1d5db', '#9ca3af', '#6b7280', '#374151', '#111827',
    '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#991b1b', '#7f1d1d',
    '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#7c2d12',
    '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#78350f',
    '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#14532d',
    '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#164e63',
    '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a',
    '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#4c1d95',
    '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#831843',
  ]

  const HIGHLIGHT_COLORS = [
    'transparent',
    '#fef08a', '#fde68a', '#fed7aa', '#fecaca', '#bbf7d0',
    '#bae6fd', '#c7d2fe', '#e9d5ff', '#fce7f3', '#ccfbf1',
    '#d1fae5', '#dbeafe', '#ede9fe', '#fdf2f8', '#f0fdf4',
  ]

  const fmtBtn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'text-white bg-white/15' : 'text-gray-400 hover:text-white hover:bg-white/10'}`

  function placePopover(el: HTMLElement, width: number) {
    const rect = el.getBoundingClientRect()
    const maxLeft = Math.max(12, window.innerWidth - width - 12)
    setPopoverPos({
      left: Math.min(Math.max(12, rect.left), maxLeft),
      top: rect.bottom + 6,
    })
  }

  function ColorGrid({ colors, applied, onPick, cols = 6 }: {
    colors: string[], applied: string, onPick: (c: string) => void, cols?: number
  }) {
    const width = cols === 6 ? 196 : 196
    return (
      <div ref={popoverRef} onMouseDown={e => e.preventDefault()}
        className="fixed bg-surface-2 border border-surface-4 rounded-xl shadow-2xl z-[80] p-2.5"
        style={{ width, left: popoverPos?.left ?? 12, top: popoverPos?.top ?? 44 }}>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {colors.map(c => (
            <button key={c} onMouseDown={e => e.preventDefault()} onClick={() => onPick(c)}
              title={c === 'transparent' ? 'None' : c}
              className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 hover:border-white/60 ${applied === c ? 'border-white' : 'border-surface-4'} ${c === 'transparent' ? 'bg-surface-3 relative overflow-hidden' : ''}`}
              style={c !== 'transparent' ? { backgroundColor: c } : {}}>
              {c === 'transparent' && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500">✕</span>}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-surface-3 flex items-center gap-2">
          <span className="text-[10px] text-gray-500 shrink-0">Custom</span>
          <input type="color" defaultValue={applied === 'transparent' ? '#ffffff' : applied}
            onMouseDown={e => e.stopPropagation()}
            onChange={e => onPick(e.target.value)}
            className="w-full h-6 rounded cursor-pointer bg-transparent border border-surface-3" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden bg-surface-0 flex flex-col">

      {/* Text formatting toolbar — full-width bar snapped to top when editing a card */}
      {cardEditing && (
        <div ref={toolbarRef} onMouseDown={e => e.preventDefault()}
          className="flex-shrink-0 flex items-center gap-0.5 px-3 h-10 bg-surface-1 border-b border-surface-3 z-50 overflow-x-auto">

          {/* Format */}
          <button onClick={() => applyFmt('bold')} className={fmtBtn(fmt.bold)} title="Bold (⌘B)"><Bold size={13} /></button>
          <button onClick={() => applyFmt('italic')} className={fmtBtn(fmt.italic)} title="Italic (⌘I)"><Italic size={13} /></button>
          <button onClick={() => applyFmt('underline')} className={fmtBtn(fmt.underline)} title="Underline (⌘U)"><Underline size={13} /></button>
          <button onClick={() => applyFmt('strikeThrough')} className={fmtBtn(fmt.strike)} title="Strikethrough"><Strikethrough size={13} /></button>

          <div className="w-px h-4 bg-surface-3 mx-1.5 shrink-0" />

          {/* Size */}
          <div className="flex items-center h-7 rounded-lg border border-surface-4 bg-surface-2 overflow-hidden shrink-0">
            <button onClick={() => changeFontSize(-1)} onMouseDown={e => e.preventDefault()}
              className="w-7 h-full text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Smaller text">−</button>
            <input
              aria-label="Text size"
              inputMode="numeric"
              pattern="[1-7]"
              maxLength={1}
              value={fmt.size}
              onMouseDown={e => { rememberEditorSelection(); e.stopPropagation() }}
              onFocus={e => e.currentTarget.select()}
              onChange={e => handleFontSizeInput(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
              }}
              className="h-full w-7 border-x border-surface-4 bg-surface-1 text-center text-[12px] font-semibold tabular-nums text-white outline-none focus:bg-surface-3 focus:ring-1 focus:ring-accent/70"
              title="Text size 1-7"
            />
            <button onClick={() => changeFontSize(1)} onMouseDown={e => e.preventDefault()}
              className="w-7 h-full text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors" title="Larger text">+</button>
          </div>

          <div className="w-px h-4 bg-surface-3 mx-1.5 shrink-0" />

          {/* Text color */}
          <div className="relative shrink-0">
            <button onMouseDown={e => e.preventDefault()} onClick={e => {
                placePopover(e.currentTarget, 196)
                setShowLinkInput(false)
                setActivePicker(v => v === 'text' ? null : 'text')
              }}
              className={`flex flex-col items-center px-2 py-0.5 rounded hover:bg-white/10 transition-colors ${activePicker === 'text' ? 'bg-white/10' : ''}`} title="Text color">
              <span className="text-[12px] font-bold text-gray-300 leading-none">A</span>
              <span className="w-4 h-1 rounded-full mt-0.5" style={{ backgroundColor: appliedColorRef.current }} />
            </button>
            {activePicker === 'text' && <ColorGrid colors={TEXT_COLORS} applied={appliedColorRef.current} onPick={applyColor} cols={6} />}
          </div>

          {/* Highlight */}
          <div className="relative shrink-0">
            <button onMouseDown={e => e.preventDefault()} onClick={e => {
                placePopover(e.currentTarget, 196)
                setShowLinkInput(false)
                setActivePicker(v => v === 'highlight' ? null : 'highlight')
              }}
              className={`p-1.5 rounded hover:bg-white/10 transition-colors ${activePicker === 'highlight' ? 'bg-white/10' : ''}`} title="Highlight">
              <Highlighter size={13} style={{ color: appliedHighlightRef.current !== 'transparent' ? appliedHighlightRef.current : '#9ca3af' }} />
            </button>
            {activePicker === 'highlight' && <ColorGrid colors={HIGHLIGHT_COLORS} applied={appliedHighlightRef.current} onPick={applyHighlight} cols={6} />}
          </div>

          <div className="w-px h-4 bg-surface-3 mx-1.5 shrink-0" />

          {/* Link */}
          <div className="relative shrink-0">
            <button onClick={e => {
                if (!showLinkInput) rememberEditorSelection()
                placePopover(e.currentTarget, 220)
                setShowLinkInput(v => !v); setActivePicker(null)
              }}
              className={fmtBtn(showLinkInput)} title="Link (⌘K)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </button>
            {showLinkInput && (
              <div ref={popoverRef} onMouseDown={e => e.preventDefault()} className="fixed bg-surface-2 border border-surface-4 rounded-xl shadow-2xl p-2 z-[80] flex gap-1.5" style={{ width: 220, left: popoverPos?.left ?? 12, top: popoverPos?.top ?? 44 }}>
                <input autoFocus value={linkVal} onChange={e => setLinkVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') insertLink(); if (e.key === 'Escape') setShowLinkInput(false) }}
                  placeholder="https://…" onMouseDown={e => e.stopPropagation()}
                  className="flex-1 text-xs bg-surface-3 text-white placeholder-gray-600 rounded-lg px-2 py-1 outline-none border border-surface-4 focus:border-accent" />
                <button onClick={insertLink} className="px-2 py-1 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors shrink-0">Add</button>
                <button onClick={() => { runRichTextCommand('unlink'); setShowLinkInput(false); setPopoverPos(null) }}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors shrink-0" title="Remove link">✕</button>
              </div>
            )}
          </div>

          {/* Blockquote */}
          <button onClick={() => applyFmt('formatBlock', 'blockquote')} className={fmtBtn(false)} title="Blockquote">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
          </button>

          {/* Inline code */}
          <button onClick={insertCode} className={fmtBtn(false)} title="Inline code">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </button>

          <div className="w-px h-4 bg-surface-3 mx-1.5 shrink-0" />

          {/* Lists */}
          <button onClick={() => applyFmt('insertOrderedList')} className={fmtBtn(false)} title="Ordered list (⌘⇧7)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
              <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
            </svg>
          </button>
          <button onClick={() => applyFmt('insertUnorderedList')} className={fmtBtn(false)} title="Bullet list (⌘⇧8)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
              <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button onClick={() => applyFmt('outdent')} className={fmtBtn(false)} title="Decrease indent (⌘[)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 8 3 12 7 16"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/>
            </svg>
          </button>
          <button onClick={() => applyFmt('indent')} className={fmtBtn(false)} title="Increase indent (⌘])">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="7" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/>
            </svg>
          </button>

          <div className="w-px h-4 bg-surface-3 mx-1.5 shrink-0" />

          {/* Alignment */}
          <button onClick={() => applyFmt('justifyLeft')} className={fmtBtn(fmt.align === 'left')} title="Align left (⌘⇧L)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>
            </svg>
          </button>
          <button onClick={() => applyFmt('justifyCenter')} className={fmtBtn(fmt.align === 'center')} title="Align center (⌘⇧E)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/>
            </svg>
          </button>
          <button onClick={() => applyFmt('justifyRight')} className={fmtBtn(fmt.align === 'right')} title="Align right (⌘⇧R)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="5" y2="18"/>
            </svg>
          </button>
          <button onClick={() => applyFmt('justifyFull')} className={fmtBtn(fmt.align === 'full')} title="Justify">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/>
            </svg>
          </button>

          <div className="w-px h-4 bg-surface-3 mx-1.5 shrink-0" />

          {/* Undo / Redo */}
          <button onClick={() => applyFmt('undo')} className={fmtBtn(false)} title="Undo (⌘Z)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
            </svg>
          </button>
          <button onClick={() => applyFmt('redo')} className={fmtBtn(false)} title="Redo (⌘Y)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
            </svg>
          </button>

          {/* Shortcuts help */}
          <div className="relative ml-auto shrink-0">
            <button onMouseDown={e => e.preventDefault()} onClick={() => setShowShortcuts(v => !v)}
              className={`p-1.5 rounded transition-colors text-[11px] font-semibold ${showShortcuts ? 'text-white bg-white/15' : 'text-gray-500 hover:text-white hover:bg-white/10'}`} title="Keyboard shortcuts (⌘/)">⌘/</button>
            {showShortcuts && (
              <div onMouseDown={e => e.preventDefault()}
                className="absolute top-full right-0 mt-1 bg-surface-2 border border-surface-4 rounded-xl shadow-2xl z-[60] p-4 text-xs"
                style={{ width: 280 }}>
                <p className="text-white font-semibold mb-3">Keyboard Shortcuts</p>
                {[
                  ['Format', [['⌘B','Bold'],['⌘I','Italic'],['⌘U','Underline'],['⌘Z','Undo'],['⌘Y','Redo']]],
                  ['Insert', [['⌘K','Link'],]],
                  ['Lists & Indent', [['⌘⇧7','Ordered list'],['⌘⇧8','Bullet list'],['⌘]','Indent'],['⌘[','Outdent']]],
                  ['Alignment', [['⌘⇧L','Left'],['⌘⇧E','Center'],['⌘⇧R','Right']]],
                ].map(([group, shortcuts]) => (
                  <div key={group as string} className="mb-3">
                    <p className="text-gray-500 uppercase text-[10px] tracking-wider mb-1.5">{group as string}</p>
                    {(shortcuts as [string,string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between py-0.5">
                        <span className="text-gray-300">{label}</span>
                        <kbd className="bg-surface-3 border border-surface-4 text-gray-400 rounded px-1.5 py-0.5 text-[10px] font-mono">{key}</kbd>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Board canvas */}
      <div className="flex-1 relative">

      {/* Viewport */}
      <div ref={viewportRef} data-viewport className="absolute inset-0"
        style={{ cursor: activeTool === 'lasso' ? 'crosshair' : 'default' }}
        onMouseDown={handleViewportMouseDown}
        onDoubleClick={handleViewportDoubleClick}
        onContextMenu={handleContextMenu}>

        {/* Canvas transform layer */}
        <div style={{ position: 'absolute', transformOrigin: '0 0', transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, width: 8000, height: 6000 }}>

          {/* Freehand lasso SVG */}
          {lassoPath && lassoPath.length > 1 && (
            <svg style={{ position: 'absolute', left: 0, top: 0, width: 8000, height: 6000, pointerEvents: 'none', overflow: 'visible' }}>
              <polygon
                points={lassoPath.map(p => `${p.x},${p.y}`).join(' ')}
                fill="rgba(124,106,247,0.08)"
                stroke="#7c6af7"
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${5 / zoom},${3 / zoom}`}
                strokeLinejoin="round"
              />
            </svg>
          )}

          {/* Selection bounding box + resize handles */}
          {selBBox && selectedIds.size > 0 && (
            <div data-bbox
              style={{ position: 'absolute', left: selBBox.x, top: selBBox.y, width: selBBox.w, height: selBBox.h,
                border: `${1.5 / zoom}px dashed rgba(124,106,247,0.7)`, borderRadius: 8 / zoom, pointerEvents: 'none' }}>
              {bboxHandles.map(h => (
                <div key={h.id} style={{
                  position: 'absolute',
                  left: h.fx * selBBox.w,
                  top: h.fy * selBBox.h,
                  width: HS, height: HS,
                  marginLeft: -HS / 2, marginTop: -HS / 2,
                  background: '#7c6af7',
                  border: `${1.5 / zoom}px solid white`,
                  borderRadius: 2 / zoom,
                  cursor: h.cursor,
                  pointerEvents: 'auto',
                }} onMouseDown={e => startBboxResize(e, h.id, selBBox)} />
              ))}
            </div>
          )}

          {/* Title */}
          <div data-title className="absolute" style={{ left: 0, top: 40 }} onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => updatePageIcon(pageId, EMOJIS[(EMOJIS.indexOf(page.icon) + 1) % EMOJIS.length])}
              className="text-5xl mb-4 hover:scale-110 transition-transform cursor-pointer block">{page.icon}</button>
            <div ref={titleRef} contentEditable suppressContentEditableWarning data-page-title
              onInput={e => updatePageTitle(pageId, (e.target as HTMLDivElement).textContent ?? '')}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              className="text-4xl font-bold text-white outline-none mb-3 min-w-[200px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
              data-placeholder="Untitled" />
            <p className="text-sm text-gray-600 pointer-events-none select-none">Double-click to add a card · Right-click to add a section</p>
          </div>

          {/* Sections */}
          {sections.map(({ id, data }) => {
            const isSel = selectedIds.has(id)
            return (
              <div key={id} data-section>
                <BoardSection id={id} data={data} selected={isSel}
                  onDragStart={e => { e.preventDefault(); isSel ? startGroupMove(e) : (dragOp.current = { kind: 'section', id, mx0: e.clientX, my0: e.clientY, cx0: data.x, cy0: data.y }) }}
                  onTitleChange={title => updateBlock(pageId, id, { content: JSON.stringify({ ...data, title }) })}
                  onDelete={() => deleteBlock(pageId, id)} />
              </div>
            )
          })}

          {/* Images */}
          {images.map(({ id, data }) => {
            const isSel = selectedIds.has(id)
            return (
              <div key={id} data-card>
                <BoardImageCard id={id} data={data} selected={isSel}
                  onDragStart={e => { e.preventDefault(); isSel ? startGroupMove(e) : (dragOp.current = { kind: 'image', id, mx0: e.clientX, my0: e.clientY, cx0: data.x, cy0: data.y }) }}
                  onDelete={() => deleteBlock(pageId, id)} />
              </div>
            )
          })}

          {/* Cards */}
          {cards.map(({ id, data }) => {
            const isSel = selectedIds.has(id)
            return (
              <div key={id} data-card>
                <BoardCard id={id} data={data} selected={isSel}
                  onDragStart={e => { e.preventDefault(); isSel ? startGroupMove(e) : (dragOp.current = { kind: 'card', id, mx0: e.clientX, my0: e.clientY, cx0: data.x, cy0: data.y }) }}
                  onResizeHandleMouseDown={(e, handle) => { e.preventDefault(); dragOp.current = { kind: 'resize', id, handle, mx0: e.clientX, my0: e.clientY, cx0: data.x, cy0: data.y, w0: data.width, h0: data.height } }}
                  onTextChange={text => updateBlock(pageId, id, { content: JSON.stringify({ ...data, text }) })}
                  onDelete={() => deleteBlock(pageId, id)} />
              </div>
            )
          })}

          {/* Workflow blocks */}
          {workflowBlocks.map(b => {
            const isSel = selectedIds.has(b.id)
            const parse = b.type === 'kanban' ? parseKanban : b.type === 'flowchart' ? parseFlowchart : parseTimeline
            const d = parse(b.content)
            const commonProps = {
              block: b, selected: isSel, zoom,
              onDragStart: (e: React.MouseEvent) => {
                e.preventDefault()
                if (isSel) startGroupMove(e)
                else dragOp.current = { kind: 'workflow', id: b.id, mx0: e.clientX, my0: e.clientY, cx0: d.x, cy0: d.y }
              },
              onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => {
                e.preventDefault()
                dragOp.current = { kind: 'workflow-resize', id: b.id, handle, mx0: e.clientX, my0: e.clientY, cx0: d.x, cy0: d.y, w0: d.width, h0: d.height }
              },
              onUpdate: (content: string) => updateBlock(pageId, b.id, { content }),
              onDelete: () => deleteBlock(pageId, b.id),
            }
            if (b.type === 'kanban') return <KanbanBlock key={b.id} {...commonProps} />
            if (b.type === 'flowchart') return <FlowchartBlock key={b.id} {...commonProps} />
            return <TimelineBlock key={b.id} {...commonProps} />
          })}

          {/* Board widgets */}
          {boardWidgetBlocks.map(b => {
            const data = parseBoardWidget(b.content)
            const isSel = selectedIds.has(b.id)
            return (
              <BoardWidgetBlock
                key={b.id}
                block={b}
                selected={isSel}
                zoom={zoom}
                onDragStart={e => {
                  e.preventDefault()
                  if (isSel) startGroupMove(e)
                  else dragOp.current = { kind: 'board-widget', id: b.id, mx0: e.clientX, my0: e.clientY, cx0: data.x, cy0: data.y }
                }}
                onResizeHandleMouseDown={(e, handle) => {
                  e.preventDefault()
                  dragOp.current = { kind: 'board-widget-resize', id: b.id, handle, mx0: e.clientX, my0: e.clientY, cx0: data.x, cy0: data.y, w0: data.width, h0: data.height }
                }}
                onUpdate={content => updateBlock(pageId, b.id, { content })}
                onDelete={() => deleteBlock(pageId, b.id)}
              />
            )
          })}
        </div>
      </div>

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-surface-2 border border-surface-4 rounded-xl px-3 py-2 shadow-2xl">
          <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-surface-4" />
          <button onClick={deleteSelected} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-500 hover:text-white transition-colors"><X size={11} /></button>
        </div>
      )}

      {/* Collaborator presence avatars */}
      {collaborators.length > 0 && (
        <div className="fixed top-3 right-6 z-40 flex items-center gap-1.5">
          {collaborators.slice(0, 5).map(c => (
            <div key={c.userId} title={c.email}
              className="w-7 h-7 rounded-full border-2 border-surface-1 flex items-center justify-center text-[11px] font-semibold text-white shadow-md"
              style={{ backgroundColor: c.color }}>
              {(c.email[0] ?? '?').toUpperCase()}
            </div>
          ))}
          {collaborators.length > 5 && (
            <span className="text-xs text-gray-500">+{collaborators.length - 5}</span>
          )}
        </div>
      )}

      {/* Drawing canvas */}
      {showDraw && <DrawingCanvas pageId={pageId} onInsert={url => { addImage(url); setShowDraw(false) }} onClose={() => setShowDraw(false)} />}

      {/* Hidden file input */}
      <input ref={attachRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleAttach} />

      {/* Context menu */}
      {ctxMenu && (
        <div className="fixed z-50 bg-surface-2 border border-surface-4 rounded-xl shadow-2xl py-1 min-w-[170px]"
          style={{ left: ctxMenu.sx, top: ctxMenu.sy }} onMouseDown={e => e.stopPropagation()} onMouseLeave={() => setCtxSubmenu(null)}>
          <button onClick={() => { addSection(ctxMenu.cx, ctxMenu.cy); setCtxMenu(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
            <span className="text-accent font-bold">+</span><span>Add Section</span>
          </button>
          <div className="relative" onMouseEnter={() => setCtxSubmenu('widgets')}>
            <button
              onClick={() => setCtxSubmenu(submenu => submenu === 'widgets' ? null : 'widgets')}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${ctxSubmenu === 'widgets' ? 'bg-surface-3 text-white' : 'text-gray-300 hover:text-white hover:bg-surface-3'}`}
            >
              <LayoutDashboard size={13} className="text-accent" />
              <span className="min-w-0 flex-1 text-left">Widgets</span>
              <ChevronRight size={13} className="text-gray-600" />
            </button>
            {ctxSubmenu === 'widgets' && (
              <div
                className="absolute top-0 z-[60] max-h-[340px] min-w-[210px] overflow-y-auto rounded-xl border border-surface-4 bg-surface-2 py-1 shadow-2xl"
                style={ctxMenu.sx > window.innerWidth - 430 ? { right: 'calc(100% + 6px)' } : { left: 'calc(100% + 6px)' }}
              >
                {BOARD_WIDGET_TYPES.map(type => {
                  const widget = getBoardWidgetMeta(type)
                  return (
                    <button key={type} onClick={() => { addBoardWidget(type, ctxMenu.sx, ctxMenu.sy); setCtxMenu(null); setCtxSubmenu(null) }}
                      title={widget.description}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
                      <span className="text-xs text-accent">▣</span>
                      <span className="min-w-0 flex-1 truncate">{widget.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="border-t border-surface-3 my-1" />
          <button onClick={() => { setAiPanel({ sx: ctxMenu.sx, sy: ctxMenu.sy }); setCtxMenu(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
            <Sparkles size={13} className="text-accent" /><span>Ask AI</span>
          </button>
          <div className="border-t border-surface-3 my-1" />
          <button onClick={() => { addWorkflowBlock('kanban', ctxMenu.sx, ctxMenu.sy); setCtxMenu(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
            <span className="text-xs">▦</span><span>Kanban</span>
          </button>
          <button onClick={() => { addWorkflowBlock('flowchart', ctxMenu.sx, ctxMenu.sy); setCtxMenu(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
            <span className="text-xs">◇</span><span>Flowchart</span>
          </button>
          <button onClick={() => { addWorkflowBlock('timeline', ctxMenu.sx, ctxMenu.sy); setCtxMenu(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
            <span className="text-xs">━</span><span>Timeline</span>
          </button>
        </div>
      )}

      {/* AI Panel */}
      {aiPanel && (() => {
        function applyAiActions(actions: AiAction[]) {
          const SECTION_COL_W = 320
          const START_X = 0
          const START_Y = 260
          const CARD_H = 170
          const CARD_W = 280
          const CARD_HEIGHT = 140

          const currentPage = useWorkspace.getState().pages[pageId]
          if (!currentPage) return

          let blocks = [...currentPage.blocks]

          // Clear board if requested
          if (actions.some(a => a.type === 'clear_board')) blocks = []

          // Collect sections in order to compute column positions
          const sectionOrder: string[] = []
          actions.forEach(a => { if (a.type === 'create_section' && a.title) sectionOrder.push(a.title) })

          const sectionPos: Record<string, { x: number; y: number }> = {}
          sectionOrder.forEach((title, i) => {
            sectionPos[title] = { x: START_X + i * SECTION_COL_W, y: START_Y }
          })

          const cardCountPerSection: Record<string, number> = {}
          let workflowCount = 0

          actions.forEach(a => {
            if (a.type === 'create_workflow') {
              const created = createWorkflowBlockFromAiAction(
                a,
                START_X + workflowCount * 60,
                START_Y + 260 + workflowCount * 40,
              )
              if (created) {
                workflowCount += 1
                blocks.push({ id: uuid(), type: created.type, content: created.content })
              }
            }

            if (a.type === 'create_section' && a.title) {
              const pos = sectionPos[a.title] ?? { x: START_X, y: START_Y }
              blocks.push({
                id: uuid(),
                type: 'section' as const,
                content: JSON.stringify({ title: a.title, x: pos.x, y: pos.y }),
              })
            }
            if (a.type === 'create_card' && a.text) {
              const secKey = a.section ?? '_none'
              const idx = cardCountPerSection[secKey] ?? 0
              cardCountPerSection[secKey] = idx + 1
              const secPos = a.section && sectionPos[a.section]
                ? sectionPos[a.section]
                : { x: START_X + sectionOrder.length * SECTION_COL_W, y: START_Y }
              blocks.push({
                id: uuid(),
                type: 'textbox' as const,
                content: JSON.stringify({
                  text: a.text,
                  x: secPos.x,
                  y: secPos.y + 50 + idx * CARD_H,
                  width: CARD_W,
                  height: CARD_HEIGHT,
                }),
              })
            }

            if (a.type === 'delete_card' && a.text) {
              const needle = a.text.toLowerCase()
              blocks = blocks.filter(b => {
                if (b.type !== 'textbox') return true
                try { return JSON.parse(b.content).text?.toLowerCase() !== needle }
                catch { return true }
              })
            }

            if (a.type === 'delete_section' && a.title) {
              const needle = a.title.toLowerCase()
              blocks = blocks.filter(b => {
                if (b.type !== 'section') return true
                try { return JSON.parse(b.content).title?.toLowerCase() !== needle }
                catch { return true }
              })
            }

            if (a.type === 'rename_section' && a.title && a.newTitle) {
              const needle = a.title.toLowerCase()
              blocks = blocks.map(b => {
                if (b.type !== 'section') return b
                try {
                  const d = JSON.parse(b.content)
                  if (d.title?.toLowerCase() === needle) {
                    return { ...b, content: JSON.stringify({ ...d, title: a.newTitle }) }
                  }
                } catch {}
                return b
              })
            }

            if (a.type === 'move_card' && a.text && a.toSection) {
              const cardNeedle = a.text.toLowerCase()
              const secNeedle = a.toSection.toLowerCase()
              const targetSec = blocks.find(b => {
                if (b.type !== 'section') return false
                try { return JSON.parse(b.content).title?.toLowerCase() === secNeedle }
                catch { return false }
              })
              if (targetSec) {
                try {
                  const secData = JSON.parse(targetSec.content)
                  const cardsInTarget = blocks.filter(b => {
                    if (b.type !== 'textbox') return false
                    try {
                      const d = JSON.parse(b.content)
                      return Math.abs(d.x - secData.x) < SECTION_COL_W
                    } catch { return false }
                  }).length
                  blocks = blocks.map(b => {
                    if (b.type !== 'textbox') return b
                    try {
                      const d = JSON.parse(b.content)
                      if (d.text?.toLowerCase() === cardNeedle) {
                        return { ...b, content: JSON.stringify({ ...d, x: secData.x, y: secData.y + 50 + cardsInTarget * CARD_H, width: CARD_W, height: Math.max(d.height, CARD_HEIGHT) }) }
                      }
                    } catch {}
                    return b
                  })
                } catch {}
              }
            }
          })

          useWorkspace.setState(s => ({
            pages: { ...s.pages, [pageId]: { ...currentPage, blocks, updatedAt: Date.now() } },
          }))
          useWorkspace.getState().persist()
        }

        return (
          <AiPanel
            x={aiPanel.sx}
            y={aiPanel.sy}
            workspaceContext={workspaceContext}
            calendarEvents={calendarEvents}
            onClose={() => setAiPanel(null)}
            onApplyActions={applyAiActions}
          />
        )
      })()}

      {/* Workflow submenu (floats left of toolbox) */}
      {workflowMenu && (
        <div
          className="fixed z-50 bg-surface-2 border border-surface-4 rounded-xl shadow-2xl py-1 min-w-[140px]"
          style={{ right: 84, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(['kanban', 'flowchart', 'timeline'] as const).map(type => (
            <button
              key={type}
              onClick={() => { addWorkflowBlock(type); setWorkflowMenu(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors capitalize"
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Widget submenu (floats left of toolbox) */}
      {widgetMenu && (
        <div
          className="fixed z-50 max-h-[340px] min-w-[190px] overflow-y-auto bg-surface-2 border border-surface-4 rounded-xl shadow-2xl py-1"
          style={{ right: 84, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          onMouseDown={e => e.stopPropagation()}
        >
          {BOARD_WIDGET_TYPES.map(type => {
            const widget = getBoardWidgetMeta(type)
            return (
              <button
                key={type}
                onClick={() => { addBoardWidget(type); setWidgetMenu(false) }}
                title={widget.description}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors"
              >
                <span className="text-xs text-accent">▣</span>
                <span className="min-w-0 flex-1 truncate">{widget.title}</span>
              </button>
            )
          })}
        </div>
      )}

      <BoardToolbox
        zoom={zoom}
        toolboxItems={toolboxItems}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onResetView={resetView}
      />
      </div>{/* end board canvas */}
    </div>
  )
}
