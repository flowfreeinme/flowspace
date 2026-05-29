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
