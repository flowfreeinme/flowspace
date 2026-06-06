import type { WidgetConfigMap } from './widgetSettings'

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
  | 'boardWidget'
  | 'database'

export interface Block {
  id: string
  type: BlockType
  content: string
  checked?: boolean
  indent?: number
}

export interface Page {
  id: string
  title: string
  icon: string
  blocks: Block[]
  children: string[]
  parentId: string | null
  createdAt: number
  updatedAt: number
  boardMode?: boolean
  database?: boolean
  folder?: boolean
  favorite?: boolean
  archived?: boolean
  lastOpenedAt?: number
}

export interface Tab {
  id: string
  pageId: string
}

export type HomeWidgetType =
  | 'calendar'
  | 'today'
  | 'focus'
  | 'recent'
  | 'todoList'
  | 'proPlanner'
  | 'focusTimer'
  | 'weather'
  | 'aiBriefing'

export interface HomeWidget {
  id: string
  type: HomeWidgetType
  x: number
  y: number
  w: number
  h: number
}

interface HomeCenterConfig {
  widgets: HomeWidget[]
  widgetSettings?: Partial<WidgetConfigMap>
}

export interface WorkspaceData {
  pages: Record<string, Page>
  rootPages: string[]
  tabs: Tab[]
  activeTabId: string | null
  homeCenter?: HomeCenterConfig
}
