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
  _rows: Pick<DatabaseRow, 'id' | 'position'>[],
  _rowId: string,
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
    const current = get().rows[dbId]?.find(r => r.id === rowId)
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
