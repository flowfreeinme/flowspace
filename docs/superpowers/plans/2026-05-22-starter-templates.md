# Starter Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen template picker that fires on every board creation, offering Blank plus three starter workspace setups (Student, Personal, Team) that each populate boards, home widgets, and example tasks.

**Architecture:** Template data lives in `src/lib/starterTemplates.ts` as pure objects. The workspace store gains three new fields (`templatePickerOpen`, `templatePickerParentId`) and two new actions (`openTemplatePicker`, `closeTemplatePicker`, `applyStarterTemplate`). `BoardTemplateModal` is a self-contained component that reads from the store, renders when `templatePickerOpen` is true, and is mounted once in each shell. Every board-creation trigger (Sidebar `+` button, sidebar context menu "New board here", CommandPalette "New board", MobileShell `+` button) is replaced with a call to `openTemplatePicker`.

**Tech Stack:** React, TypeScript, Zustand (`useWorkspace`), Vitest, Tailwind CSS, `uuid`

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/lib/starterTemplates.ts` |
| Create | `src/lib/starterTemplates.test.ts` |
| Create | `src/components/BoardTemplateModal.tsx` |
| Modify | `src/stores/workspace.ts` |
| Modify | `src/components/Sidebar.tsx` |
| Modify | `src/components/CommandPalette.tsx` |
| Modify | `src/components/DesktopShell.tsx` |
| Modify | `src/components/MobileShell.tsx` |

---

## Task 1: Template data

**Files:**
- Create: `src/lib/starterTemplates.ts`

- [ ] **Step 1.1: Create the template data file**

```typescript
// src/lib/starterTemplates.ts
import { v4 as uuid } from 'uuid'
import type { Block, HomeWidget } from '@/types'
import type { WidgetConfigMap } from '@/types/widgetSettings'

export type StarterTemplateId = 'student' | 'personal' | 'team'

export interface BoardDefinition {
  title: string
  icon: string
  blocks: Block[]
}

export interface StarterTemplate {
  id: StarterTemplateId
  label: string
  icon: string
  description: string
  tags: string[]
  boards: BoardDefinition[]
  widgets: HomeWidget[]
  widgetSettings?: Partial<{ [K in keyof WidgetConfigMap]: Partial<WidgetConfigMap[K]> }>
}

const CARD_W = 280
const CARD_H = 140

function card(text: string, x: number, y: number, w = CARD_W, h = CARD_H): Block {
  return { id: uuid(), type: 'textbox', content: JSON.stringify({ text, x, y, width: w, height: h }) }
}

function section(title: string, x: number, y: number): Block {
  return { id: uuid(), type: 'section', content: JSON.stringify({ title, x, y }) }
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'student',
    label: 'Student',
    icon: '🎓',
    description: 'Classes, assignments, and study goals — organized from day one.',
    tags: ['3 boards', 'Focus timer', 'Calendar'],
    boards: [
      {
        title: 'Class Notes',
        icon: '📚',
        blocks: [
          section('Lectures', 0, 300),
          card('', 0, 344),
          section('Reading', 300, 300),
          card('', 300, 344),
          section('Resources', 600, 300),
          card('', 600, 344),
        ],
      },
      {
        title: 'Assignments',
        icon: '📋',
        blocks: [
          section('To Do', 0, 300),
          card('Review chapter 1', 0, 344),
          card('Submit essay draft', 0, 504),
          card('Prepare for exam', 0, 664),
          section('In Progress', 300, 300),
          card('', 300, 344),
          section('Done', 600, 300),
          card('', 600, 344),
        ],
      },
      {
        title: 'Study Goals',
        icon: '🎯',
        blocks: [
          section('This Week', 0, 300),
          card('', 0, 344),
          section('This Month', 300, 300),
          card('', 300, 344),
          section('Long Term', 600, 300),
          card('', 600, 344),
        ],
      },
    ],
    widgets: [
      { id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 12 },
      { id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 },
      { id: 'focusTimer', type: 'focusTimer', x: 8, y: 3, w: 4, h: 4 },
      { id: 'focus', type: 'focus', x: 8, y: 7, w: 4, h: 3 },
      { id: 'quickCapture', type: 'quickCapture', x: 8, y: 10, w: 4, h: 2 },
    ],
    widgetSettings: {
      focusTimer: { breakEnabled: true, breakMinutes: 5 },
    },
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: '✅',
    description: 'Goals, tasks, and a capture board for anything on your mind.',
    tags: ['3 boards', 'Quick capture', 'Today'],
    boards: [
      {
        title: 'My Tasks',
        icon: '✅',
        blocks: [
          section('To Do', 0, 300),
          card('Set up your workspace', 0, 344),
          card('Add your first goal', 0, 504),
          card('Review your week', 0, 664),
          section('In Progress', 300, 300),
          card('', 300, 344),
          section('Done', 600, 300),
          card('', 600, 344),
        ],
      },
      {
        title: 'Goals',
        icon: '🎯',
        blocks: [
          section('Personal', 0, 300),
          card('', 0, 344),
          section('Health', 300, 300),
          card('', 300, 344),
          section('Career', 600, 300),
          card('', 600, 344),
        ],
      },
      {
        title: 'Journal',
        icon: '📓',
        blocks: [
          section('Quick Notes', 0, 300),
          card('', 0, 344),
        ],
      },
    ],
    widgets: [
      { id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 12 },
      { id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 },
      { id: 'quickCapture', type: 'quickCapture', x: 8, y: 3, w: 4, h: 2 },
      { id: 'focus', type: 'focus', x: 8, y: 5, w: 4, h: 4 },
      { id: 'recent', type: 'recent', x: 8, y: 9, w: 4, h: 3 },
    ],
  },
  {
    id: 'team',
    label: 'Team planning',
    icon: '🏗️',
    description: 'Project boards, sprint tracking, and shared resources.',
    tags: ['3 boards', 'Calendar', 'Recent'],
    boards: [
      {
        title: 'Project Overview',
        icon: '🗺️',
        blocks: [
          section('Backlog', 0, 300),
          card('', 0, 344),
          section('Active', 300, 300),
          card('', 300, 344),
          section('Review', 600, 300),
          card('', 600, 344),
          section('Done', 900, 300),
          card('', 900, 344),
        ],
      },
      {
        title: 'Sprint Board',
        icon: '🔄',
        blocks: [
          section('To Do', 0, 300),
          card('Define project goals', 0, 344),
          card('Assign first tasks', 0, 504),
          card('Schedule standup', 0, 664),
          section('In Progress', 300, 300),
          card('', 300, 344),
          section('Done', 600, 300),
          card('', 600, 344),
        ],
      },
      {
        title: 'Team Resources',
        icon: '📁',
        blocks: [
          section('Docs', 0, 300),
          card('', 0, 344),
          section('Links', 300, 300),
          card('', 300, 344),
          section('Notes', 600, 300),
          card('', 600, 344),
        ],
      },
    ],
    widgets: [
      { id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 12 },
      { id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 },
      { id: 'focus', type: 'focus', x: 8, y: 3, w: 4, h: 4 },
      { id: 'recent', type: 'recent', x: 8, y: 7, w: 4, h: 3 },
      { id: 'quickCapture', type: 'quickCapture', x: 8, y: 10, w: 4, h: 2 },
    ],
  },
]
```

- [ ] **Step 1.2: Commit**

```bash
git add src/lib/starterTemplates.ts
git commit -m "feat: add starter template data (student, personal, team)"
```

---

## Task 2: Template data tests

**Files:**
- Create: `src/lib/starterTemplates.test.ts`

- [ ] **Step 2.1: Write tests**

```typescript
// src/lib/starterTemplates.test.ts
import { describe, it, expect } from 'vitest'
import { STARTER_TEMPLATES } from './starterTemplates'

const VALID_BLOCK_TYPES = ['textbox', 'section', 'text', 'heading1', 'heading2', 'heading3',
  'todo', 'bullet', 'numbered', 'code', 'divider', 'quote', 'file', 'image', 'kanban', 'flowchart', 'timeline']
const VALID_WIDGET_TYPES = ['calendar', 'today', 'focus', 'recent', 'quickCapture', 'proPlanner', 'focusTimer', 'weather']
const HOME_COLS = 12
const HOME_ROWS = 12

describe('STARTER_TEMPLATES', () => {
  it('exports exactly 3 templates with unique ids', () => {
    expect(STARTER_TEMPLATES).toHaveLength(3)
    const ids = STARTER_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('every template has required fields', () => {
    for (const t of STARTER_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(Array.isArray(t.tags)).toBe(true)
      expect(t.boards.length).toBeGreaterThan(0)
      expect(t.widgets.length).toBeGreaterThan(0)
    }
  })

  it('every template has exactly 3 boards', () => {
    for (const t of STARTER_TEMPLATES) {
      expect(t.boards).toHaveLength(3)
    }
  })

  it('every board has a title, icon, and at least one block', () => {
    for (const t of STARTER_TEMPLATES) {
      for (const b of t.boards) {
        expect(b.title).toBeTruthy()
        expect(b.icon).toBeTruthy()
        expect(b.blocks.length).toBeGreaterThan(0)
      }
    }
  })

  it('every block has a valid type and string content', () => {
    for (const t of STARTER_TEMPLATES) {
      for (const b of t.boards) {
        for (const block of b.blocks) {
          expect(VALID_BLOCK_TYPES).toContain(block.type)
          expect(typeof block.content).toBe('string')
        }
      }
    }
  })

  it('every template widget layout includes exactly one calendar widget', () => {
    for (const t of STARTER_TEMPLATES) {
      const calendars = t.widgets.filter(w => w.type === 'calendar')
      expect(calendars).toHaveLength(1)
    }
  })

  it('every widget has a valid type and fits within the 12x12 grid', () => {
    for (const t of STARTER_TEMPLATES) {
      for (const w of t.widgets) {
        expect(VALID_WIDGET_TYPES).toContain(w.type)
        expect(w.x).toBeGreaterThanOrEqual(0)
        expect(w.y).toBeGreaterThanOrEqual(0)
        expect(w.x + w.w).toBeLessThanOrEqual(HOME_COLS)
        expect(w.y + w.h).toBeLessThanOrEqual(HOME_ROWS)
      }
    }
  })

  it('no two widgets in a template share the same id', () => {
    for (const t of STARTER_TEMPLATES) {
      const ids = t.widgets.map(w => w.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('student template includes focusTimer widget', () => {
    const student = STARTER_TEMPLATES.find(t => t.id === 'student')!
    expect(student.widgets.some(w => w.type === 'focusTimer')).toBe(true)
  })

  it('student template sets focusTimer breakEnabled', () => {
    const student = STARTER_TEMPLATES.find(t => t.id === 'student')!
    expect(student.widgetSettings?.focusTimer?.breakEnabled).toBe(true)
  })

  it('personal template includes quickCapture and recent widgets', () => {
    const personal = STARTER_TEMPLATES.find(t => t.id === 'personal')!
    expect(personal.widgets.some(w => w.type === 'quickCapture')).toBe(true)
    expect(personal.widgets.some(w => w.type === 'recent')).toBe(true)
  })

  it('team template includes recent widget', () => {
    const team = STARTER_TEMPLATES.find(t => t.id === 'team')!
    expect(team.widgets.some(w => w.type === 'recent')).toBe(true)
  })
})
```

- [ ] **Step 2.2: Run tests**

```bash
cd /Users/michael/flowspace && npm test -- src/lib/starterTemplates.test.ts
```

Expected: all tests pass.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/starterTemplates.test.ts
git commit -m "test: add starter template data integrity tests"
```

---

## Task 3: Workspace store additions

**Files:**
- Modify: `src/stores/workspace.ts`

Three additions: two state fields (`templatePickerOpen`, `templatePickerParentId`), three actions (`openTemplatePicker`, `closeTemplatePicker`, `applyStarterTemplate`).

- [ ] **Step 3.1: Add imports to `workspace.ts`**

At the top of `src/stores/workspace.ts`, add:

```typescript
import { STARTER_TEMPLATES, type StarterTemplateId } from '@/lib/starterTemplates'
```

- [ ] **Step 3.2: Add new fields to the `WorkspaceStore` interface**

Find the `interface WorkspaceStore extends WorkspaceData {` block. Add these lines after `initialized: boolean`:

```typescript
  templatePickerOpen: boolean
  templatePickerParentId: string | null
```

And add these action signatures (anywhere in the interface, e.g. after `resetHomeCenter`):

```typescript
  openTemplatePicker: (parentId?: string | null) => void
  closeTemplatePicker: () => void
  applyStarterTemplate: (templateId: StarterTemplateId, parentId?: string | null) => string
```

- [ ] **Step 3.3: Add initial state values**

In the `create<WorkspaceStore>((set, get) => ({` block, add after `initialized: false,`:

```typescript
  templatePickerOpen: false,
  templatePickerParentId: null,
```

- [ ] **Step 3.4: Add the three action implementations**

Add these immediately before the closing `}))` of the store. The store already has `import { v4 as uuid } from 'uuid'` at the top — use `uuid()` directly:

```typescript
  openTemplatePicker(parentId = null) {
    set({ templatePickerOpen: true, templatePickerParentId: parentId ?? null })
  },

  closeTemplatePicker() {
    set({ templatePickerOpen: false, templatePickerParentId: null })
  },

  applyStarterTemplate(templateId, parentId = null) {
    const template = STARTER_TEMPLATES.find(t => t.id === templateId)
    if (!template) throw new Error(`Unknown template: ${templateId}`)

    const now = Date.now()
    const entries: Array<[string, Page]> = template.boards.map(def => {
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

      const prevSettings = s.homeCenter?.widgetSettings ?? {}
      const mergedSettings = { ...prevSettings }
      if (template.widgetSettings) {
        for (const [key, patch] of Object.entries(template.widgetSettings)) {
          const k = key as keyof WidgetConfigMap
          mergedSettings[k] = { ...(prevSettings[k] ?? {}), ...(patch ?? {}) } as never
        }
      }

      return {
        pages,
        rootPages,
        homeCenter: {
          ...s.homeCenter,
          widgets: template.widgets,
          widgetSettings: mergedSettings,
        },
      }
    })
    get().persist()
    return entries[0][0]
  },
```

> `Page` is already imported from `'@/types'` and `WidgetConfigMap` from `'@/types/widgetSettings'` in workspace.ts — no new imports needed beyond the `STARTER_TEMPLATES` import added in Step 3.1.

- [ ] **Step 3.5: Typecheck**

```bash
cd /Users/michael/flowspace && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3.6: Commit**

```bash
git add src/stores/workspace.ts
git commit -m "feat: add templatePicker state and applyStarterTemplate action to workspace store"
```

---

## Task 4: BoardTemplateModal component

**Files:**
- Create: `src/components/BoardTemplateModal.tsx`

- [ ] **Step 4.1: Create the component**

```tsx
// src/components/BoardTemplateModal.tsx
import { useEffect } from 'react'
import { useWorkspace } from '@/stores/workspace'
import { STARTER_TEMPLATES, type StarterTemplateId } from '@/lib/starterTemplates'

export default function BoardTemplateModal() {
  const {
    templatePickerOpen,
    templatePickerParentId,
    closeTemplatePicker,
    createBoard,
    applyStarterTemplate,
    openTab,
  } = useWorkspace()

  useEffect(() => {
    if (!templatePickerOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeTemplatePicker()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [templatePickerOpen, closeTemplatePicker])

  if (!templatePickerOpen) return null

  function handleSelect(templateId: StarterTemplateId | null) {
    closeTemplatePicker()
    if (templateId === null) {
      const id = createBoard(templatePickerParentId)
      openTab(id)
    } else {
      const id = applyStarterTemplate(templateId, templatePickerParentId)
      openTab(id)
    }
  }

  const cardBase =
    'bg-surface-1 border border-surface-4 rounded-xl p-5 text-left cursor-pointer ' +
    'hover:border-accent hover:bg-surface-2 transition-colors flex flex-col gap-2 w-full'

  return (
    <div
      className="fixed inset-0 z-50 bg-surface-0 flex flex-col items-center justify-center p-8"
      data-no-drag
    >
      <div className="text-3xl mb-3">🗂️</div>
      <h1 className="text-xl font-bold text-white mb-1 tracking-tight">Start with a template</h1>
      <p className="text-gray-400 text-sm mb-8">
        Pick a workspace to set up, or start from a blank board.
      </p>

      <div className="grid grid-cols-4 gap-3 max-w-3xl w-full">
        {/* Blank board */}
        <button className={cardBase} onClick={() => handleSelect(null)}>
          <div className="text-2xl opacity-40">⬜</div>
          <div className="text-sm font-semibold text-white">Blank board</div>
          <div className="text-xs text-gray-500 leading-relaxed">
            Empty canvas. Add your own structure.
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            <span className="text-xs bg-surface-3 text-gray-400 rounded px-1.5 py-0.5 border border-surface-4">
              1 board
            </span>
          </div>
        </button>

        {STARTER_TEMPLATES.map(t => (
          <button key={t.id} className={cardBase} onClick={() => handleSelect(t.id)}>
            <div className="text-2xl">{t.icon}</div>
            <div className="text-sm font-semibold text-white">{t.label}</div>
            <div className="text-xs text-gray-500 leading-relaxed">{t.description}</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {t.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-surface-3 text-gray-400 rounded px-1.5 py-0.5 border border-surface-4"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={closeTemplatePicker}
        className="mt-8 text-gray-500 text-sm hover:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
```

- [ ] **Step 4.2: Typecheck**

```bash
cd /Users/michael/flowspace && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add src/components/BoardTemplateModal.tsx
git commit -m "feat: add BoardTemplateModal full-screen template picker"
```

---

## Task 5: Wire Sidebar triggers

**Files:**
- Modify: `src/components/Sidebar.tsx`

Two triggers in Sidebar: `handleNewBoard()` (the `+` button) and the context menu "New board here" item.

- [ ] **Step 5.1: Pull `openTemplatePicker` from the store**

Find the `useWorkspace()` destructure in Sidebar (around line 200). Add `openTemplatePicker` to it:

```typescript
const {
  // ... existing fields ...
  createBoard,
  openTemplatePicker,  // add this
  // ...
} = useWorkspace()
```

- [ ] **Step 5.2: Replace `handleNewBoard`**

Find this function (around line 268):

```typescript
function handleNewBoard() {
  const id = createBoard(null)
  openTab(id)
  setAddMenuOpen(false)
}
```

Replace with:

```typescript
function handleNewBoard() {
  setAddMenuOpen(false)
  openTemplatePicker(null)
}
```

- [ ] **Step 5.3: Replace "New board here" context menu action**

Find this in the context menu options (around line 523):

```typescript
onClick: () => { const id = createBoard(context.pageId); openTab(id) },
```

Replace with:

```typescript
onClick: () => { openTemplatePicker(context.pageId); setContext(null) },
```

- [ ] **Step 5.4: Typecheck**

```bash
cd /Users/michael/flowspace && npm run typecheck
```

Expected: no errors.

- [ ] **Step 5.5: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: wire sidebar board creation triggers to template picker"
```

---

## Task 6: Wire CommandPalette trigger

**Files:**
- Modify: `src/components/CommandPalette.tsx`

- [ ] **Step 6.1: Pull `openTemplatePicker` from the store**

Find the `useWorkspace()` destructure in CommandPalette (around line 26):

```typescript
const { pages, rootPages, openTab, setHomeActive, toggleSidebar, createBoard } = useWorkspace()
```

Add `openTemplatePicker`:

```typescript
const { pages, rootPages, openTab, setHomeActive, toggleSidebar, createBoard, openTemplatePicker } = useWorkspace()
```

- [ ] **Step 6.2: Replace the "New board" action**

Find this action (around line 65):

```typescript
{
  id: 'new-page',
  type: 'action',
  icon: <Plus size={14} />,
  label: 'New board',
  sub: '⌘N',
  action: () => { const id = createBoard(null); openTab(id); onClose() },
},
```

Replace with:

```typescript
{
  id: 'new-page',
  type: 'action',
  icon: <Plus size={14} />,
  label: 'New board',
  sub: '⌘N',
  action: () => { onClose(); openTemplatePicker(null) },
},
```

> `onClose()` fires first so the palette dismisses before the full-screen modal appears.

- [ ] **Step 6.3: Typecheck**

```bash
cd /Users/michael/flowspace && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6.4: Commit**

```bash
git add src/components/CommandPalette.tsx
git commit -m "feat: wire command palette 'New board' to template picker"
```

---

## Task 7: Wire MobileShell trigger

**Files:**
- Modify: `src/components/MobileShell.tsx`

MobileShell has its own `createBoard` call at line 151 (a `+` button separate from Sidebar).

- [ ] **Step 7.1: Find the MobileShell board creation call**

Open `src/components/MobileShell.tsx` and find line ~151:

```typescript
const id = createBoard(null)
openTab(id)
```

This is likely inside an inline handler or function. Replace the body with:

```typescript
openTemplatePicker(null)
```

Make sure `openTemplatePicker` is destructured from `useWorkspace()` at line ~93:

```typescript
const { tabs, activeTabId, rootPages, pages, createPage, createBoard, openTab, setHomeActive, openTemplatePicker } = useWorkspace()
```

- [ ] **Step 7.2: Typecheck**

```bash
cd /Users/michael/flowspace && npm run typecheck
```

Expected: no errors.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/MobileShell.tsx
git commit -m "feat: wire mobile shell board creation to template picker"
```

---

## Task 8: Mount BoardTemplateModal in shells

**Files:**
- Modify: `src/components/DesktopShell.tsx`
- Modify: `src/components/MobileShell.tsx`

`BoardTemplateModal` is self-contained (reads from store, renders itself). Just mount it once in each shell.

- [ ] **Step 8.1: Add to DesktopShell**

In `src/components/DesktopShell.tsx`, add the import:

```typescript
import BoardTemplateModal from './BoardTemplateModal'
```

Inside the returned JSX, add `<BoardTemplateModal />` as the last child of the root `<div>`:

```tsx
return (
  <div className="h-screen bg-surface-0 flex flex-col overflow-hidden text-sm">
    <TabBar onOpenShortcuts={onOpenShortcuts} />
    <div className="flex flex-1 overflow-hidden">
      <div className={`transition-all duration-200 ease-in-out overflow-hidden shrink-0 ${sidebarOpen ? 'w-56' : 'w-0'}`}>
        <Sidebar />
      </div>
      {activeTab ? (
        activePage?.boardMode
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
```

- [ ] **Step 8.2: Add to MobileShell**

In `src/components/MobileShell.tsx`, add:

```typescript
import BoardTemplateModal from './BoardTemplateModal'
```

Add `<BoardTemplateModal />` as the last child of MobileShell's root element (just before the closing tag of the outermost `<div>`).

- [ ] **Step 8.3: Typecheck**

```bash
cd /Users/michael/flowspace && npm run typecheck
```

Expected: no errors.

- [ ] **Step 8.4: Run all tests**

```bash
cd /Users/michael/flowspace && npm test
```

Expected: all tests pass including the new `starterTemplates.test.ts`.

- [ ] **Step 8.5: Commit**

```bash
git add src/components/DesktopShell.tsx src/components/MobileShell.tsx
git commit -m "feat: mount BoardTemplateModal in desktop and mobile shells"
```

---

## Manual verification checklist

After all tasks are complete, verify the following in the running app (`npm run dev`):

- [ ] Clicking the `+` button in the sidebar opens the full-screen picker
- [ ] Right-clicking a folder and choosing "New board here" opens the picker
- [ ] Opening the command palette (⌘K) and selecting "New board" opens the picker (palette closes first)
- [ ] Pressing Escape closes the picker without creating anything
- [ ] Selecting **Blank board** creates a single untitled board and opens it
- [ ] Selecting **Student** creates 3 boards (Class Notes, Assignments, Study Goals), opens Assignments, and updates home widgets to include focusTimer
- [ ] Selecting **Personal** creates 3 boards (My Tasks, Goals, Journal), opens My Tasks, and home widgets include quickCapture + recent
- [ ] Selecting **Team planning** creates 3 boards (Project Overview, Sprint Board, Team Resources), opens Sprint Board, and home widgets include focus + recent
- [ ] Home widgets reflect the template layout after selection (go to home screen to verify)
- [ ] Boards created by a starter have the correct example task cards
- [ ] Creating a board inside a folder (via context menu) places all new boards in that folder
