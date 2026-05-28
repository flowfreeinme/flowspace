import { v4 as uuid } from 'uuid'
import type { WorkspaceData, Page, Block } from '@/types'

const CARD_W = 280
const CARD_H = 140

function card(text: string, x: number, y: number, w = CARD_W, h = CARD_H): Block {
  return { id: uuid(), type: 'textbox', content: JSON.stringify({ text, x, y, width: w, height: h }) }
}

function section(title: string, x: number, y: number): Block {
  return { id: uuid(), type: 'section', content: JSON.stringify({ title, x, y }) }
}

function makeBoard(title: string, icon: string, blocks: Block[]): Page {
  return {
    id: uuid(),
    title,
    icon,
    blocks,
    boardMode: true,
    children: [],
    parentId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function createDefaultWorkspace(): WorkspaceData {
  // ── Welcome board ──────────────────────────────────────────────────────────
  const welcome = makeBoard('Welcome to FlowSpace', '👋', [
    section('Getting Started', 0, 300),
    card('Double-click anywhere on the canvas to create a new card.\nDrag any card to reposition it.', 0, 344),
    card('Right-click the canvas to add a Section label for organizing your board.', 300, 344),
    card('Use the Lasso tool (toolbar) to draw a freehand selection around multiple items and move or resize them together.', 600, 344),

    section('Images & Drawing', 0, 544),
    card('Click 📎 Attach in the toolbar to upload an image directly onto your board.', 0, 588),
    card('Click ✏️ Draw in the toolbar to sketch anything — your drawing is saved as an image block.', 300, 588),
    card('Share any board with a teammate via right-click → Share in the sidebar.', 600, 588),

    section('Keyboard Shortcuts', 0, 788),
    card('Cmd+N — new board\nCmd+W — close tab\nCmd+K — command palette\nCmd+H — home', 0, 832, CARD_W, 120),
    card('Cmd+A — select all\nCmd+[ — toggle sidebar\nDelete — remove selected\nEscape — deselect', 300, 832, CARD_W, 120),
    card('Scroll — zoom in/out\nDrag canvas — pan\nDouble-click card border — resize handles\nDouble-click canvas — new card', 600, 832, CARD_W, 120),
  ])

  // ── My Tasks board (kanban) ────────────────────────────────────────────────
  const tasks = makeBoard('My Tasks', '✅', [
    section('To Do', 0, 300),
    card('Add your first task here', 0, 344),
    card('', 0, 504),

    section('In Progress', 300, 300),
    card('', 300, 344),

    section('Done', 600, 300),
    card('', 600, 344),
  ])

  // ── My Notes board ─────────────────────────────────────────────────────────
  const notes = makeBoard('My Notes', '📝', [
    section('Quick Notes', 0, 300),
    card('', 0, 344),
  ])

  const tabId = uuid()
  return {
    pages: {
      [welcome.id]: welcome,
      [tasks.id]: tasks,
      [notes.id]: notes,
    },
    rootPages: [welcome.id, tasks.id, notes.id],
    tabs: [{ id: tabId, pageId: welcome.id }],
    activeTabId: tabId,
  }
}
