# Notion-Style Databases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured databases to Flowspace — typed properties, 5 views (Table/Board/Gallery/Calendar/List), Relations, and inline block embeds.

**Architecture:** Databases are a new page type (`database: true` on Page) stored in the workspace blob for metadata, with schema/views in a `databases` Supabase table and rows in `database_rows`. A dedicated Zustand store (`src/stores/database.ts`) handles all CRUD. DesktopShell renders `DatabasePage` when the active page has `database: true`.

**Tech Stack:** React, TypeScript, Zustand, Supabase, TailwindCSS, Vitest, lucide-react, uuid

---

## Task 1: TypeScript Types

**Files:**
- Create: `src/lib/databaseTypes.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Create databaseTypes.ts**

```ts
// src/lib/databaseTypes.ts
export type PropertyType =
  | 'text' | 'number' | 'select' | 'multi_select'
  | 'checkbox' | 'date' | 'url' | 'relation'

export type PropertyValue =
  | string | number | boolean | string[]
  | { start: string; end?: string }
  | null

export interface SelectOption {
  id: string
  name: string
  color: string // tailwind color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'gray'
}

export interface PropertyDef {
  id: string
  name: string
  type: PropertyType
  config?: {
    options?: SelectOption[]
    numberFormat?: 'plain' | 'dollar' | 'percent'
    dateIncludeTime?: boolean
    relationDatabaseId?: string
  }
}

export type ViewType = 'table' | 'board' | 'gallery' | 'calendar' | 'list'

export interface ViewDef {
  id: string
  name: string
  type: ViewType
  groupByPropId?: string   // board: select prop to group columns
  datePropId?: string      // calendar: date prop to plot rows
  coverPropId?: string     // gallery: url prop for card cover image
  sort?: { propId: string; direction: 'asc' | 'desc' }[]
  hiddenProps?: string[]
}

export interface Database {
  id: string             // same as the Page id
  workspaceUserId: string
  title: string
  icon: string
  schema: PropertyDef[]
  views: ViewDef[]
  createdAt: string
  updatedAt: string
}

export interface DatabaseRow {
  id: string
  databaseId: string
  position: number
  properties: Record<string, PropertyValue>
  createdAt: string
  updatedAt: string
}

export const TITLE_PROP_ID = '__title__'

export function makeTitleProp(): PropertyDef {
  return { id: TITLE_PROP_ID, name: 'Name', type: 'text' }
}

export function makeDefaultDatabase(id: string, userId: string, title = 'Untitled'): Database {
  const now = new Date().toISOString()
  return {
    id,
    workspaceUserId: userId,
    title,
    icon: '⊞',
    schema: [makeTitleProp()],
    views: [{ id: 'default-table', name: 'Table', type: 'table' }],
    createdAt: now,
    updatedAt: now,
  }
}

export function getSelectColor(color: string): string {
  const map: Record<string, string> = {
    red: 'bg-red-900/50 text-red-300',
    blue: 'bg-blue-900/50 text-blue-300',
    green: 'bg-green-900/50 text-green-300',
    yellow: 'bg-yellow-900/50 text-yellow-300',
    purple: 'bg-purple-900/50 text-purple-300',
    pink: 'bg-pink-900/50 text-pink-300',
    gray: 'bg-gray-700/50 text-gray-300',
  }
  return map[color] ?? map.gray
}
```

- [ ] **Step 2: Add `database` flag to Page type in src/types.ts**

Open `src/types.ts`. Find the `Page` interface. Add one optional field:

```ts
database?: boolean
```

Add `'database'` to the `BlockType` union (find where `BlockType` is defined, e.g. `type BlockType = 'text' | 'heading1' | ...`):

```ts
| 'database'
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/databaseTypes.ts src/types.ts
git commit -m "feat: add database types and extend Page/BlockType"
```

---

## Task 2: Supabase Tables

**Files:**
- No code file — SQL run in Supabase dashboard

- [ ] **Step 1: Run this SQL in the Supabase dashboard (SQL Editor)**

```sql
-- Databases table: stores schema + views per database page
create table if not exists public.databases (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'Untitled',
  icon          text not null default '⊞',
  schema        jsonb not null default '[]',
  views         jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.databases enable row level security;

create policy "Users manage own databases"
  on public.databases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rows table: stores actual data rows
create table if not exists public.database_rows (
  id            uuid primary key,
  database_id   uuid not null references public.databases(id) on delete cascade,
  position      float8 not null default 0,
  properties    jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.database_rows enable row level security;

create policy "Users manage rows of own databases"
  on public.database_rows for all
  using (
    exists (
      select 1 from public.databases d
      where d.id = database_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.databases d
      where d.id = database_id and d.user_id = auth.uid()
    )
  );

create index on public.database_rows (database_id, position);
```

- [ ] **Step 2: Verify**

In the Supabase Table Editor, confirm both `databases` and `database_rows` tables appear with RLS enabled.

---

## Task 3: Database Store

**Files:**
- Create: `src/stores/database.ts`
- Create: `src/stores/database.test.ts`

- [ ] **Step 1: Write failing tests for pure helpers**

```ts
// src/stores/database.test.ts
import { describe, it, expect } from 'vitest'
import { midpoint, nextPosition, reorderPositions } from './database'

describe('row position helpers', () => {
  it('midpoint returns value between two numbers', () => {
    expect(midpoint(1, 3)).toBe(2)
    expect(midpoint(0, 1)).toBe(0.5)
  })

  it('nextPosition returns last + 1 for non-empty list', () => {
    expect(nextPosition([{ position: 1 }, { position: 3 }] as any)).toBe(4)
  })

  it('nextPosition returns 1 for empty list', () => {
    expect(nextPosition([])).toBe(1)
  })

  it('reorderPositions moves row between two others', () => {
    const rows = [
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
    ] as any[]
    const result = reorderPositions(rows, 'c', 1, 2)
    expect(result).toBe(1.5)
  })
})
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
cd /Users/michael/flowspace && npx vitest run src/stores/database.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './database'`

- [ ] **Step 3: Create the store with helpers and full CRUD**

```ts
// src/stores/database.ts
import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { supabase } from '@/lib/supabase'
import type { Database, DatabaseRow, PropertyDef, ViewDef, PropertyValue } from '@/lib/databaseTypes'
import { makeDefaultDatabase } from '@/lib/databaseTypes'

// ── Position helpers (exported for tests) ────────────────────────────────────

export function midpoint(a: number, b: number): number {
  return (a + b) / 2
}

export function nextPosition(rows: Pick<DatabaseRow, 'position'>[]): number {
  if (rows.length === 0) return 1
  return Math.max(...rows.map(r => r.position)) + 1
}

export function reorderPositions(
  rows: Pick<DatabaseRow, 'id' | 'position'>[],
  rowId: string,
  beforePosition: number,
  afterPosition: number,
): number {
  return midpoint(beforePosition, afterPosition)
}

// ── Store ────────────────────────────────────────────────────────────────────

interface DatabaseStore {
  databases: Record<string, Database>
  rows: Record<string, DatabaseRow[]>
  loading: Record<string, boolean>

  loadDatabase: (id: string) => Promise<void>
  createDatabase: (userId: string, pageId: string, title?: string) => Promise<Database>
  updateTitle: (dbId: string, title: string) => Promise<void>
  updateSchema: (dbId: string, schema: PropertyDef[]) => Promise<void>
  addView: (dbId: string, view: ViewDef) => Promise<void>
  updateView: (dbId: string, viewId: string, patch: Partial<ViewDef>) => Promise<void>
  deleteView: (dbId: string, viewId: string) => Promise<void>

  addRow: (dbId: string) => Promise<DatabaseRow>
  updateRow: (dbId: string, rowId: string, props: Record<string, PropertyValue>) => Promise<void>
  deleteRow: (dbId: string, rowId: string) => Promise<void>
  moveRow: (dbId: string, rowId: string, beforePosition: number, afterPosition: number) => Promise<void>
}

export const useDatabase = create<DatabaseStore>((set, get) => ({
  databases: {},
  rows: {},
  loading: {},

  async loadDatabase(id) {
    if (get().databases[id]) return
    set(s => ({ loading: { ...s.loading, [id]: true } }))
    const [{ data: db }, { data: rows }] = await Promise.all([
      supabase.from('databases').select('*').eq('id', id).single(),
      supabase.from('database_rows').select('*').eq('database_id', id).order('position'),
    ])
    if (!db) { set(s => ({ loading: { ...s.loading, [id]: false } })); return }
    const parsed: Database = {
      id: db.id,
      workspaceUserId: db.user_id,
      title: db.title,
      icon: db.icon,
      schema: db.schema ?? [],
      views: db.views ?? [],
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    }
    const parsedRows: DatabaseRow[] = (rows ?? []).map(r => ({
      id: r.id,
      databaseId: r.database_id,
      position: r.position,
      properties: r.properties ?? {},
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
    set(s => ({
      databases: { ...s.databases, [id]: parsed },
      rows: { ...s.rows, [id]: parsedRows },
      loading: { ...s.loading, [id]: false },
    }))
  },

  async createDatabase(userId, pageId, title = 'Untitled') {
    const db = makeDefaultDatabase(pageId, userId, title)
    await supabase.from('databases').insert({
      id: db.id,
      user_id: userId,
      title: db.title,
      icon: db.icon,
      schema: db.schema,
      views: db.views,
    })
    set(s => ({
      databases: { ...s.databases, [db.id]: db },
      rows: { ...s.rows, [db.id]: [] },
    }))
    return db
  },

  async updateTitle(dbId, title) {
    set(s => ({
      databases: { ...s.databases, [dbId]: { ...s.databases[dbId], title } },
    }))
    await supabase.from('databases').update({ title, updated_at: new Date().toISOString() }).eq('id', dbId)
  },

  async updateSchema(dbId, schema) {
    set(s => ({
      databases: { ...s.databases, [dbId]: { ...s.databases[dbId], schema } },
    }))
    await supabase.from('databases').update({ schema, updated_at: new Date().toISOString() }).eq('id', dbId)
  },

  async addView(dbId, view) {
    const views = [...(get().databases[dbId]?.views ?? []), view]
    set(s => ({ databases: { ...s.databases, [dbId]: { ...s.databases[dbId], views } } }))
    await supabase.from('databases').update({ views, updated_at: new Date().toISOString() }).eq('id', dbId)
  },

  async updateView(dbId, viewId, patch) {
    const views = (get().databases[dbId]?.views ?? []).map(v =>
      v.id === viewId ? { ...v, ...patch } : v
    )
    set(s => ({ databases: { ...s.databases, [dbId]: { ...s.databases[dbId], views } } }))
    await supabase.from('databases').update({ views, updated_at: new Date().toISOString() }).eq('id', dbId)
  },

  async deleteView(dbId, viewId) {
    const views = (get().databases[dbId]?.views ?? []).filter(v => v.id !== viewId)
    set(s => ({ databases: { ...s.databases, [dbId]: { ...s.databases[dbId], views } } }))
    await supabase.from('databases').update({ views, updated_at: new Date().toISOString() }).eq('id', dbId)
  },

  async addRow(dbId) {
    const existing = get().rows[dbId] ?? []
    const position = nextPosition(existing)
    const now = new Date().toISOString()
    const row: DatabaseRow = {
      id: uuid(),
      databaseId: dbId,
      position,
      properties: {},
      createdAt: now,
      updatedAt: now,
    }
    set(s => ({ rows: { ...s.rows, [dbId]: [...(s.rows[dbId] ?? []), row] } }))
    await supabase.from('database_rows').insert({
      id: row.id,
      database_id: dbId,
      position,
      properties: {},
    })
    return row
  },

  async updateRow(dbId, rowId, props) {
    const now = new Date().toISOString()
    set(s => ({
      rows: {
        ...s.rows,
        [dbId]: (s.rows[dbId] ?? []).map(r =>
          r.id === rowId
            ? { ...r, properties: { ...r.properties, ...props }, updatedAt: now }
            : r
        ),
      },
    }))
    const current = (get().rows[dbId] ?? []).find(r => r.id === rowId)
    if (!current) return
    await supabase.from('database_rows').update({
      properties: { ...current.properties, ...props },
      updated_at: now,
    }).eq('id', rowId)
  },

  async deleteRow(dbId, rowId) {
    set(s => ({
      rows: { ...s.rows, [dbId]: (s.rows[dbId] ?? []).filter(r => r.id !== rowId) },
    }))
    await supabase.from('database_rows').delete().eq('id', rowId)
  },

  async moveRow(dbId, rowId, beforePosition, afterPosition) {
    const rows = get().rows[dbId] ?? []
    const newPosition = reorderPositions(rows, rowId, beforePosition, afterPosition)
    const now = new Date().toISOString()
    set(s => ({
      rows: {
        ...s.rows,
        [dbId]: (s.rows[dbId] ?? [])
          .map(r => r.id === rowId ? { ...r, position: newPosition, updatedAt: now } : r)
          .sort((a, b) => a.position - b.position),
      },
    }))
    await supabase.from('database_rows').update({ position: newPosition, updated_at: now }).eq('id', rowId)
  },
}))
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
cd /Users/michael/flowspace && npx vitest run src/stores/database.test.ts 2>&1 | tail -10
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/stores/database.ts src/stores/database.test.ts
git commit -m "feat: add database Zustand store with row position helpers"
```

---

## Task 4: Extend Workspace Store + Page Type

**Files:**
- Modify: `src/stores/workspace.ts`

- [ ] **Step 1: Add `createDatabase` to the WorkspaceStore interface**

In `src/stores/workspace.ts`, find the `// Pages` comment block in the interface. Add after `createFolder`:

```ts
createDatabase: (parentId?: string | null) => string
```

- [ ] **Step 2: Implement `createDatabase` in the store body**

Find the `createBoard` implementation in the store (it creates a `Page` with `boardMode: true`). Add `createDatabase` immediately after it, following the same pattern:

```ts
createDatabase(parentId = null) {
  const { pages, rootPages } = get()
  const id = uuid()
  const now = Date.now()
  const page: Page = {
    id,
    title: 'Untitled Database',
    icon: '⊞',
    blocks: [],
    children: [],
    parentId: parentId ?? null,
    createdAt: now,
    updatedAt: now,
    boardMode: false,
    database: true,
  }
  const newPages = { ...pages, [id]: page }
  const newRoot = parentId ? rootPages : [...rootPages, id]
  if (parentId && newPages[parentId]) {
    newPages[parentId] = {
      ...newPages[parentId],
      children: [...newPages[parentId].children, id],
    }
  }
  set({ pages: newPages, rootPages: newRoot })
  get().persist()
  return id
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to databases)

- [ ] **Step 4: Commit**

```bash
git add src/stores/workspace.ts
git commit -m "feat: add createDatabase action to workspace store"
```

---

## Task 5: DesktopShell Routing + Sidebar Entry

**Files:**
- Modify: `src/components/DesktopShell.tsx`
- Modify: `src/components/Sidebar.tsx`
- Create: `src/components/database/DatabasePage.tsx` (stub — filled in Task 14)

- [ ] **Step 1: Create DatabasePage stub**

```tsx
// src/components/database/DatabasePage.tsx
export default function DatabasePage({ pageId }: { pageId: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      Database {pageId} — coming soon
    </div>
  )
}
```

- [ ] **Step 2: Wire DesktopShell to render DatabasePage**

In `src/components/DesktopShell.tsx`, add the import at the top:

```tsx
import DatabasePage from './database/DatabasePage'
```

Find the line that checks `activePage?.boardMode` (around line 30):

```tsx
? <BoardView key={activeTab.pageId} pageId={activeTab.pageId} />
: <PageView key={activeTab.pageId} pageId={activeTab.pageId} />
```

Replace with:

```tsx
activePage?.database
  ? <DatabasePage key={activeTab.pageId} pageId={activeTab.pageId} />
  : activePage?.boardMode
    ? <BoardView key={activeTab.pageId} pageId={activeTab.pageId} />
    : <PageView key={activeTab.pageId} pageId={activeTab.pageId} />
```

- [ ] **Step 3: Add "New Database" to Sidebar**

In `src/components/Sidebar.tsx`, find the sidebar's "New page" button (where `createPage` or `createBoard` is called). Add a database option. Look for the context menu or toolbar that lets users create pages. Add alongside existing create options:

```tsx
{ label: 'New database', icon: <span className="text-xs">⊞</span>, onClick: () => { const id = createDatabase(null); openTab(id) } },
```

Also import `createDatabase` from `useWorkspace`. The destructure in Sidebar likely already has `createPage`, `createBoard` etc — add `createDatabase` to that same destructure line:

```tsx
const { ..., createDatabase } = useWorkspace()
```

- [ ] **Step 4: Build and verify no TypeScript errors**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/components/DesktopShell.tsx src/components/Sidebar.tsx src/components/database/DatabasePage.tsx
git commit -m "feat: route database pages to DatabasePage, add New Database in sidebar"
```

---

## Task 6: DatabaseToolbar (View Switcher)

**Files:**
- Create: `src/components/database/DatabaseToolbar.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/database/DatabaseToolbar.tsx
import { useState } from 'react'
import { Plus, Table2, Kanban, LayoutGrid, CalendarDays, List } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useDatabase } from '@/stores/database'
import type { ViewType, ViewDef } from '@/lib/databaseTypes'

const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table:    <Table2 size={13} />,
  board:    <Kanban size={13} />,
  gallery:  <LayoutGrid size={13} />,
  calendar: <CalendarDays size={13} />,
  list:     <List size={13} />,
}

const VIEW_LABELS: Record<ViewType, string> = {
  table: 'Table', board: 'Board', gallery: 'Gallery', calendar: 'Calendar', list: 'List',
}

interface Props {
  dbId: string
  activeViewId: string
  onSelectView: (viewId: string) => void
}

export default function DatabaseToolbar({ dbId, activeViewId, onSelectView }: Props) {
  const { databases, addView } = useDatabase()
  const db = databases[dbId]
  const [adding, setAdding] = useState(false)

  async function handleAddView(type: ViewType) {
    const view: ViewDef = { id: uuid(), name: VIEW_LABELS[type], type }
    await addView(dbId, view)
    onSelectView(view.id)
    setAdding(false)
  }

  if (!db) return null
  return (
    <div className="flex items-center gap-1 border-b border-gray-700 px-4 py-1 bg-gray-900">
      {db.views.map(view => (
        <button
          key={view.id}
          onClick={() => onSelectView(view.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors
            ${view.id === activeViewId
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
        >
          {VIEW_ICONS[view.type]}
          {view.name}
        </button>
      ))}

      {adding ? (
        <div className="flex items-center gap-1 ml-1">
          {(['table', 'board', 'gallery', 'calendar', 'list'] as ViewType[]).map(type => (
            <button
              key={type}
              onClick={() => handleAddView(type)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700"
            >
              {VIEW_ICONS[type]} {VIEW_LABELS[type]}
            </button>
          ))}
          <button onClick={() => setAdding(false)} className="ml-1 text-gray-500 hover:text-gray-300 text-xs">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 ml-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800"
        >
          <Plus size={11} /> Add view
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/database/DatabaseToolbar.tsx
git commit -m "feat: add DatabaseToolbar view switcher"
```

---

## Task 7: PropertyCell + PropertyEditor

**Files:**
- Create: `src/components/database/PropertyCell.tsx`
- Create: `src/components/database/PropertyEditor.tsx`

- [ ] **Step 1: Write PropertyCell**

PropertyCell renders a property value read-only inside table cells and cards.

```tsx
// src/components/database/PropertyCell.tsx
import type { PropertyDef, PropertyValue } from '@/lib/databaseTypes'
import { getSelectColor } from '@/lib/databaseTypes'

interface Props {
  def: PropertyDef
  value: PropertyValue
  compact?: boolean
}

export default function PropertyCell({ def, value, compact }: Props) {
  if (value == null || value === '') {
    return <span className="text-gray-600 text-xs">—</span>
  }

  switch (def.type) {
    case 'text':
    case 'url':
      if (def.type === 'url' && typeof value === 'string') {
        return (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-blue-400 hover:underline text-xs truncate max-w-[160px]"
          >
            {value}
          </a>
        )
      }
      return <span className={`text-gray-200 ${compact ? 'text-xs' : 'text-sm'} truncate`}>{String(value)}</span>

    case 'number': {
      const n = Number(value)
      const fmt = def.config?.numberFormat ?? 'plain'
      const display = fmt === 'dollar' ? `$${n.toLocaleString()}`
        : fmt === 'percent' ? `${n}%`
        : String(n)
      return <span className="text-gray-200 text-xs tabular-nums">{display}</span>
    }

    case 'checkbox':
      return (
        <span className={`text-sm ${value ? 'text-green-400' : 'text-gray-600'}`}>
          {value ? '✓' : '○'}
        </span>
      )

    case 'date': {
      const d = typeof value === 'object' && value !== null && 'start' in (value as object)
        ? (value as { start: string; end?: string })
        : { start: String(value) }
      return (
        <span className="text-gray-300 text-xs">
          {new Date(d.start).toLocaleDateString()}
          {d.end ? ` → ${new Date(d.end).toLocaleDateString()}` : ''}
        </span>
      )
    }

    case 'select': {
      const opt = def.config?.options?.find(o => o.id === value)
      if (!opt) return null
      return (
        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getSelectColor(opt.color)}`}>
          {opt.name}
        </span>
      )
    }

    case 'multi_select': {
      const ids = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map(id => {
            const opt = def.config?.options?.find(o => o.id === id)
            if (!opt) return null
            return (
              <span key={id} className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getSelectColor(opt.color)}`}>
                {opt.name}
              </span>
            )
          })}
        </div>
      )
    }

    case 'relation': {
      const ids = Array.isArray(value) ? value : []
      // Full row-search picker is in PropertyEditor; cell just shows count
      return (
        <span className="text-gray-400 text-xs">{ids.length} linked</span>
      )
    }

    default:
      return <span className="text-gray-400 text-xs">{String(value)}</span>
  }
}
```

- [ ] **Step 2: Write PropertyEditor**

PropertyEditor is the edit popover/inline input for a single property value.

```tsx
// src/components/database/PropertyEditor.tsx
import { useState, useRef, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import type { PropertyDef, PropertyValue, SelectOption } from '@/lib/databaseTypes'
import { getSelectColor } from '@/lib/databaseTypes'

const OPTION_COLORS = ['gray', 'red', 'blue', 'green', 'yellow', 'purple', 'pink'] as const

interface Props {
  def: PropertyDef
  value: PropertyValue
  onChange: (value: PropertyValue) => void
  onClose: () => void
  onSchemaChange?: (def: PropertyDef) => void
}

export default function PropertyEditor({ def, value, onChange, onClose, onSchemaChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  function addOption(name: string) {
    const opt: SelectOption = { id: uuid(), name, color: 'gray' }
    const options = [...(def.config?.options ?? []), opt]
    onSchemaChange?.({ ...def, config: { ...def.config, options } })
    return opt
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 min-w-[220px]"
    >
      {def.type === 'text' && (
        <textarea
          autoFocus
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 resize-none outline-none"
          rows={3}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {def.type === 'url' && (
        <input
          autoFocus
          type="url"
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 outline-none"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onClose()}
        />
      )}

      {def.type === 'number' && (
        <input
          autoFocus
          type="number"
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 outline-none"
          value={value == null ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && onClose()}
        />
      )}

      {def.type === 'relation' && (
        // Basic: show linked row IDs as text. Full row-search picker is a future enhancement.
        <div className="text-xs text-gray-400">
          {Array.isArray(value) && value.length > 0
            ? `${(value as string[]).length} linked rows`
            : 'No linked rows'}
        </div>
      )}

      {def.type === 'checkbox' && (
        <button
          onClick={() => { onChange(!value); onClose() }}
          className="flex items-center gap-2 text-sm text-gray-200"
        >
          <span className={`text-lg ${value ? 'text-green-400' : 'text-gray-500'}`}>{value ? '✓' : '○'}</span>
          {value ? 'Checked' : 'Unchecked'}
        </button>
      )}

      {def.type === 'date' && (
        <input
          autoFocus
          type="date"
          className="w-full bg-gray-700 text-gray-100 text-sm rounded p-2 outline-none"
          value={typeof value === 'object' && value && 'start' in (value as object)
            ? (value as { start: string }).start.split('T')[0]
            : String(value ?? '')}
          onChange={e => onChange({ start: e.target.value })}
        />
      )}

      {(def.type === 'select' || def.type === 'multi_select') && (
        <SelectEditor def={def} value={value} onChange={onChange} onAddOption={addOption} />
      )}
    </div>
  )
}

function SelectEditor({
  def, value, onChange, onAddOption,
}: {
  def: PropertyDef
  value: PropertyValue
  onChange: (v: PropertyValue) => void
  onAddOption: (name: string) => SelectOption
}) {
  const [search, setSearch] = useState('')
  const options = def.config?.options ?? []
  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
  const isMulti = def.type === 'multi_select'
  const selected = isMulti
    ? (Array.isArray(value) ? value : [])
    : [value as string].filter(Boolean)

  function toggle(optId: string) {
    if (isMulti) {
      const ids = Array.isArray(value) ? value : []
      onChange(ids.includes(optId) ? ids.filter(id => id !== optId) : [...ids, optId])
    } else {
      onChange(value === optId ? null : optId)
    }
  }

  function handleCreate() {
    if (!search.trim()) return
    const opt = onAddOption(search.trim())
    toggle(opt.id)
    setSearch('')
  }

  return (
    <div>
      <input
        autoFocus
        className="w-full bg-gray-700 text-gray-100 text-xs rounded p-1.5 mb-2 outline-none"
        placeholder="Search or create option…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
      />
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {filtered.map(opt => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`flex items-center gap-2 px-2 py-1 rounded text-left text-xs
              ${selected.includes(opt.id) ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
          >
            <span className={`w-2 h-2 rounded-full bg-${opt.color}-400`} />
            <span className={`px-1 rounded ${getSelectColor(opt.color)}`}>{opt.name}</span>
            {selected.includes(opt.id) && <span className="ml-auto text-green-400">✓</span>}
          </button>
        ))}
        {search && !filtered.find(o => o.name === search) && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:bg-gray-700"
          >
            <span className="text-gray-500">+</span> Create "{search}"
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/database/PropertyCell.tsx src/components/database/PropertyEditor.tsx
git commit -m "feat: add PropertyCell display and PropertyEditor popover"
```

---

## Task 8: SchemaEditor (Column Management)

**Files:**
- Create: `src/components/database/SchemaEditor.tsx`

- [ ] **Step 1: Write SchemaEditor**

```tsx
// src/components/database/SchemaEditor.tsx
import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { X, GripVertical, Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import type { PropertyDef, PropertyType } from '@/lib/databaseTypes'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'

const PROPERTY_TYPES: { type: PropertyType; label: string; icon: string }[] = [
  { type: 'text',         label: 'Text',         icon: 'T'  },
  { type: 'number',       label: 'Number',       icon: '#'  },
  { type: 'select',       label: 'Select',       icon: '◉'  },
  { type: 'multi_select', label: 'Multi-select', icon: '◉◉' },
  { type: 'checkbox',     label: 'Checkbox',     icon: '☑'  },
  { type: 'date',         label: 'Date',         icon: '📅' },
  { type: 'url',          label: 'URL',          icon: '🔗' },
  { type: 'relation',     label: 'Relation',     icon: '↗'  },
]

interface Props {
  dbId: string
  onClose: () => void
}

export default function SchemaEditor({ dbId, onClose }: Props) {
  const { databases, updateSchema } = useDatabase()
  const db = databases[dbId]
  const [schema, setSchema] = useState<PropertyDef[]>(db?.schema ?? [])
  const [editingId, setEditingId] = useState<string | null>(null)

  if (!db) return null

  function save(next: PropertyDef[]) {
    setSchema(next)
    updateSchema(dbId, next)
  }

  function addProp(type: PropertyType) {
    const prop: PropertyDef = { id: uuid(), name: PROPERTY_TYPES.find(p => p.type === type)!.label, type }
    save([...schema, prop])
    setEditingId(prop.id)
  }

  function renameProp(id: string, name: string) {
    save(schema.map(p => p.id === id ? { ...p, name } : p))
  }

  function deleteProp(id: string) {
    save(schema.filter(p => p.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-100">Properties</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
        </div>

        <div className="flex flex-col gap-1 mb-3">
          {schema.map(prop => (
            <div key={prop.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 group">
              <GripVertical size={12} className="text-gray-600" />
              <span className="text-xs text-gray-500 w-4">
                {PROPERTY_TYPES.find(p => p.type === prop.type)?.icon ?? 'T'}
              </span>
              {editingId === prop.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-gray-600 text-gray-100 text-xs rounded px-1.5 py-0.5 outline-none"
                  value={prop.name}
                  onChange={e => renameProp(prop.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                />
              ) : (
                <button
                  className="flex-1 text-left text-xs text-gray-200"
                  onClick={() => prop.id !== TITLE_PROP_ID && setEditingId(prop.id)}
                >
                  {prop.name}
                </button>
              )}
              {prop.id !== TITLE_PROP_ID && (
                <button
                  onClick={() => deleteProp(prop.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2">Add property</p>
          <div className="grid grid-cols-2 gap-1">
            {PROPERTY_TYPES.filter(p => p.type !== 'text').map(p => (
              <button
                key={p.type}
                onClick={() => addProp(p.type)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700"
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/database/SchemaEditor.tsx
git commit -m "feat: add SchemaEditor for adding/renaming/deleting database columns"
```

---

## Task 9: TableView

**Files:**
- Create: `src/components/database/views/TableView.tsx`

- [ ] **Step 1: Write TableView**

```tsx
// src/components/database/views/TableView.tsx
import { useState, useRef } from 'react'
import { Plus, Settings2 } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import type { DatabaseRow, PropertyDef, PropertyValue } from '@/lib/databaseTypes'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'
import PropertyEditor from '../PropertyEditor'
import SchemaEditor from '../SchemaEditor'

interface Props {
  dbId: string
  onOpenRow: (rowId: string) => void
}

export default function TableView({ dbId, onOpenRow }: Props) {
  const { databases, rows, addRow, updateRow, updateSchema } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  const [editing, setEditing] = useState<{ rowId: string; propId: string } | null>(null)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const cellRef = useRef<DOMRect | null>(null)

  if (!db) return null

  const visibleProps = db.schema

  function handleCellClick(e: React.MouseEvent, rowId: string, propId: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    cellRef.current = rect
    setEditing({ rowId, propId })
  }

  function handleChange(value: PropertyValue) {
    if (!editing) return
    updateRow(dbId, editing.rowId, { [editing.propId]: value })
  }

  function handleSchemaChange(def: PropertyDef) {
    const next = db.schema.map(p => p.id === def.id ? def : p)
    updateSchema(dbId, next)
  }

  const editingRow = editing ? dbRows.find(r => r.id === editing.rowId) : null
  const editingDef = editing ? db.schema.find(p => p.id === editing.propId) : null

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            {visibleProps.map(prop => (
              <th
                key={prop.id}
                className="px-3 py-2 text-left text-xs font-medium text-gray-400 bg-gray-900 border-r border-gray-700 min-w-[140px]"
              >
                {prop.name}
              </th>
            ))}
            <th className="px-2 py-2 bg-gray-900">
              <button
                onClick={() => setSchemaOpen(true)}
                className="text-gray-600 hover:text-gray-300"
              >
                <Settings2 size={13} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {dbRows.map(row => (
            <tr
              key={row.id}
              className="border-b border-gray-800 hover:bg-gray-800/40 group"
            >
              {visibleProps.map((prop, i) => (
                <td
                  key={prop.id}
                  className="px-3 py-2 border-r border-gray-800 relative cursor-pointer"
                  onClick={e => {
                    if (prop.id === TITLE_PROP_ID && i === 0) {
                      onOpenRow(row.id)
                    } else {
                      handleCellClick(e, row.id, prop.id)
                    }
                  }}
                >
                  {prop.id === TITLE_PROP_ID ? (
                    <span className="text-gray-100 text-sm font-medium hover:underline cursor-pointer">
                      {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
                    </span>
                  ) : (
                    <PropertyCell def={prop} value={row.properties[prop.id] ?? null} compact />
                  )}
                </td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => addRow(dbId)}
        className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 w-full border-b border-gray-800"
      >
        <Plus size={12} /> New row
      </button>

      {editing && editingDef && editingRow && (
        <div className="fixed z-50" style={{ top: (cellRef.current?.bottom ?? 0) + 4, left: cellRef.current?.left ?? 0 }}>
          <PropertyEditor
            def={editingDef}
            value={editingRow.properties[editing.propId] ?? null}
            onChange={handleChange}
            onClose={() => setEditing(null)}
            onSchemaChange={handleSchemaChange}
          />
        </div>
      )}

      {schemaOpen && <SchemaEditor dbId={dbId} onClose={() => setSchemaOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/database/views/TableView.tsx
git commit -m "feat: add database TableView with inline cell editing"
```

---

## Task 10: RowModal (Full Row Detail)

**Files:**
- Create: `src/components/database/RowModal.tsx`

- [ ] **Step 1: Write RowModal**

```tsx
// src/components/database/RowModal.tsx
import { X } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import type { PropertyValue, PropertyDef } from '@/lib/databaseTypes'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from './PropertyCell'
import PropertyEditor from './PropertyEditor'
import { useState } from 'react'

interface Props {
  dbId: string
  rowId: string
  onClose: () => void
}

export default function RowModal({ dbId, rowId, onClose }: Props) {
  const { databases, rows, updateRow, updateSchema } = useDatabase()
  const db = databases[dbId]
  const row = (rows[dbId] ?? []).find(r => r.id === rowId)
  const [editingPropId, setEditingPropId] = useState<string | null>(null)

  if (!db || !row) return null

  function handleChange(propId: string, value: PropertyValue) {
    updateRow(dbId, rowId, { [propId]: value })
  }

  function handleSchemaChange(def: PropertyDef) {
    const next = db!.schema.map(p => p.id === def.id ? def : p)
    updateSchema(dbId, next)
  }

  const title = String(row.properties[TITLE_PROP_ID] ?? 'Untitled')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[560px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <div className="flex-1">
            <input
              className="text-xl font-semibold text-gray-100 bg-transparent outline-none w-full"
              value={title}
              onChange={e => handleChange(TITLE_PROP_ID, e.target.value)}
              placeholder="Untitled"
            />
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 ml-3 mt-0.5">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {db.schema.filter(p => p.id !== TITLE_PROP_ID).map(prop => (
            <div key={prop.id} className="flex items-start gap-4">
              <span className="text-xs text-gray-500 w-28 pt-1 shrink-0">{prop.name}</span>
              <div className="relative flex-1">
                <div
                  className="cursor-pointer rounded p-1 hover:bg-gray-800 min-h-[28px]"
                  onClick={() => setEditingPropId(editingPropId === prop.id ? null : prop.id)}
                >
                  <PropertyCell def={prop} value={row.properties[prop.id] ?? null} />
                </div>
                {editingPropId === prop.id && (
                  <div className="absolute top-full left-0 mt-1 z-10">
                    <PropertyEditor
                      def={prop}
                      value={row.properties[prop.id] ?? null}
                      onChange={v => handleChange(prop.id, v)}
                      onClose={() => setEditingPropId(null)}
                      onSchemaChange={handleSchemaChange}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/database/RowModal.tsx
git commit -m "feat: add RowModal for full database row detail view"
```

---

## Task 11: DatabaseBoardView (Kanban by Select)

**Files:**
- Create: `src/components/database/views/DatabaseBoardView.tsx`

- [ ] **Step 1: Write DatabaseBoardView**

```tsx
// src/components/database/views/DatabaseBoardView.tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import type { PropertyDef } from '@/lib/databaseTypes'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'

interface Props {
  dbId: string
  viewId: string
  onOpenRow: (rowId: string) => void
}

export default function DatabaseBoardView({ dbId, viewId, onOpenRow }: Props) {
  const { databases, rows, addRow, updateRow, updateView } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  const view = db?.views.find(v => v.id === viewId)

  if (!db || !view) return null

  const groupProp = db.schema.find(p => p.id === view.groupByPropId && p.type === 'select')
  const selectProps = db.schema.filter(p => p.type === 'select')

  if (!groupProp && selectProps.length > 0) {
    updateView(dbId, viewId, { groupByPropId: selectProps[0].id })
    return null
  }

  if (!groupProp) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Board view requires a Select property. Add one in Properties.
      </div>
    )
  }

  const options = groupProp.config?.options ?? []
  const columns = [
    { id: '__none__', name: 'No status', optId: null },
    ...options.map(o => ({ id: o.id, name: o.name, optId: o.id })),
  ]

  function rowsForColumn(optId: string | null) {
    return dbRows.filter(r => {
      const val = r.properties[groupProp!.id]
      return optId === null ? (val == null || val === '') : val === optId
    })
  }

  async function addRowToColumn(optId: string | null) {
    const row = await addRow(dbId)
    if (optId) await updateRow(dbId, row.id, { [groupProp!.id]: optId })
  }

  const visibleProps = db.schema.filter(p => p.id !== TITLE_PROP_ID && p.id !== groupProp.id).slice(0, 3)

  return (
    <div className="flex-1 overflow-x-auto p-4">
      <div className="flex gap-3 h-full">
        {columns.map(col => {
          const colRows = rowsForColumn(col.optId)
          return (
            <div key={col.id} className="flex flex-col w-64 shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {col.name}
                  <span className="ml-2 text-gray-600 font-normal">{colRows.length}</span>
                </span>
                <button
                  onClick={() => addRowToColumn(col.optId)}
                  className="text-gray-600 hover:text-gray-300"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {colRows.map(row => (
                  <div
                    key={row.id}
                    onClick={() => onOpenRow(row.id)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-gray-500 hover:bg-gray-750"
                  >
                    <p className="text-sm text-gray-100 font-medium mb-2">
                      {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
                    </p>
                    {visibleProps.map(prop => (
                      <div key={prop.id} className="mb-1">
                        <PropertyCell def={prop} value={row.properties[prop.id] ?? null} compact />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/database/views/DatabaseBoardView.tsx
git commit -m "feat: add DatabaseBoardView Kanban view grouped by Select property"
```

---

## Task 12: GalleryView + ListView

**Files:**
- Create: `src/components/database/views/GalleryView.tsx`
- Create: `src/components/database/views/ListView.tsx`

- [ ] **Step 1: Write GalleryView**

```tsx
// src/components/database/views/GalleryView.tsx
import { Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'

interface Props { dbId: string; onOpenRow: (rowId: string) => void }

export default function GalleryView({ dbId, onOpenRow }: Props) {
  const { databases, rows, addRow } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  if (!db) return null

  const urlProp = db.schema.find(p => p.type === 'url')
  const previewProps = db.schema.filter(p => p.id !== TITLE_PROP_ID && p.id !== urlProp?.id).slice(0, 3)

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-3 gap-3">
        {dbRows.map(row => {
          const coverUrl = urlProp ? String(row.properties[urlProp.id] ?? '') : ''
          return (
            <div
              key={row.id}
              onClick={() => onOpenRow(row.id)}
              className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-gray-500 group"
            >
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-24 bg-gray-700/50 flex items-center justify-center text-gray-600 text-2xl">⊞</div>
              )}
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-100 mb-2 truncate">
                  {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
                </p>
                {previewProps.map(prop => (
                  <div key={prop.id} className="mb-1">
                    <PropertyCell def={prop} value={row.properties[prop.id] ?? null} compact />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        <button
          onClick={() => addRow(dbId)}
          className="border-2 border-dashed border-gray-700 rounded-xl h-48 flex flex-col items-center justify-center text-gray-600 hover:text-gray-400 hover:border-gray-500 gap-2"
        >
          <Plus size={20} />
          <span className="text-xs">New</span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write ListView**

```tsx
// src/components/database/views/ListView.tsx
import { Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'
import PropertyCell from '../PropertyCell'

interface Props { dbId: string; onOpenRow: (rowId: string) => void }

export default function ListView({ dbId, onOpenRow }: Props) {
  const { databases, rows, addRow } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  if (!db) return null

  const previewProps = db.schema.filter(p => p.id !== TITLE_PROP_ID).slice(0, 4)

  return (
    <div className="flex-1 overflow-y-auto">
      {dbRows.map(row => (
        <div
          key={row.id}
          onClick={() => onOpenRow(row.id)}
          className="flex items-center gap-4 px-4 py-2 border-b border-gray-800 hover:bg-gray-800/40 cursor-pointer"
        >
          <span className="text-sm text-gray-100 font-medium w-48 truncate shrink-0">
            {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            {previewProps.map(prop => (
              <PropertyCell key={prop.id} def={prop} value={row.properties[prop.id] ?? null} compact />
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={() => addRow(dbId)}
        className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 w-full"
      >
        <Plus size={12} /> New row
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/database/views/GalleryView.tsx src/components/database/views/ListView.tsx
git commit -m "feat: add GalleryView and ListView for databases"
```

---

## Task 13: DatabaseCalendarView

**Files:**
- Create: `src/components/database/views/DatabaseCalendarView.tsx`

- [ ] **Step 1: Write DatabaseCalendarView**

```tsx
// src/components/database/views/DatabaseCalendarView.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'

interface Props {
  dbId: string
  viewId: string
  onOpenRow: (rowId: string) => void
}

export default function DatabaseCalendarView({ dbId, viewId, onOpenRow }: Props) {
  const { databases, rows, addRow, updateRow, updateView } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  const view = db?.views.find(v => v.id === viewId)
  const [date, setDate] = useState(() => new Date())

  if (!db || !view) return null

  const dateProp = db.schema.find(p => p.id === view.datePropId && p.type === 'date')
  const dateProps = db.schema.filter(p => p.type === 'date')

  if (!dateProp && dateProps.length > 0) {
    updateView(dbId, viewId, { datePropId: dateProps[0].id })
    return null
  }

  if (!dateProp) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Calendar view requires a Date property. Add one in Properties.
      </div>
    )
  }

  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function rowsForDay(day: number) {
    const target = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dbRows.filter(r => {
      const val = r.properties[dateProp!.id]
      if (!val) return false
      const dateStr = typeof val === 'object' && 'start' in (val as object)
        ? (val as { start: string }).start
        : String(val)
      return dateStr.startsWith(target)
    })
  }

  async function handleAddToDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const row = await addRow(dbId)
    await updateRow(dbId, row.id, { [dateProp!.id]: { start: dateStr } })
    onOpenRow(row.id)
  }

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={() => setDate(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-200">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-gray-200">
          {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setDate(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-200">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-800 text-xs text-gray-500 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {cells.map((day, i) => {
          const dayRows = day ? rowsForDay(day) : []
          return (
            <div
              key={i}
              className="border-r border-b border-gray-800 min-h-[100px] p-1 group"
            >
              {day && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 px-1">{day}</span>
                    <button
                      onClick={() => handleAddToDay(day)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-300"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  {dayRows.map(row => (
                    <div
                      key={row.id}
                      onClick={() => onOpenRow(row.id)}
                      className="mt-1 px-1.5 py-0.5 bg-purple-900/50 text-purple-200 rounded text-xs truncate cursor-pointer hover:bg-purple-900/70"
                    >
                      {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/database/views/DatabaseCalendarView.tsx
git commit -m "feat: add DatabaseCalendarView month grid view"
```

---

## Task 14: DatabasePage (Full Assembly)

**Files:**
- Modify: `src/components/database/DatabasePage.tsx`

- [ ] **Step 1: Replace stub with full DatabasePage**

```tsx
// src/components/database/DatabasePage.tsx
import { useEffect, useState } from 'react'
import { useDatabase } from '@/stores/database'
import { useAuth } from '@/stores/auth'
import { useWorkspace } from '@/stores/workspace'
import DatabaseToolbar from './DatabaseToolbar'
import TableView from './views/TableView'
import DatabaseBoardView from './views/DatabaseBoardView'
import GalleryView from './views/GalleryView'
import ListView from './views/ListView'
import DatabaseCalendarView from './views/DatabaseCalendarView'
import RowModal from './RowModal'

interface Props { pageId: string }

export default function DatabasePage({ pageId }: Props) {
  const { loadDatabase, createDatabase, databases, loading } = useDatabase()
  const { user } = useAuth()
  const { pages } = useWorkspace()
  const page = pages[pageId]

  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const db = databases[pageId]
    if (db) {
      if (!activeViewId && db.views.length > 0) setActiveViewId(db.views[0].id)
      return
    }
    loadDatabase(pageId).then(() => {
      const loaded = useDatabase.getState().databases[pageId]
      if (!loaded) {
        createDatabase(user.id, pageId, page?.title ?? 'Untitled')
          .then(db => setActiveViewId(db.views[0].id))
      } else if (loaded.views.length > 0) {
        setActiveViewId(loaded.views[0].id)
      }
    })
  }, [pageId, user])

  const db = databases[pageId]
  const isLoading = loading[pageId]

  if (isLoading || !db) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Loading database…
      </div>
    )
  }

  const activeView = db.views.find(v => v.id === activeViewId) ?? db.views[0]

  function handleSelectView(viewId: string) {
    setActiveViewId(viewId)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      <div className="px-6 pt-5 pb-2">
        <h1 className="text-xl font-semibold text-gray-100">{page?.title ?? db.title}</h1>
      </div>

      <DatabaseToolbar
        dbId={pageId}
        activeViewId={activeView?.id ?? ''}
        onSelectView={handleSelectView}
      />

      {activeView?.type === 'table' && (
        <TableView dbId={pageId} onOpenRow={setOpenRowId} />
      )}
      {activeView?.type === 'board' && (
        <DatabaseBoardView dbId={pageId} viewId={activeView.id} onOpenRow={setOpenRowId} />
      )}
      {activeView?.type === 'gallery' && (
        <GalleryView dbId={pageId} onOpenRow={setOpenRowId} />
      )}
      {activeView?.type === 'list' && (
        <ListView dbId={pageId} onOpenRow={setOpenRowId} />
      )}
      {activeView?.type === 'calendar' && (
        <DatabaseCalendarView dbId={pageId} viewId={activeView.id} onOpenRow={setOpenRowId} />
      )}

      {openRowId && (
        <RowModal dbId={pageId} rowId={openRowId} onClose={() => setOpenRowId(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to check for errors**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -30
```

Fix any TypeScript errors before proceeding.

- [ ] **Step 3: Run tests**

```bash
cd /Users/michael/flowspace && npx vitest run 2>&1 | tail -15
```

Expected: all existing tests pass + 4 database store tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/database/DatabasePage.tsx
git commit -m "feat: assemble DatabasePage with all 5 views and RowModal"
```

---

## Task 15: DatabaseBlock (Inline Embed in BlockEditor)

**Files:**
- Create: `src/components/database/DatabaseBlock.tsx`
- Modify: `src/components/BlockEditor.tsx`

- [ ] **Step 1: Create DatabaseBlock**

```tsx
// src/components/database/DatabaseBlock.tsx
import { useEffect } from 'react'
import { useDatabase } from '@/stores/database'
import { useAuth } from '@/stores/auth'
import { useWorkspace } from '@/stores/workspace'
import type { Block } from '@/types'
import TableView from './views/TableView'
import DatabaseToolbar from './DatabaseToolbar'
import { useState } from 'react'
import RowModal from './RowModal'

interface Props {
  block: Block
  pageId: string
}

export default function DatabaseBlock({ block, pageId }: Props) {
  // block.content stores the database page id
  const dbId = block.content
  const { databases, rows, loading, loadDatabase, createDatabase } = useDatabase()
  const { user } = useAuth()
  const { pages, openTab } = useWorkspace()
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  useEffect(() => {
    if (!dbId || !user) return
    loadDatabase(dbId).then(() => {
      const db = useDatabase.getState().databases[dbId]
      if (!db) {
        createDatabase(user.id, dbId, 'Embedded Database')
          .then(d => setActiveViewId(d.views[0].id))
      } else {
        setActiveViewId(db.views[0].id)
      }
    })
  }, [dbId, user])

  const db = databases[dbId]
  if (!db) return (
    <div className="my-2 px-3 py-2 bg-gray-800/50 rounded-lg text-sm text-gray-500 border border-gray-700">
      {loading[dbId] ? 'Loading database…' : 'Database not found'}
    </div>
  )

  const activeView = db.views.find(v => v.id === activeViewId) ?? db.views[0]

  return (
    <div className="my-2 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-800/50">
        <span className="text-xs font-medium text-gray-400">⊞ {db.title}</span>
        <button
          onClick={() => openTab(dbId)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Open full page →
        </button>
      </div>
      <DatabaseToolbar dbId={dbId} activeViewId={activeView?.id ?? ''} onSelectView={setActiveViewId} />
      <div className="max-h-80 overflow-auto">
        <TableView dbId={dbId} onOpenRow={setOpenRowId} />
      </div>
      {openRowId && <RowModal dbId={dbId} rowId={openRowId} onClose={() => setOpenRowId(null)} />}
    </div>
  )
}
```

- [ ] **Step 2: Add `database` to SLASH_COMMANDS in BlockEditor**

In `src/components/BlockEditor.tsx`, find the `SLASH_COMMANDS` array. Add:

```ts
{ label: 'Database', type: 'database', icon: '⊞' },
```

- [ ] **Step 3: Handle database block type in BlockEditor rendering**

In `src/components/BlockEditor.tsx`, find the `switch (block.type)` or the if-chain that renders different block types. Add before the default case:

```tsx
if (block.type === 'database') {
  return <DatabaseBlock block={block} pageId={pageId} />
}
```

Add the import at the top of the file:

```tsx
import DatabaseBlock from './database/DatabaseBlock'
```

- [ ] **Step 4: Handle applyCommand for `database` type**

In `src/components/BlockEditor.tsx`, in the `applyCommand` function, find where it handles special types like `file`. Add:

```ts
if (type === 'database') {
  const dbPageId = createDatabase(null)
  changeBlockType(pageId, block.id, 'database')
  // Store the new database page id as the block content
  updateBlock(pageId, block.id, { content: dbPageId, type: 'database' })
  return
}
```

Also add `createDatabase` to the workspace destructure at the top of the component:

```tsx
const { updateBlock, addBlock, deleteBlock, changeBlockType, createDatabase } = useWorkspace()
```

- [ ] **Step 5: Add BLOCK_PLACEHOLDER for database type**

In `BLOCK_PLACEHOLDER` record (top of BlockEditor), add:

```ts
database: '',
```

- [ ] **Step 6: Build**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit 2>&1 | head -30
```

Fix any TypeScript errors.

- [ ] **Step 7: Run all tests**

```bash
cd /Users/michael/flowspace && npx vitest run 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/database/DatabaseBlock.tsx src/components/BlockEditor.tsx
git commit -m "feat: add DatabaseBlock inline embed and /database slash command"
```

---

## Task 16: Build + Manual Smoke Test

- [ ] **Step 1: Build for production**

```bash
cd /Users/michael/flowspace && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Smoke test checklist**

Start the dev server:
```bash
cd /Users/michael/flowspace && npm run dev
```

Test these flows manually in the browser:

1. Create a new database from the sidebar "New database" option
2. Verify it opens as a database page with table view
3. Add a row — click "New row"
4. Click the row title to open RowModal
5. Add a Select property via SchemaEditor (⚙ icon)
6. Set a value using the SelectEditor popover
7. Switch to Board view — verify Kanban columns appear
8. Switch to Gallery view — verify cards appear
9. Switch to Calendar view — verify month grid
10. Switch to List view — verify compact list
11. Add another view via "+ Add view"
12. Open a regular page, type `/database` — verify the block appears
13. Verify the embedded database shows a table and toolbar

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Notion-style databases with 5 views, 8 property types, inline embed"
```
