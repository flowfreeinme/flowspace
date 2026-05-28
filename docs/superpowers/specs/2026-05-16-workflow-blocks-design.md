# Workflow Blocks — Design Spec
**Date:** 2026-05-16  
**Status:** Approved

---

## Overview

Add three self-contained workflow visualization blocks to the FlowSpace freeform board canvas: **Kanban**, **Flowchart**, and **Timeline**. Each is a draggable, resizable canvas block that stores its own structured data and renders an interactive view inline on the board.

---

## Architecture

### New Block Types

Extend `BlockType` in `src/types/index.ts`:

```ts
export type BlockType =
  | 'textbox'
  | 'section'
  | 'image'
  | 'kanban'      // new
  | 'flowchart'   // new
  | 'timeline'    // new
```

### Data Storage

All data stored as JSON in `Block.content` (existing pattern). No new database columns needed.

**Kanban:**
```ts
interface KanbanContent {
  columns: Array<{
    id: string
    title: string
    cards: Array<{
      id: string
      text: string
      assignee?: string
      status?: 'todo' | 'in-progress' | 'done'
    }>
  }>
}
```

**Flowchart:**
```ts
interface FlowchartContent {
  nodes: Array<{
    id: string
    label: string
    type: 'process' | 'decision' | 'start' | 'end'
    x: number
    y: number
  }>
  edges: Array<{
    from: string
    to: string
    label?: string
  }>
}
```

**Timeline:**
```ts
interface TimelineContent {
  groups: Array<{
    id: string
    label: string
    bars: Array<{
      id: string
      label: string
      start: string   // ISO date
      end: string     // ISO date
      color: string   // hex color, chosen from a preset palette of 8 colors
    }>
  }>
  dateRange: {
    start: string
    end: string
  }
}
```

---

## Entry Points

### Right-Click Context Menu (primary)
Canvas right-click → "Workflow" section header → three items:
- Kanban
- Flowchart
- Timeline

### Toolbox (secondary shortcut)
Toolbox → "Workflow" button → submenu with the same three options.

Both create a new block at the cursor/center position with default content and a fixed default size of 520×360px.

---

## Block Rendering

### Component Structure

```
BoardView
  └─ BlockRenderer (switch on block.type)
       ├─ KanbanBlock     (src/components/blocks/KanbanBlock.tsx)
       ├─ FlowchartBlock  (src/components/blocks/FlowchartBlock.tsx)
       └─ TimelineBlock   (src/components/blocks/TimelineBlock.tsx)
```

Each block component receives:
- `block: Block` — full block record
- `onUpdate: (content: string) => void` — persists JSON content changes (debounced 300ms to avoid thrashing on drag events)

### Block Chrome
Shared chrome (drag handle, resize handle, block header with title + toolbar icons) is identical across all three. Only the body differs.

### Interaction Isolation
Internal interactions (card drag, node connect, timeline scroll) must not propagate to canvas-level drag. Use `e.stopPropagation()` on pointer events inside block bodies.

---

## Per-Block Interactions

### Kanban
- Drag cards between columns within the block
- Click "+ Add card" to append a card to a column
- Click "+ Add column" to append a new column
- Click card text to inline-edit

### Flowchart
- Double-click inside the flowchart block body to add a node at that position
- Drag node-to-node connector handles to create edges
- Pan with two-finger scroll or middle-click drag within block
- Double-click node to edit label

### Timeline
- Scroll horizontally to move through time
- Click a bar to edit label and date range
- Click "+ Add" to append a new row/group
- Bars colored by group; color picker on click

---

## Visual Design

Follows FlowSpace dark theme (from `themes/default.css`):

| Layer | Token | Usage |
|-------|-------|-------|
| Canvas bg | `--bg` (`#0f0f0f`) | Block body background |
| Block chrome | `--surface-1` (`#1a1a1a`) | Block header, borders |
| Cards / nodes / tracks | `--surface-2` (`#242424`) | Interactive elements |
| Borders / dividers | `--surface-3` (`#2e2e2e`) | 1.5px borders |
| Accent | `--accent` (`#7c6af7`) | Primary actions, active states |

Reference: `.planning/sketches/003-workflow-block-previews/index.html`

---

## Out of Scope (v1)

- Syncing Kanban cards with tasks in other pages
- Real-time collaboration on workflow blocks
- Exporting Flowchart as image/SVG
- Timeline critical-path calculations
- AI-assisted workflow generation

---

## Success Criteria

- User can right-click the canvas and create any of the three block types
- Each block renders its data correctly and persists changes via `Block.content`
- Internal interactions don't accidentally trigger canvas drag/pan
- Blocks are resizable and their internal layout responds to block dimensions
- Data survives page reload (Supabase persistence via existing save flow)
