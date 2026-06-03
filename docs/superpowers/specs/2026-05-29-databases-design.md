# Notion-Style Databases — Design Spec

**Date:** 2026-05-29  
**Status:** Approved

---

## Overview

Add structured databases to Flowspace — rows with typed properties, multiple views (Table, Board, Gallery, Calendar, List), and Relations between databases. Databases exist both as standalone pages in the sidebar and as embeddable blocks inside any page.

---

## Data Model

### Supabase Tables

**`databases`**
```
id            uuid PRIMARY KEY
workspace_id  uuid REFERENCES workspaces
title         text
icon          text (emoji or icon name)
schema        jsonb  -- PropertyDef[]
views         jsonb  -- ViewDef[]
created_at    timestamptz
updated_at    timestamptz
```

**`database_rows`**
```
id            uuid PRIMARY KEY
database_id   uuid REFERENCES databases
position      float8  -- fractional index for ordering
properties    jsonb   -- Record<propId, value>
created_at    timestamptz
updated_at    timestamptz
```

### TypeScript Types (`src/lib/databaseTypes.ts`)

```ts
type PropertyType = 'text' | 'number' | 'select' | 'multi_select' | 'checkbox' | 'date' | 'url' | 'relation';

type PropertyValue = string | number | boolean | string[] | { start: string; end?: string } | null;

interface SelectOption {
  id: string;
  name: string;
  color: string; // tailwind color name e.g. 'red', 'blue', 'green'
}

interface PropertyDef {
  id: string;
  name: string;
  type: PropertyType;
  config?: {
    options?: SelectOption[];           // select / multi_select
    numberFormat?: 'plain' | 'dollar' | 'percent';
    dateIncludeTime?: boolean;
    relationDatabaseId?: string;        // relation: target database id
  };
}

type ViewType = 'table' | 'board' | 'gallery' | 'calendar' | 'list';

interface ViewDef {
  id: string;
  name: string;
  type: ViewType;
  groupByPropId?: string;    // board: select prop to group by
  datePropId?: string;       // calendar: date prop to use
  coverPropId?: string;      // gallery: url prop for cover image
  sort?: { propId: string; direction: 'asc' | 'desc' }[];
  hiddenProps?: string[];
  // filter: reserved for future phase — not implemented in this spec
}

interface Database {
  id: string;
  workspaceId: string;
  title: string;
  icon: string;
  schema: PropertyDef[];
  views: ViewDef[];
  createdAt: string;
  updatedAt: string;
}

interface DatabaseRow {
  id: string;
  databaseId: string;
  position: number;
  properties: Record<string, PropertyValue>;
  createdAt: string;
  updatedAt: string;
}
```

---

## Property Types

| Type | Storage | Display | Notes |
|------|---------|---------|-------|
| Text | string | Rich text | Title field is always Text, always first |
| Number | number | Formatted (plain / $ / %) | |
| Select | string (option id) | Colored pill | Options stored in PropertyDef.config |
| Multi-select | string[] (option ids) | Multiple colored pills | |
| Checkbox | boolean | ✓ or ○ | |
| Date | string (ISO) or {start, end} | Formatted date, optional time | |
| URL | string | Clickable link | Validated on input |
| Relation | string[] (row ids) | Linked page titles | Points to another database |

---

## Views

### Table View (default)
- Spreadsheet grid: columns = properties, rows = database rows
- Click cell to edit inline
- Click row title to open RowModal
- Add column button → SchemaEditor
- Add row button at bottom
- Column resize by dragging header border

### Board View
- Kanban columns grouped by a Select property
- Reuses existing KanbanBlock drag-drop logic where possible
- Each card shows title + configurable secondary properties
- Group-by selector in view toolbar

### Gallery View
- Cards in a responsive grid (3-4 columns)
- Optional cover image from a URL property
- Title + 2-3 configurable properties shown on card

### Calendar View
- Rows plotted on calendar by a Date property
- Reuses existing DayView/WeekView layout components
- Click date to add a row with that date pre-filled
- Month/week/day toggle

### List View
- Compact single-line rows
- Title + inline property chips
- Fastest to scan, no frills

---

## Component Structure

```
src/components/database/
  DatabasePage.tsx          -- standalone page (routed from sidebar)
  DatabaseBlock.tsx         -- embeddable /database block in BlockEditor
  DatabaseToolbar.tsx       -- view switcher, filter, sort, search
  views/
    TableView.tsx
    BoardView.tsx           -- wraps KanbanBlock drag logic
    GalleryView.tsx
    CalendarView.tsx        -- wraps existing calendar layout
    ListView.tsx
  PropertyCell.tsx          -- renders a property value in table context
  PropertyEditor.tsx        -- edit popover for any property value
  SchemaEditor.tsx          -- add/rename/reorder/delete columns
  RowModal.tsx              -- full-page row detail with all properties
src/lib/
  databaseStore.ts          -- Zustand store + Supabase CRUD
  databaseTypes.ts          -- shared TS types (above)
```

---

## State Management (`databaseStore.ts`)

Zustand store, persisted to Supabase. Local-first: mutations update local state immediately and sync async.

```ts
interface DatabaseStore {
  databases: Record<string, Database>;
  rows: Record<string, DatabaseRow[]>;  // keyed by databaseId

  // CRUD
  createDatabase(title: string): Promise<Database>;
  updateSchema(dbId: string, schema: PropertyDef[]): Promise<void>;
  addRow(dbId: string): Promise<DatabaseRow>;
  updateRow(dbId: string, rowId: string, properties: Record<string, PropertyValue>): Promise<void>;
  deleteRow(dbId: string, rowId: string): Promise<void>;
  reorderRow(dbId: string, rowId: string, newPosition: number): Promise<void>;

  // Views
  addView(dbId: string, view: ViewDef): Promise<void>;
  updateView(dbId: string, viewId: string, patch: Partial<ViewDef>): Promise<void>;
}
```

---

## Integration Points

### Sidebar
- New page type `database` with ⊞ icon
- Creating a new page shows type picker: Page | Database
- Database pages appear in the sidebar tree alongside regular pages
- Nested databases supported (database inside a page folder)

### Block Editor
- `/database` slash command
- Shows a modal: "Create new database" or "Link existing database"
- Embedded DatabaseBlock shows a compact view with the same view switcher
- Embedded view is read/write — changes sync to the same underlying data

### Existing Component Reuse
- `BoardView.tsx` reuses drag logic from `KanbanBlock.tsx`
- `CalendarView.tsx` reuses layout from `DayView.tsx` / `WeekView.tsx`
- `RowModal.tsx` reuses `PropertiesModal.tsx` styling patterns

---

## Error Handling & Edge Cases

- Empty database: show empty state with "Add a row" CTA
- Relation to deleted database: show "[Deleted database]" label, don't crash
- Invalid date value: show red border, don't save until valid
- Concurrent edits: last-write-wins per row (Supabase updated_at timestamp)
- Offline: queue mutations locally, sync on reconnect (existing pattern in workspace store)

---

## Out of Scope (this phase)
- Formula and Rollup properties
- Row comments / activity log
- CSV import/export (add later)
- Database templates
- Filter rules per-view (ViewDef has a reserved slot; filter UI not built in this phase)
