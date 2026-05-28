---
sketch: 003
name: workflow-block-previews
question: "What do Kanban, Flowchart, and Timeline blocks look like on the canvas?"
winner: "all"
tags: [workflow, kanban, flowchart, timeline, canvas, blocks]
---

# Sketch 003: Workflow Block Previews

## Design Question
What does each workflow block type look and feel like as a self-contained canvas block?

## How to View
open .planning/sketches/003-workflow-block-previews/index.html

## Variants
- **A: Kanban** — Columns with draggable cards; muted column headers, card surfaces using --surface-2/--surface-3; status dots and assignee avatars
- **B: Flowchart** — Node-and-edge diagram; rounded nodes on --surface-2 with accent-colored connectors; add-node button in toolbar
- **C: Timeline** — Horizontal Gantt-style rows; track bars on --surface-2 with colored bars per phase; month grid headers, group labels, legend at bottom

## Winner
All three — each variant defines the visual design for its respective block type. All approved.

## What to Look For
- Dark surface hierarchy: bg → surface-1 (block chrome) → surface-2 (cards/nodes/tracks) → surface-3 (borders)
- Accent color used sparingly (primary actions, active states, colored bars)
- Block header consistent across all three (title + toolbar icons + resize handle)
