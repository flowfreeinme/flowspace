---
sketch: 001
name: board-card-ai-toolbar
question: "Where should the AI text toolbar live on board cards, and how should it look?"
winner: null
tags: [ai, board, text-editing, toolbar]
---

# Sketch 001: Board Card AI Toolbar

## Design Question
Where does the AI text toolbar appear when editing a board card, and how should it be styled?

## How to View
```
open .planning/sketches/001-board-card-ai-toolbar/index.html
```

## Variants
- **A: Floating Pill** — Same minimal pill as AiTextToolbar in page editor; floats above selected text. Consistent with existing UX, low visual weight.
- **B: Card Action Strip** — A persistent AI strip snaps to the bottom of the card when editing. Always visible while editing — no text selection required.
- **C: Rich Popover** — A larger contextual popover with labeled action buttons and custom input. Appears above the card when editing starts.

## What to Look For
- Does the toolbar position feel natural relative to the card?
- Does it get in the way of reading other cards?
- Should AI text help require text selection (A) or just card focus (B, C)?
- Does the richer UI of C justify the larger footprint vs. A's minimal pill?
