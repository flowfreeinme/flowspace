export interface WorkspaceContext {
  mode: 'board' | 'page'
  board?: {
    title: string
    sections: { title: string }[]
    cards: { text: string }[]
  }
  page?: {
    title: string
    blocks: { type: string; content: string }[]
  }
  allBoards?: { title: string; sections: string[] }[]
  calendar?: {
    title: string
    date: string
    location?: string
    start?: string
    end?: string
    startTime?: string
    endTime?: string
    allDay?: boolean
  }[]
  calendarRange?: { label: string; start: string; end: string }
  workflows?: WorkflowContext[]
  todos?: TodoContext[]
}

export interface WorkflowContext {
  type: 'kanban' | 'timeline' | 'flowchart'
  pageTitle: string
  items: string[]
}

export interface TodoContext {
  pageTitle: string
  open: string[]
  done: string[]
}

export interface AiAction {
  type:
    | 'clear_board'
    | 'create_section'
    | 'create_card'
    | 'delete_card'
    | 'delete_section'
    | 'rename_section'
    | 'move_card'
    | 'replace_selection'
    | 'create_workflow'
  title?: string
  newTitle?: string
  text?: string
  section?: string
  toSection?: string
  workflowType?: 'kanban' | 'timeline' | 'flowchart'
  items?: {
    title?: string
    text?: string
    status?: string
    section?: string
    start?: string
    end?: string
    startTime?: string
    endTime?: string
    location?: string
    color?: string
  }[]
}
