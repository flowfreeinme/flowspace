# Workflow Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Kanban, Flowchart, and Timeline as draggable, resizable, self-contained blocks on the FlowSpace freeform board canvas, accessible via right-click context menu and toolbox submenu.

**Architecture:** Three new `BlockType` values (`kanban`, `flowchart`, `timeline`) store structured JSON in `Block.content` alongside position + size — identical to the existing `textbox`/`image` pattern. Each type gets a dedicated renderer component (`KanbanBlock`, `FlowchartBlock`, `TimelineBlock`). `BoardView` wires them into the existing drag/resize/lasso/fitToContent system.

**Tech Stack:** React + TypeScript, Zustand (`useWorkspace`), inline CSS (matching dark theme tokens), Vitest for unit tests, `uuid` for IDs, no new dependencies.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/workflowBlocks.ts` | Types, parse functions, default-content factories |
| Create | `src/lib/workflowBlocks.test.ts` | Unit tests for parsers and default factories |
| Create | `src/components/blocks/KanbanBlock.tsx` | Kanban board renderer + internal interactions |
| Create | `src/components/blocks/FlowchartBlock.tsx` | Flowchart node/edge renderer + internal interactions |
| Create | `src/components/blocks/TimelineBlock.tsx` | Timeline bar renderer + internal interactions |
| Modify | `src/types/index.ts` | Add `'kanban' \| 'flowchart' \| 'timeline'` to `BlockType` |
| Modify | `src/components/BoardView.tsx` | Import, render, wire drag/resize/lasso/fitToContent/entry-points |
| Modify | `src/components/BoardToolbox.tsx` | Add `submenu` support to `ToolboxItem` for Workflow button |

---

## Task 1: Types, parsers, and default-content factories

**Files:**
- Create: `src/lib/workflowBlocks.ts`
- Create: `src/lib/workflowBlocks.test.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/workflowBlocks.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseKanban, parseFlowchart, parseTimeline,
  defaultKanban, defaultFlowchart, defaultTimeline,
} from './workflowBlocks'

describe('parseKanban', () => {
  it('returns valid data for well-formed JSON', () => {
    const data = { x: 10, y: 20, width: 520, height: 360, columns: [] }
    expect(parseKanban(JSON.stringify(data))).toEqual(data)
  })
  it('returns a numeric-x fallback for garbage input', () => {
    const result = parseKanban('not json')
    expect(typeof result.x).toBe('number')
    expect(Array.isArray(result.columns)).toBe(true)
  })
})

describe('parseFlowchart', () => {
  it('returns valid data for well-formed JSON', () => {
    const data = { x: 5, y: 5, width: 520, height: 360, nodes: [], edges: [] }
    expect(parseFlowchart(JSON.stringify(data))).toEqual(data)
  })
  it('returns fallback arrays for empty object', () => {
    const result = parseFlowchart('{}')
    expect(Array.isArray(result.nodes)).toBe(true)
    expect(Array.isArray(result.edges)).toBe(true)
  })
})

describe('parseTimeline', () => {
  it('returns valid data for well-formed JSON', () => {
    const data = { x: 0, y: 0, width: 520, height: 360, groups: [], dateRange: { start: '2026-01-01', end: '2026-02-01' } }
    expect(parseTimeline(JSON.stringify(data))).toEqual(data)
  })
  it('returns dateRange with ISO date strings for bad input', () => {
    const result = parseTimeline('bad')
    expect(result.dateRange.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.dateRange.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('defaultKanban', () => {
  it('places block at given coordinates with 3 columns', () => {
    const data = defaultKanban(100, 200)
    expect(data.x).toBe(100)
    expect(data.y).toBe(200)
    expect(data.columns).toHaveLength(3)
    expect(data.columns[0].title).toBe('To Do')
  })
})

describe('defaultFlowchart', () => {
  it('places block at given coordinates with a start node', () => {
    const data = defaultFlowchart(50, 80)
    expect(data.x).toBe(50)
    expect(data.y).toBe(80)
    expect(data.nodes[0].type).toBe('start')
  })
})

describe('defaultTimeline', () => {
  it('places block at given coordinates with one group', () => {
    const data = defaultTimeline(0, 100)
    expect(data.y).toBe(100)
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0].label).toBe('Phase 1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/michael/flowspace && npm test -- workflowBlocks
```

Expected: FAIL — `Cannot find module './workflowBlocks'`

- [ ] **Step 3: Create `src/lib/workflowBlocks.ts`**

```ts
import { v4 as uuid } from 'uuid'

// ── Kanban ─────────────────────────────────────────────────────────────────

export interface KanbanCard {
  id: string
  text: string
  assignee?: string
  status?: 'todo' | 'in-progress' | 'done'
}

export interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
}

export interface KanbanData {
  x: number; y: number; width: number; height: number
  columns: KanbanColumn[]
}

// ── Flowchart ──────────────────────────────────────────────────────────────

export interface FlowchartNode {
  id: string
  label: string
  type: 'process' | 'decision' | 'start' | 'end'
  x: number; y: number
}

export interface FlowchartEdge {
  from: string; to: string; label?: string
}

export interface FlowchartData {
  x: number; y: number; width: number; height: number
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
}

// ── Timeline ───────────────────────────────────────────────────────────────

export interface TimelineBar {
  id: string; label: string; start: string; end: string; color: string
}

export interface TimelineGroup {
  id: string; label: string; bars: TimelineBar[]
}

export interface TimelineData {
  x: number; y: number; width: number; height: number
  groups: TimelineGroup[]
  dateRange: { start: string; end: string }
}

// ── Constants ──────────────────────────────────────────────────────────────

export const WORKFLOW_W = 520
export const WORKFLOW_H = 360

export const TIMELINE_COLORS = [
  '#7c6af7', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#8b5cf6', '#f97316',
]

// ── Parsers ────────────────────────────────────────────────────────────────

export function parseKanban(content: string): KanbanData {
  try {
    const d = JSON.parse(content) as KanbanData
    if (typeof d.x === 'number' && Array.isArray(d.columns)) return d
  } catch {}
  return { x: 0, y: 260, width: WORKFLOW_W, height: WORKFLOW_H, columns: [] }
}

export function parseFlowchart(content: string): FlowchartData {
  try {
    const d = JSON.parse(content) as FlowchartData
    if (typeof d.x === 'number' && Array.isArray(d.nodes)) return d
  } catch {}
  return { x: 0, y: 260, width: WORKFLOW_W, height: WORKFLOW_H, nodes: [], edges: [] }
}

export function parseTimeline(content: string): TimelineData {
  try {
    const d = JSON.parse(content) as TimelineData
    if (typeof d.x === 'number' && Array.isArray(d.groups)) return d
  } catch {}
  const today = new Date().toISOString().slice(0, 10)
  const monthOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { x: 0, y: 260, width: WORKFLOW_W, height: WORKFLOW_H, groups: [], dateRange: { start: today, end: monthOut } }
}

// ── Default content factories ──────────────────────────────────────────────

export function defaultKanban(x: number, y: number): KanbanData {
  return {
    x, y, width: WORKFLOW_W, height: WORKFLOW_H,
    columns: [
      { id: uuid(), title: 'To Do', cards: [] },
      { id: uuid(), title: 'In Progress', cards: [] },
      { id: uuid(), title: 'Done', cards: [] },
    ],
  }
}

export function defaultFlowchart(x: number, y: number): FlowchartData {
  return {
    x, y, width: WORKFLOW_W, height: WORKFLOW_H,
    nodes: [{ id: uuid(), label: 'Start', type: 'start', x: 210, y: 50 }],
    edges: [],
  }
}

export function defaultTimeline(x: number, y: number): TimelineData {
  const today = new Date().toISOString().slice(0, 10)
  const monthOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return {
    x, y, width: WORKFLOW_W, height: WORKFLOW_H,
    groups: [{ id: uuid(), label: 'Phase 1', bars: [] }],
    dateRange: { start: today, end: monthOut },
  }
}

// ── Date helpers (used by TimelineBlock) ──────────────────────────────────

export function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000)
}

export function barOffsetPct(barStart: string, rangeStart: string, totalDays: number): number {
  return Math.max(0, daysBetween(rangeStart, barStart) / totalDays) * 100
}

export function barWidthPct(barStart: string, barEnd: string, totalDays: number): number {
  return Math.max(1, daysBetween(barStart, barEnd) / totalDays) * 100
}
```

- [ ] **Step 4: Add `'kanban' | 'flowchart' | 'timeline'` to `BlockType` in `src/types/index.ts`**

Change:
```ts
export type BlockType =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'todo'
  | 'bullet'
  | 'numbered'
  | 'code'
  | 'divider'
  | 'quote'
  | 'file'
  | 'textbox'
  | 'section'
  | 'image'
```

To:
```ts
export type BlockType =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'todo'
  | 'bullet'
  | 'numbered'
  | 'code'
  | 'divider'
  | 'quote'
  | 'file'
  | 'textbox'
  | 'section'
  | 'image'
  | 'kanban'
  | 'flowchart'
  | 'timeline'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/michael/flowspace && npm test -- workflowBlocks
```

Expected: 9 tests PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/michael/flowspace && git add src/lib/workflowBlocks.ts src/lib/workflowBlocks.test.ts src/types/index.ts && git commit -m "feat: add workflow block types, parsers, and default-content factories"
```

---

## Task 2: KanbanBlock component

**Files:**
- Create: `src/components/blocks/KanbanBlock.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/michael/flowspace/src/components/blocks
```

- [ ] **Step 2: Create `src/components/blocks/KanbanBlock.tsx`**

```tsx
import { useState, useRef } from 'react'
import { X, GripVertical, Plus } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { parseKanban } from '@/lib/workflowBlocks'
import type { KanbanData, KanbanCard, KanbanColumn } from '@/lib/workflowBlocks'
import type { Block } from '@/types'

const CORNER_HANDLES = [
  { id: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
  { id: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
  { id: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
  { id: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
] as const

interface KanbanBlockProps {
  block: Block
  selected: boolean
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onUpdate: (content: string) => void
  onDelete: () => void
}

export default function KanbanBlock({
  block, selected, zoom,
  onDragStart, onResizeHandleMouseDown, onUpdate, onDelete,
}: KanbanBlockProps) {
  const [data, setData] = useState<KanbanData>(() => parseKanban(block.content))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draggingCard, setDraggingCard] = useState<{ cardId: string; fromColId: string } | null>(null)

  function save(next: KanbanData) {
    setData(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdate(JSON.stringify(next)), 300)
  }

  function addCard(colId: string) {
    const newCard: KanbanCard = { id: uuid(), text: 'New card' }
    save({ ...data, columns: data.columns.map(c => c.id === colId ? { ...c, cards: [...c.cards, newCard] } : c) })
  }

  function addColumn() {
    const newCol: KanbanColumn = { id: uuid(), title: 'New Column', cards: [] }
    save({ ...data, columns: [...data.columns, newCol] })
  }

  function updateCardText(colId: string, cardId: string, text: string) {
    save({ ...data, columns: data.columns.map(c => c.id === colId ? { ...c, cards: c.cards.map(card => card.id === cardId ? { ...card, text } : card) } : c) })
  }

  function deleteCard(colId: string, cardId: string) {
    save({ ...data, columns: data.columns.map(c => c.id === colId ? { ...c, cards: c.cards.filter(card => card.id !== cardId) } : c) })
  }

  function updateColumnTitle(colId: string, title: string) {
    save({ ...data, columns: data.columns.map(c => c.id === colId ? { ...c, title } : c) })
  }

  function onDrop(e: React.DragEvent, toColId: string) {
    e.preventDefault()
    if (!draggingCard || draggingCard.fromColId === toColId) return
    const { cardId, fromColId } = draggingCard
    const card = data.columns.find(c => c.id === fromColId)?.cards.find(c => c.id === cardId)
    if (!card) return
    save({
      ...data,
      columns: data.columns.map(c => {
        if (c.id === fromColId) return { ...c, cards: c.cards.filter(cc => cc.id !== cardId) }
        if (c.id === toColId) return { ...c, cards: [...c.cards, card] }
        return c
      }),
    })
    setDraggingCard(null)
  }

  const HS = 8 / zoom

  return (
    <div
      data-card
      style={{
        position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height,
        background: '#1a1a1a', border: `1.5px solid ${selected ? '#7c6af7' : '#2e2e2e'}`,
        borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header / drag handle */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #2e2e2e', cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
        onMouseDown={onDragStart}
      >
        <GripVertical size={12} style={{ color: '#4b5563', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>Kanban</span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex', alignItems: 'center' }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{ flex: 1, display: 'flex', gap: 8, padding: '10px', overflowX: 'auto', overflowY: 'hidden', background: '#0f0f0f' }}
        onMouseDown={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        {data.columns.map(col => (
          <div
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, col.id)}
            style={{ minWidth: 160, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}
          >
            <div
              contentEditable suppressContentEditableWarning
              onBlur={e => updateColumnTitle(col.id, e.currentTarget.textContent ?? col.title)}
              style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '2px 4px', outline: 'none', borderRadius: 4 }}
            >
              {col.title}
            </div>
            {col.cards.map(card => (
              <div
                key={card.id}
                draggable
                onDragStart={() => setDraggingCard({ cardId: card.id, fromColId: col.id })}
                style={{ background: '#242424', border: '1.5px solid #2e2e2e', borderRadius: 8, padding: '8px 10px', position: 'relative', cursor: 'grab' }}
              >
                <div
                  contentEditable suppressContentEditableWarning
                  onBlur={e => updateCardText(col.id, card.id, e.currentTarget.textContent ?? '')}
                  style={{ fontSize: 12, color: '#e5e7eb', outline: 'none', minHeight: 16 }}
                >
                  {card.text}
                </div>
                <button
                  onClick={() => deleteCard(col.id, card.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addCard(col.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: 11, padding: '4px 4px', borderRadius: 6, textAlign: 'left' }}
            >
              <Plus size={11} /> Add card
            </button>
          </div>
        ))}
        <button
          onClick={addColumn}
          style={{ minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#1a1a1a', border: '1.5px dashed #2e2e2e', borderRadius: 8, cursor: 'pointer', color: '#4b5563', fontSize: 11, flexShrink: 0, alignSelf: 'flex-start', padding: '8px 12px', marginTop: 18 }}
        >
          <Plus size={11} /> Column
        </button>
      </div>

      {/* Resize corner handles */}
      {CORNER_HANDLES.map(h => (
        <div
          key={h.id}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }}
          style={{
            position: 'absolute', width: HS, height: HS,
            background: selected ? '#7c6af7' : '#3b3b3b',
            border: `${1 / zoom}px solid rgba(255,255,255,0.3)`,
            borderRadius: 2 / zoom,
            ...h.style,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `KanbanBlock.tsx`

- [ ] **Step 4: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/blocks/KanbanBlock.tsx && git commit -m "feat: add KanbanBlock component with column drag-and-drop"
```

---

## Task 3: FlowchartBlock component

**Files:**
- Create: `src/components/blocks/FlowchartBlock.tsx`

- [ ] **Step 1: Create `src/components/blocks/FlowchartBlock.tsx`**

```tsx
import { useState, useRef } from 'react'
import { X, GripVertical, Plus } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { parseFlowchart } from '@/lib/workflowBlocks'
import type { FlowchartData, FlowchartNode, FlowchartEdge } from '@/lib/workflowBlocks'
import type { Block } from '@/types'

const CORNER_HANDLES = [
  { id: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
  { id: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
  { id: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
  { id: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
] as const

const NODE_COLORS: Record<FlowchartNode['type'], string> = {
  start: '#22c55e',
  end: '#ef4444',
  decision: '#f59e0b',
  process: '#7c6af7',
}

const NODE_W = 120
const NODE_H = 44

interface FlowchartBlockProps {
  block: Block
  selected: boolean
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onUpdate: (content: string) => void
  onDelete: () => void
}

export default function FlowchartBlock({
  block, selected, zoom,
  onDragStart, onResizeHandleMouseDown, onUpdate, onDelete,
}: FlowchartBlockProps) {
  const [data, setData] = useState<FlowchartData>(() => parseFlowchart(block.content))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<{ id: string; ox: number; oy: number; startX: number; startY: number } | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  function save(next: FlowchartData) {
    setData(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdate(JSON.stringify(next)), 300)
  }

  function addNode(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-fc-node]')) return
    const rect = bodyRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - NODE_W / 2
    const y = e.clientY - rect.top - NODE_H / 2
    const newNode: FlowchartNode = { id: uuid(), label: 'Step', type: 'process', x, y }
    save({ ...data, nodes: [...data.nodes, newNode] })
  }

  function updateNodeLabel(id: string, label: string) {
    save({ ...data, nodes: data.nodes.map(n => n.id === id ? { ...n, label } : n) })
    setEditingNodeId(null)
  }

  function deleteNode(id: string) {
    save({ ...data, nodes: data.nodes.filter(n => n.id !== id), edges: data.edges.filter(e => e.from !== id && e.to !== id) })
  }

  function handleNodeClick(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation()
    if (connectFrom === null) {
      setConnectFrom(nodeId)
    } else if (connectFrom !== nodeId) {
      const newEdge: FlowchartEdge = { from: connectFrom, to: nodeId }
      save({ ...data, edges: [...data.edges, newEdge] })
      setConnectFrom(null)
    } else {
      setConnectFrom(null)
    }
  }

  function startNodeDrag(e: React.MouseEvent, nodeId: string, nodeX: number, nodeY: number) {
    e.stopPropagation()
    e.preventDefault()
    setDraggingNode({ id: nodeId, ox: nodeX, oy: nodeY, startX: e.clientX, startY: e.clientY })
  }

  function onBodyMouseMove(e: React.MouseEvent) {
    if (!draggingNode) return
    const dx = e.clientX - draggingNode.startX
    const dy = e.clientY - draggingNode.startY
    setData(d => ({ ...d, nodes: d.nodes.map(n => n.id === draggingNode.id ? { ...n, x: draggingNode.ox + dx, y: draggingNode.oy + dy } : n) }))
  }

  function onBodyMouseUp() {
    if (draggingNode) {
      save(data)
      setDraggingNode(null)
    }
  }

  function getNodeCenter(node: FlowchartNode) {
    return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 }
  }

  const bodyH = data.height - 44

  const HS = 8 / zoom

  return (
    <div
      data-card
      style={{
        position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height,
        background: '#1a1a1a', border: `1.5px solid ${selected ? '#7c6af7' : '#2e2e2e'}`,
        borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #2e2e2e', cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
        onMouseDown={onDragStart}
      >
        <GripVertical size={12} style={{ color: '#4b5563', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>Flowchart</span>
        {connectFrom && <span style={{ fontSize: 10, color: '#7c6af7', fontWeight: 500 }}>click a node to connect →</span>}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex', alignItems: 'center' }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        style={{ flex: 1, position: 'relative', background: '#0f0f0f', overflow: 'hidden', cursor: connectFrom ? 'crosshair' : 'default' }}
        onMouseDown={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        onDoubleClick={addNode}
        onMouseMove={onBodyMouseMove}
        onMouseUp={onBodyMouseUp}
        onMouseLeave={onBodyMouseUp}
      >
        {/* Edges SVG layer */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
          {data.edges.map((edge, i) => {
            const from = data.nodes.find(n => n.id === edge.from)
            const to = data.nodes.find(n => n.id === edge.to)
            if (!from || !to) return null
            const fc = getNodeCenter(from), tc = getNodeCenter(to)
            const mx = (fc.x + tc.x) / 2, my = (fc.y + tc.y) / 2
            return (
              <g key={i}>
                <path
                  d={`M${fc.x},${fc.y} Q${mx},${fc.y} ${tc.x},${tc.y}`}
                  stroke="#3b3b3b" strokeWidth={1.5} fill="none"
                  markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                  <text x={mx} y={my - 6} fill="#6b7280" fontSize={10} textAnchor="middle">{edge.label}</text>
                )}
              </g>
            )
          })}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b3b3b" />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {data.nodes.map(node => {
          const color = NODE_COLORS[node.type]
          const isConnecting = connectFrom === node.id
          return (
            <div
              key={node.id}
              data-fc-node
              style={{
                position: 'absolute', left: node.x, top: node.y, width: NODE_W, height: NODE_H,
                background: '#242424', border: `1.5px solid ${isConnecting ? '#7c6af7' : color}`,
                borderRadius: node.type === 'decision' ? 0 : node.type === 'start' || node.type === 'end' ? NODE_H / 2 : 8,
                transform: node.type === 'decision' ? 'rotate(45deg)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none',
                boxShadow: isConnecting ? `0 0 0 2px #7c6af7` : 'none',
              }}
              onClick={e => handleNodeClick(e, node.id)}
              onDoubleClick={e => { e.stopPropagation(); setEditingNodeId(node.id) }}
              onMouseDown={e => startNodeDrag(e, node.id, node.x, node.y)}
            >
              <div style={{ transform: node.type === 'decision' ? 'rotate(-45deg)' : 'none', padding: '0 10px', width: '100%', textAlign: 'center' }}>
                {editingNodeId === node.id ? (
                  <input
                    autoFocus
                    defaultValue={node.label}
                    onBlur={e => updateNodeLabel(node.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 11, fontWeight: 600, color: '#e5e7eb', width: '100%', textAlign: 'center' }}
                  />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb' }}>{node.label}</span>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteNode(node.id) }}
                style={{ position: 'absolute', top: -8, right: -8, background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '50%', cursor: 'pointer', color: '#4b5563', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}
              >
                <X size={9} />
              </button>
            </div>
          )
        })}

        {/* Hint */}
        {data.nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: 12, pointerEvents: 'none', flexDirection: 'column', gap: 4 }}>
            <Plus size={20} style={{ opacity: 0.4 }} />
            <span>Double-click to add a node</span>
          </div>
        )}
      </div>

      {/* Resize handles */}
      {CORNER_HANDLES.map(h => (
        <div
          key={h.id}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }}
          style={{
            position: 'absolute', width: HS, height: HS,
            background: selected ? '#7c6af7' : '#3b3b3b',
            border: `${1 / zoom}px solid rgba(255,255,255,0.3)`,
            borderRadius: 2 / zoom,
            ...h.style,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `FlowchartBlock.tsx`

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/blocks/FlowchartBlock.tsx && git commit -m "feat: add FlowchartBlock component with node/edge interactions"
```

---

## Task 4: TimelineBlock component

**Files:**
- Create: `src/components/blocks/TimelineBlock.tsx`

- [ ] **Step 1: Create `src/components/blocks/TimelineBlock.tsx`**

```tsx
import { useState, useRef } from 'react'
import { X, GripVertical, Plus } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { parseTimeline, daysBetween, barOffsetPct, barWidthPct, TIMELINE_COLORS } from '@/lib/workflowBlocks'
import type { TimelineData, TimelineBar } from '@/lib/workflowBlocks'
import type { Block } from '@/types'

const CORNER_HANDLES = [
  { id: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
  { id: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
  { id: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
  { id: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
] as const

interface EditingBar {
  groupId: string
  bar: TimelineBar
}

interface TimelineBlockProps {
  block: Block
  selected: boolean
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onUpdate: (content: string) => void
  onDelete: () => void
}

export default function TimelineBlock({
  block, selected, zoom,
  onDragStart, onResizeHandleMouseDown, onUpdate, onDelete,
}: TimelineBlockProps) {
  const [data, setData] = useState<TimelineData>(() => parseTimeline(block.content))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingBar, setEditingBar] = useState<EditingBar | null>(null)

  function save(next: TimelineData) {
    setData(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdate(JSON.stringify(next)), 300)
  }

  function addGroup() {
    const colorIndex = data.groups.length % TIMELINE_COLORS.length
    save({ ...data, groups: [...data.groups, { id: uuid(), label: `Phase ${data.groups.length + 1}`, bars: [] }] })
  }

  function addBar(groupId: string) {
    const colorIndex = data.groups.findIndex(g => g.id === groupId) % TIMELINE_COLORS.length
    const newBar: TimelineBar = {
      id: uuid(), label: 'Task',
      start: data.dateRange.start,
      end: new Date(new Date(data.dateRange.start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      color: TIMELINE_COLORS[colorIndex],
    }
    save({ ...data, groups: data.groups.map(g => g.id === groupId ? { ...g, bars: [...g.bars, newBar] } : g) })
  }

  function updateBar(groupId: string, barId: string, changes: Partial<TimelineBar>) {
    save({
      ...data,
      groups: data.groups.map(g => g.id === groupId
        ? { ...g, bars: g.bars.map(b => b.id === barId ? { ...b, ...changes } : b) }
        : g
      ),
    })
    setEditingBar(prev => prev ? { ...prev, bar: { ...prev.bar, ...changes } } : null)
  }

  function deleteBar(groupId: string, barId: string) {
    save({ ...data, groups: data.groups.map(g => g.id === groupId ? { ...g, bars: g.bars.filter(b => b.id !== barId) } : g) })
    setEditingBar(null)
  }

  function deleteGroup(groupId: string) {
    save({ ...data, groups: data.groups.filter(g => g.id !== groupId) })
  }

  function updateGroupLabel(groupId: string, label: string) {
    save({ ...data, groups: data.groups.map(g => g.id === groupId ? { ...g, label } : g) })
  }

  const totalDays = Math.max(1, daysBetween(data.dateRange.start, data.dateRange.end))
  const HS = 8 / zoom

  // Month header labels
  const months: { label: string; left: string }[] = []
  const start = new Date(data.dateRange.start)
  const end = new Date(data.dateRange.end)
  let cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= end) {
    const offset = daysBetween(data.dateRange.start, cur.toISOString().slice(0, 10))
    const pct = Math.max(0, (offset / totalDays) * 100)
    months.push({ label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }), left: `${pct}%` })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }

  return (
    <div
      data-card
      style={{
        position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height,
        background: '#1a1a1a', border: `1.5px solid ${selected ? '#7c6af7' : '#2e2e2e'}`,
        borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #2e2e2e', cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
        onMouseDown={onDragStart}
      >
        <GripVertical size={12} style={{ color: '#4b5563', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>Timeline</span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex', alignItems: 'center' }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{ flex: 1, background: '#0f0f0f', overflow: 'auto', padding: '10px 14px 10px 10px' }}
        onMouseDown={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        {/* Month header */}
        <div style={{ position: 'relative', height: 20, marginLeft: 72, marginBottom: 8, flexShrink: 0 }}>
          {months.map((m, i) => (
            <span key={i} style={{ position: 'absolute', left: m.left, fontSize: 10, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {m.label}
            </span>
          ))}
        </div>

        {/* Groups */}
        {data.groups.map((group, gi) => (
          <div key={group.id} style={{ marginBottom: 8 }}>
            {/* Group label row */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <div
                contentEditable suppressContentEditableWarning
                onBlur={e => updateGroupLabel(group.id, e.currentTarget.textContent ?? group.label)}
                style={{ width: 64, fontSize: 10, fontWeight: 600, color: '#6b7280', outline: 'none', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {group.label}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 28, background: '#242424', borderRadius: 8, border: '1.5px solid #2e2e2e', overflow: 'visible', marginLeft: 8 }}>
                {group.bars.map(bar => (
                  <div
                    key={bar.id}
                    onClick={() => setEditingBar({ groupId: group.id, bar })}
                    style={{
                      position: 'absolute',
                      left: `${barOffsetPct(bar.start, data.dateRange.start, totalDays)}%`,
                      width: `${barWidthPct(bar.start, bar.end, totalDays)}%`,
                      top: 4, bottom: 4, borderRadius: 6,
                      background: bar.color, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: '0 8px',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addBar(group.id)}
                style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                title="Add bar"
              >
                <Plus size={11} />
              </button>
              <button
                onClick={() => deleteGroup(group.id)}
                style={{ marginLeft: 2, background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                title="Delete group"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ))}

        {/* Add group */}
        <button
          onClick={addGroup}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: 11, padding: '4px 0', marginTop: 4 }}
        >
          <Plus size={11} /> Add group
        </button>

        {/* Bar edit popover */}
        {editingBar && (() => {
          const { groupId, bar } = editingBar
          return (
            <div
              style={{ position: 'fixed', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 10, padding: 12, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 220 }}
              onMouseDown={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Edit bar</span>
                <button onClick={() => setEditingBar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}><X size={12} /></button>
              </div>
              <input
                defaultValue={bar.label}
                onBlur={e => updateBar(groupId, bar.id, { label: e.target.value })}
                style={{ width: '100%', background: '#242424', border: '1px solid #2e2e2e', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#e5e7eb', outline: 'none', marginBottom: 6, boxSizing: 'border-box' }}
                placeholder="Label"
              />
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input type="date" defaultValue={bar.start} onBlur={e => updateBar(groupId, bar.id, { start: e.target.value })}
                  style={{ flex: 1, background: '#242424', border: '1px solid #2e2e2e', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#e5e7eb', outline: 'none', colorScheme: 'dark' }} />
                <span style={{ color: '#4b5563', fontSize: 11, alignSelf: 'center' }}>→</span>
                <input type="date" defaultValue={bar.end} onBlur={e => updateBar(groupId, bar.id, { end: e.target.value })}
                  style={{ flex: 1, background: '#242424', border: '1px solid #2e2e2e', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: '#e5e7eb', outline: 'none', colorScheme: 'dark' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {TIMELINE_COLORS.map(c => (
                  <button key={c} onClick={() => updateBar(groupId, bar.id, { color: c })}
                    style={{ width: 20, height: 20, borderRadius: 4, background: c, border: bar.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <button onClick={() => deleteBar(groupId, bar.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 11, padding: 0 }}>
                Delete bar
              </button>
            </div>
          )
        })()}
      </div>

      {/* Resize handles */}
      {CORNER_HANDLES.map(h => (
        <div
          key={h.id}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }}
          style={{
            position: 'absolute', width: HS, height: HS,
            background: selected ? '#7c6af7' : '#3b3b3b',
            border: `${1 / zoom}px solid rgba(255,255,255,0.3)`,
            borderRadius: 2 / zoom,
            ...h.style,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `TimelineBlock.tsx`

- [ ] **Step 3: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/blocks/TimelineBlock.tsx && git commit -m "feat: add TimelineBlock component with group/bar editing"
```

---

## Task 5: Wire BoardView — rendering, drag/resize, lasso, fitToContent, Cmd+A

**Files:**
- Modify: `src/components/BoardView.tsx`

This task modifies `BoardView.tsx` in multiple places. Make each change carefully — the file is large.

- [ ] **Step 1: Add imports near the top of `BoardView.tsx` (after the existing imports)**

After the line `import BoardToolbox from './BoardToolbox'`, add:

```tsx
import KanbanBlock from './blocks/KanbanBlock'
import FlowchartBlock from './blocks/FlowchartBlock'
import TimelineBlock from './blocks/TimelineBlock'
import {
  parseKanban, parseFlowchart, parseTimeline,
  defaultKanban, defaultFlowchart, defaultTimeline,
} from '@/lib/workflowBlocks'
```

- [ ] **Step 2: Extend the `DragOp` union type**

Find the `type DragOp = ...` declaration and add two variants at the end:

```ts
  | { kind: 'workflow'; id: string; mx0: number; my0: number; cx0: number; cy0: number }
  | { kind: 'workflow-resize'; id: string; handle: string; mx0: number; my0: number; cx0: number; cy0: number; w0: number; h0: number }
```

- [ ] **Step 3: Add `addWorkflowBlock` helper function**

Add after the `addSection` function (around line 592):

```ts
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
```

- [ ] **Step 4: Add workflow blocks handling to `onMouseMove`**

In `onMouseMove`, after the `if (op.kind === 'image') { ... return }` block, add:

```ts
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
  if (hh.includes('e')) w = Math.max(320, op.w0 + dx)
  if (hh.includes('s')) h = Math.max(200, op.h0 + dy)
  if (hh.includes('w')) { w = Math.max(320, op.w0 - dx); x = op.cx0 + op.w0 - w }
  if (hh.includes('n')) { h = Math.max(200, op.h0 - dy); y = op.cy0 + op.h0 - h }
  updateBlock(pageId, op.id, { content: JSON.stringify({ ...d, x, y, width: Math.round(w), height: Math.round(h) }) }); return
}
```

Also in `onMouseMove`, in the `lasso-move` block, add workflow support after the `else if (block.type === 'image')` clause:

```ts
else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
  const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
  updateBlock(pageId, id, { content: JSON.stringify({ ...parse(block.content), x: origin.x + dx, y: origin.y + dy }) })
}
```

And in the `lasso-resize` block, after the `else if (block.type === 'section')` clause:

```ts
} else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
  const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
  const d = parse(block.content)
  updateBlock(pageId, id, { content: JSON.stringify({ ...d, x: nx, y: ny, width: Math.max(320, (orig.w ?? d.width) * sx), height: Math.max(200, (orig.h ?? d.height) * sy) }) })
}
```

- [ ] **Step 5: Add workflow blocks to lasso selection (in `onMouseUp`)**

In `onMouseUp`, inside the `p?.blocks.forEach` that builds `hits`, add after the `else if (b.type === 'image')` block:

```ts
else if (b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline') {
  const parse = b.type === 'kanban' ? parseKanban : b.type === 'flowchart' ? parseFlowchart : parseTimeline
  const d = parse(b.content)
  if (polyHitsRect(poly, d.x, d.y, d.width, d.height)) hits.add(b.id)
}
```

- [ ] **Step 6: Add workflow blocks to `fitToContent`**

In `fitToContent`, inside the `for (const b of blocks)` loop, add after the `else if (b.type === 'image')` block:

```ts
} else if (b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline') {
  const parse = b.type === 'kanban' ? parseKanban : b.type === 'flowchart' ? parseFlowchart : parseTimeline
  const d = parse(b.content)
  minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
  maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
}
```

- [ ] **Step 7: Add workflow blocks to `selBBox` computation**

In the `selBBox` computation (IIFE), after the `else if (b.type === 'image')` block:

```ts
} else if (b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline') {
  const parse = b.type === 'kanban' ? parseKanban : b.type === 'flowchart' ? parseFlowchart : parseTimeline
  const d = parse(b.content)
  minX = Math.min(minX, d.x); minY = Math.min(minY, d.y)
  maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height)
}
```

- [ ] **Step 8: Add workflow blocks to Cmd+A selection**

Find the `Cmd/Ctrl+A — select all` keyboard shortcut:

```ts
if (p) setSelectedIds(new Set(p.blocks.filter(b => b.type === 'textbox' || b.type === 'section' || b.type === 'image').map(b => b.id)))
```

Change to:

```ts
if (p) setSelectedIds(new Set(p.blocks.filter(b => b.type === 'textbox' || b.type === 'section' || b.type === 'image' || b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline').map(b => b.id)))
```

- [ ] **Step 9: Add workflow blocks to `startGroupMove`**

In `startGroupMove`, after the `else if (block.type === 'image')` block:

```ts
} else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
  const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
  const d = parse(block.content)
  origins[id] = { x: d.x, y: d.y }
}
```

- [ ] **Step 10: Add workflow blocks to `startBboxResize`**

In `startBboxResize`, after the `else if (block.type === 'image')` block:

```ts
} else if (block.type === 'kanban' || block.type === 'flowchart' || block.type === 'timeline') {
  const parse = block.type === 'kanban' ? parseKanban : block.type === 'flowchart' ? parseFlowchart : parseTimeline
  const d = parse(block.content)
  items0[id] = { x: d.x, y: d.y, w: d.width, h: d.height }
}
```

- [ ] **Step 11: Fix auto-create first card to not trigger when workflow blocks exist**

Find:

```ts
if (!page || page.blocks.some(b => b.type === 'textbox')) return
```

Change to:

```ts
if (!page || page.blocks.some(b => b.type === 'textbox' || b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline')) return
```

- [ ] **Step 12: Derive workflow blocks and render them in the canvas**

After the line `const images = ...`, add:

```ts
const workflowBlocks = (page?.blocks ?? []).filter(b => b.type === 'kanban' || b.type === 'flowchart' || b.type === 'timeline')
```

In the canvas JSX, after the `{/* Cards */}` section (after the cards `.map(...)`), add:

```tsx
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
```

- [ ] **Step 13: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 14: Run all tests**

```bash
cd /Users/michael/flowspace && npm test
```

Expected: all existing tests plus the 9 new workflow block tests pass

- [ ] **Step 15: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/BoardView.tsx && git commit -m "feat: wire workflow blocks into BoardView (render, drag, resize, lasso, fitToContent)"
```

---

## Task 6: Entry points — context menu + toolbox submenu

**Files:**
- Modify: `src/components/BoardView.tsx` (context menu + submenu state)
- Modify: `src/components/BoardToolbox.tsx` (submenu prop support)

- [ ] **Step 1: Add workflow submenu state to `BoardView.tsx`**

Near the other `useState` declarations at the top of the component, add:

```ts
const [workflowMenu, setWorkflowMenu] = useState(false)
```

- [ ] **Step 2: Close workflow menu on viewport click**

In `handleViewportMouseDown`, before the existing logic, add:

```ts
setWorkflowMenu(false)
```

- [ ] **Step 3: Add "Workflow" item to `toolboxItems`**

The `toolboxItems` array is declared before the return. Add at the end of the array:

```tsx
{ icon: <LayoutGrid size={15} />, label: 'Workflow', active: workflowMenu, onClick: () => setWorkflowMenu(v => !v) },
```

Also add `LayoutGrid` to the lucide-react import at the top of `BoardView.tsx`.

- [ ] **Step 4: Add the toolbox submenu panel**

Immediately before the `<BoardToolbox .../>` component in the return JSX, add:

```tsx
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
```

- [ ] **Step 5: Add "Workflow" section to the right-click context menu**

In the context menu JSX (the `{ctxMenu && ...}` block), after the `<button>Ask AI</button>` item, add:

```tsx
<div className="border-t border-surface-3 my-1" />
<div className="px-3 py-1 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Workflow</div>
<button onClick={() => addWorkflowBlock('kanban', ctxMenu.sx, ctxMenu.sy)}
  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
  <span className="text-xs">▦</span><span>Kanban</span>
</button>
<button onClick={() => addWorkflowBlock('flowchart', ctxMenu.sx, ctxMenu.sy)}
  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
  <span className="text-xs">◇</span><span>Flowchart</span>
</button>
<button onClick={() => addWorkflowBlock('timeline', ctxMenu.sx, ctxMenu.sy)}
  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3 transition-colors">
  <span className="text-xs">━</span><span>Timeline</span>
</button>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 7: Run all tests**

```bash
cd /Users/michael/flowspace && npm test
```

Expected: all tests pass

- [ ] **Step 8: Manual verification**

Start the dev server:

```bash
cd /Users/michael/flowspace && npm run dev
```

Verify:
1. Right-click on an empty area of a board → "Workflow" section appears with Kanban, Flowchart, Timeline
2. Click "Kanban" → a Kanban block appears at the cursor position with 3 default columns
3. Click "Flowchart" → a Flowchart block appears with a Start node
4. Click "Timeline" → a Timeline block appears with Phase 1 group
5. Toolbox "Workflow" button opens a submenu with the same three options
6. Workflow blocks can be dragged by their header
7. Corner handles resize the block
8. Lasso selection captures workflow blocks
9. Cmd+A selects all blocks including workflow blocks
10. Block data persists after page reload (open a board, add blocks, reload page)

- [ ] **Step 9: Commit**

```bash
cd /Users/michael/flowspace && git add src/components/BoardView.tsx src/components/BoardToolbox.tsx && git commit -m "feat: add right-click context menu and toolbox submenu entry points for workflow blocks"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Three new BlockTypes | Task 1 |
| JSON content in Block.content | Task 1 (parsers + factories) |
| Right-click "Workflow" section → Kanban/Flowchart/Timeline | Task 6 |
| Toolbox "Workflow" button → submenu | Task 6 |
| Created at cursor/center, 520×360px default | Task 5 (addWorkflowBlock) |
| KanbanBlock — column drag, add card/column, inline edit | Task 2 |
| FlowchartBlock — double-click add node, click-to-connect, drag node, edit label | Task 3 |
| TimelineBlock — bar rendering, edit popover, add group | Task 4 |
| stopPropagation on internal interactions | Tasks 2/3/4 (body onMouseDown) |
| Drag blocks on canvas | Task 5 (workflow DragOp kind) |
| Resize blocks on canvas | Task 5 (workflow-resize DragOp kind) |
| Lasso selection | Task 5 |
| fitToContent includes workflow blocks | Task 5 |
| Cmd+A selects workflow blocks | Task 5 |
| auto-create card doesn't fire when workflow block exists | Task 5 |
| Data persists via existing save flow | Task 5 (updateBlock → persist) |
| 300ms debounce on onUpdate | Tasks 2/3/4 (debounceRef) |

All spec requirements covered.
