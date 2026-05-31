import { useRef, useEffect, useState, KeyboardEvent, useCallback } from 'react'
import { Paperclip, Download, X, FileText } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { useCalendar } from '@/stores/calendar'
import { useAuth } from '@/stores/auth'
import { useNotifications } from '@/stores/notifications'
import { uploadToR2 } from '@/lib/r2'
import { buildTodoContext, buildWorkflowContext, formatCalendarEventsForAi } from '@/lib/aiContext'
import type { Block, BlockType } from '@/types'
import type { WorkspaceContext } from '@/lib/aiTypes'
import ImageCropModal from './ImageCropModal'
import ResizableBlock from './ResizableBlock'
import AiTextToolbar from './AiTextToolbar'
import DatabaseBlock from './database/DatabaseBlock'
import { supabase } from '@/lib/supabase'
import { detectCandidateActions, findRelatedPages } from '@/lib/aiInsights'
import { useAiInsightsStore } from '@/stores/aiInsightsStore'
import PageInsightBar from '@/components/PageInsightBar'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

const BLOCK_PLACEHOLDER: Record<BlockType, string> = {
  text: "Type '/' for commands…",
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  todo: 'To-do',
  bullet: 'List item',
  numbered: 'Numbered item',
  code: 'Code…',
  divider: '',
  quote: 'Quote…',
  file: '',
  textbox: '',
  section: '',
  image: '',
  kanban: '',
  flowchart: '',
  timeline: '',
  boardWidget: '',
  database: '',
}

const SLASH_COMMANDS: { label: string; type: BlockType; icon: string }[] = [
  { label: 'Text', type: 'text', icon: 'T' },
  { label: 'Heading 1', type: 'heading1', icon: 'H1' },
  { label: 'Heading 2', type: 'heading2', icon: 'H2' },
  { label: 'Heading 3', type: 'heading3', icon: 'H3' },
  { label: 'To-do', type: 'todo', icon: '☐' },
  { label: 'Bullet List', type: 'bullet', icon: '•' },
  { label: 'Numbered List', type: 'numbered', icon: '1.' },
  { label: 'Quote', type: 'quote', icon: '"' },
  { label: 'Code', type: 'code', icon: '</>' },
  { label: 'Divider', type: 'divider', icon: '—' },
  { label: 'File attachment', type: 'file', icon: '📎' },
  { label: 'Text box', type: 'textbox', icon: '▭' },
  { label: 'Database', type: 'database', icon: '⊞' },
]

interface FileData {
  url: string
  name: string
  size: number
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function uploadFile(file: File, userId: string, pageId: string): Promise<FileData> {
  return uploadToR2(file, userId, pageId, file.name)
}

interface BlockRowProps {
  block: Block
  pageId: string
  index: number
  focusNext: (id: string) => void
  focusPrev: (id: string) => void
  registerRef: (id: string, el: HTMLDivElement | null) => void
}

function BlockRow({ block, pageId, index, focusNext, focusPrev, registerRef }: BlockRowProps) {
  const { updateBlock, addBlock, deleteBlock, changeBlockType, createDatabase } = useWorkspace()
  const { user } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [menuFilter, setMenuFilter] = useState('')
  const [menuIdx, setMenuIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [cropFile, setCropFile] = useState<File | null>(null)

  useEffect(() => {
    if (ref.current && ref.current.textContent !== block.content) {
      ref.current.textContent = block.content
    }
  }, [])

  useEffect(() => {
    if (ref.current) registerRef(block.id, ref.current)
    return () => registerRef(block.id, null)
  }, [block.id])

  const filtered = SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(menuFilter.toLowerCase())
  )

  function handleInput() {
    const text = ref.current?.textContent ?? ''
    if (text.startsWith('/')) {
      setMenuFilter(text.slice(1))
      setMenuIdx(0)
      setShowMenu(true)
    } else {
      setShowMenu(false)
      updateBlock(pageId, block.id, { content: text })
    }
  }

  function applyCommand(type: BlockType) {
    if (type === 'file') {
      if (ref.current) ref.current.textContent = ''
      setShowMenu(false)
      setTimeout(() => fileInputRef.current?.click(), 50)
      return
    }
    if (type === 'database') {
      const dbPageId = createDatabase(null)
      changeBlockType(pageId, block.id, 'database')
      updateBlock(pageId, block.id, { content: dbPageId })
      setShowMenu(false)
      return
    }
    if (ref.current) ref.current.textContent = ''
    changeBlockType(pageId, block.id, type)
    updateBlock(pageId, block.id, { content: '' })
    setShowMenu(false)
    setTimeout(() => ref.current?.focus(), 0)
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > MAX_FILE_SIZE) { setUploadError('File must be under 25 MB'); return }
    if (fileInputRef.current) fileInputRef.current.value = ''
    const ext = (file.name.split('.').pop() ?? '').toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
    if (isImage) { setCropFile(file); return }
    await doUpload(file, file.name)
  }

  async function doUpload(fileOrBlob: File | Blob, name: string) {
    if (!user) return
    setUploading(true)
    setUploadError('')
    try {
      const f = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], name, { type: fileOrBlob.type })
      const data = await uploadFile(f, user.id, pageId)
      changeBlockType(pageId, block.id, 'file')
      updateBlock(pageId, block.id, { content: JSON.stringify(data) })
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleCropConfirm(blob: Blob, fileName: string) {
    setCropFile(null)
    await doUpload(blob, fileName)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (showMenu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIdx(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenuIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); if (filtered[menuIdx]) applyCommand(filtered[menuIdx].type) }
      if (e.key === 'Escape') setShowMenu(false)
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const id = addBlock(pageId, block.id)
      setTimeout(() => focusNext(id), 0)
    }

    if (e.key === 'Backspace' && (ref.current?.textContent ?? '') === '') {
      e.preventDefault()
      deleteBlock(pageId, block.id)
      setTimeout(() => focusPrev(block.id), 0)
    }

    if (e.key === 'ArrowDown') { e.preventDefault(); focusNext(block.id) }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusPrev(block.id) }
  }

  if (block.type === 'database') {
    return <DatabaseBlock block={block} pageId={pageId} />
  }

  if (block.type === 'textbox') {
    // content is JSON {text, width?, height?} or plain string (legacy)
    let tbData: { text: string; width?: number; height?: number } = { text: '' }
    try {
      const parsed = JSON.parse(block.content)
      tbData = typeof parsed === 'object' ? parsed : { text: block.content }
    } catch { tbData = { text: block.content } }

    function onTbResize(w: number, h: number) {
      updateBlock(pageId, block.id, { content: JSON.stringify({ ...tbData, width: w, height: h }) })
    }
    function onTbInput(e: React.FormEvent<HTMLDivElement>) {
      updateBlock(pageId, block.id, {
        content: JSON.stringify({ ...tbData, text: (e.target as HTMLDivElement).textContent ?? '' })
      })
    }

    return (
      <div className="group py-1">
        <ResizableBlock
          width={tbData.width ?? 320}
          height={tbData.height ?? undefined}
          onResize={onTbResize}
          minW={120}
          minH={48}
          className="block w-fit"
        >
          <div className="relative border border-surface-4 rounded-xl bg-surface-2 p-3 h-full">
            <div
              contentEditable
              suppressContentEditableWarning
              onInput={onTbInput}
              className="outline-none text-gray-200 text-sm whitespace-pre-wrap break-words min-h-[40px] h-full"
              data-placeholder="Type something…"
              suppressHydrationWarning
            />
            <button onClick={() => deleteBlock(pageId, block.id)}
              className="absolute top-2 right-2 p-1 rounded text-gray-700 hover:text-red-400 hover:bg-surface-4 opacity-0 group-hover:opacity-100 transition-all">
              <X size={12} />
            </button>
          </div>
        </ResizableBlock>
        <p className="text-xs text-gray-700 mt-0.5">Double-click border to resize</p>
      </div>
    )
  }

  if (block.type === 'divider') {
    return <div className="my-3 border-t border-surface-4" />
  }

  if (block.type === 'file') {
    let fileData: FileData | null = null
    try { fileData = JSON.parse(block.content) } catch { /* empty block */ }

    if (!fileData) {
      return (
        <div className="relative group py-0.5">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 border border-dashed border-surface-4 hover:border-surface-3 rounded-lg px-3 py-2 transition-colors w-full"
          >
            <Paperclip size={14} />
            {uploading ? 'Uploading…' : 'Click to attach a file (max 25 MB)'}
          </button>
          {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
        </div>
      )
    }

    const ext = (fileData.name.split('.').pop() ?? '').toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
    const isPdf = ext === 'pdf'

    if (isImage) {
      function onImgResize(w: number, h: number) {
        updateBlock(pageId, block.id, {
          content: JSON.stringify({ ...fileData, displayWidth: w, displayHeight: h })
        })
      }
      return (
        <div className="group py-1">
          <ResizableBlock
            width={(fileData as FileData & { displayWidth?: number }).displayWidth ?? null}
            height={(fileData as FileData & { displayHeight?: number }).displayHeight ?? null}
            onResize={onImgResize}
            lockAspectRatio
            minW={60}
            minH={40}
            className="block max-w-full"
          >
            <img
              src={fileData.url}
              alt={fileData.name}
              className="w-full h-full rounded-xl border border-surface-3 block object-contain"
              style={{ display: 'block' }}
              draggable={false}
            />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={fileData.url} target="_blank" rel="noopener noreferrer" download={fileData.name}
                className="p-1.5 rounded-lg bg-surface-2/90 text-gray-400 hover:text-white border border-surface-4 transition-colors">
                <Download size={13} />
              </a>
              <button onClick={() => deleteBlock(pageId, block.id)}
                className="p-1.5 rounded-lg bg-surface-2/90 text-gray-400 hover:text-red-400 border border-surface-4 transition-colors">
                <X size={13} />
              </button>
            </div>
          </ResizableBlock>
          <p className="text-xs text-gray-600 mt-1">{fileData.name}</p>
        </div>
      )
    }

    if (isPdf) {
      return (
        <div className="group py-1">
          <div className="border border-surface-3 rounded-xl overflow-hidden">
            <embed src={fileData.url} type="application/pdf" className="w-full" style={{ height: '560px' }} />
          </div>
          <div className="flex items-center gap-2 mt-1 px-1">
            <FileText size={13} className="text-accent shrink-0" />
            <span className="text-xs text-gray-500 flex-1 truncate">{fileData.name}</span>
            <span className="text-xs text-gray-600">{formatBytes(fileData.size)}</span>
            <a href={fileData.url} target="_blank" rel="noopener noreferrer" download={fileData.name}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-surface-4 transition-colors">
              <Download size={13} />
            </a>
            <button onClick={() => deleteBlock(pageId, block.id)}
              className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-surface-4 transition-colors opacity-0 group-hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        </div>
      )
    }

    // Generic file card
    return (
      <div className="group py-0.5">
        <div className="flex items-center gap-2 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2">
          <FileText size={16} className="text-accent shrink-0" />
          <span className="flex-1 text-sm text-gray-200 truncate">{fileData.name}</span>
          <span className="text-xs text-gray-600 shrink-0">{formatBytes(fileData.size)}</span>
          <a href={fileData.url} target="_blank" rel="noopener noreferrer" download={fileData.name}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-surface-4 transition-colors">
            <Download size={13} />
          </a>
          <button onClick={() => deleteBlock(pageId, block.id)}
            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-surface-4 transition-colors opacity-0 group-hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  const baseClass = 'outline-none w-full break-words whitespace-pre-wrap'

  function renderContent() {
    switch (block.type) {
      case 'heading1':
        return <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-3xl font-bold text-white`} data-placeholder="Heading 1" />
      case 'heading2':
        return <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-2xl font-semibold text-white`} data-placeholder="Heading 2" />
      case 'heading3':
        return <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-xl font-medium text-white`} data-placeholder="Heading 3" />
      case 'quote':
        return <div className="border-l-4 border-accent pl-3">
          <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-gray-300 italic`} data-placeholder="Quote…" />
        </div>
      case 'code':
        return <pre className="bg-surface-3 rounded-lg px-4 py-3 my-1">
          <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} font-mono text-sm text-green-300`} data-placeholder="Code…" />
        </pre>
      case 'todo':
        return <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={block.checked ?? false}
            onChange={e => updateBlock(pageId, block.id, { checked: e.target.checked })}
            className="mt-1 accent-accent shrink-0"
          />
          <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-gray-200 ${block.checked ? 'line-through text-gray-500' : ''}`} data-placeholder="To-do" />
        </div>
      case 'bullet':
        return <div className="flex items-start gap-2">
          <span className="mt-1 text-accent shrink-0">•</span>
          <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-gray-200`} data-placeholder="List item" />
        </div>
      case 'numbered':
        return <div className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-400 text-sm shrink-0 min-w-[1.2rem]">{index + 1}.</span>
          <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-gray-200`} data-placeholder="Numbered item" />
        </div>
      default:
        return <div ref={ref} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} className={`${baseClass} text-gray-200`} data-placeholder={BLOCK_PLACEHOLDER[block.type]} />
    }
  }

  return (
    <>
      <div className="relative group py-0.5" data-block-id={block.id}>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xls,.xlsx" onChange={handleFileSelected} />
        {renderContent()}
        {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
        {showMenu && filtered.length > 0 && (
          <div className="absolute z-50 left-0 top-full mt-1 w-52 bg-surface-2 border border-surface-4 rounded-xl shadow-xl overflow-hidden">
            {filtered.map((cmd, i) => (
              <button
                key={cmd.type}
                onMouseDown={() => applyCommand(cmd.type)}
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm text-left transition-colors ${
                  i === menuIdx ? 'bg-accent/20 text-white' : 'text-gray-300 hover:bg-surface-3'
                }`}
              >
                <span className="text-xs font-mono w-6 text-center text-gray-400">{cmd.icon}</span>
                {cmd.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </>
  )
}

interface BlockEditorProps {
  pageId: string
  onRequestFileUpload?: (insertFn: (file: File) => void) => void
}

export default function BlockEditor({ pageId, onRequestFileUpload }: BlockEditorProps) {
  const { pages, addBlock, updateBlock, changeBlockType } = useWorkspace()
  const { user } = useAuth()
  const notify = useNotifications(s => s.add)
  const page = pages[pageId]
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const allPagesMap = useWorkspace(s => s.pages)
  const calendarEvents = useCalendar(s => s.events)

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) blockRefs.current.set(id, el)
    else blockRefs.current.delete(id)
  }, [])

  useEffect(() => {
    if (!onRequestFileUpload) return
    onRequestFileUpload(async (file: File) => {
      if (!user || !page) return
      if (file.size > MAX_FILE_SIZE) {
        notify({ type: 'error', message: 'Attachment failed', sub: 'File exceeds 25 MB limit.' })
        return
      }
      try {
        const data = await uploadFile(file, user.id, pageId)
        const lastBlock = page.blocks[page.blocks.length - 1]
        let blockId: string
        if (lastBlock && lastBlock.type === 'text' && lastBlock.content === '') {
          blockId = lastBlock.id
        } else {
          blockId = addBlock(pageId, lastBlock?.id ?? '')
        }
        changeBlockType(pageId, blockId, 'file')
        updateBlock(pageId, blockId, { content: JSON.stringify(data) })
        notify({ type: 'success', message: 'Attachment added', sub: file.name })
      } catch (err) {
        notify({
          type: 'error',
          message: 'Attachment failed',
          sub: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
  }, [onRequestFileUpload, user, page, pageId, notify])

  const analyzeOnSave = useAiInsightsStore(s => s.analyzeOnSave)
  const openTab = useWorkspace(s => s.openTab)

  useEffect(() => {
    if (!page) return
    const hasContent = page.blocks.some(b => b.content.trim().length > 10)
    if (!hasContent) return

    const allPages = Object.values(useWorkspace.getState().pages)
    const candidateActions = detectCandidateActions(page)
    const heuristicRelated = findRelatedPages(page, allPages)
    const pageSummaries = allPages
      .filter(p => !p.archived && !(p as any).database)
      .map(p => ({ id: p.id, title: p.title || 'Untitled', updatedAt: p.updatedAt }))

    supabase.auth.getSession().then(({ data: { session } }) => {
      analyzeOnSave(
        page.id,
        page.blocks.map(b => b.content).join('\n').slice(0, 1500),
        candidateActions,
        heuristicRelated,
        pageSummaries,
        session?.access_token ?? null
      )
    })
  }, [page?.blocks])

  if (!page) return null

  const now = new Date()
  const activeContextPages = Object.values(allPagesMap)
    .filter(p => !p.folder && !p.archived)
    .sort((a, b) => (a.id === pageId ? -1 : b.id === pageId ? 1 : (b.lastOpenedAt ?? b.updatedAt) - (a.lastOpenedAt ?? a.updatedAt)))
    .slice(0, 8)
  const workspaceContext: WorkspaceContext = {
    mode: 'page',
    page: {
      title: page.title,
      blocks: page.blocks
        .filter(b => b.type !== 'image' && b.type !== 'file')
        .map(b => ({ type: b.type, content: b.content.slice(0, 200) })),
    },
    allBoards: Object.values(allPagesMap)
      .filter(p => p.boardMode && p.id !== pageId)
      .map(p => ({
        title: p.title,
        sections: p.blocks
          .filter(b => b.type === 'section')
          .map(b => { try { return JSON.parse(b.content).title || '' } catch { return '' } })
          .filter(Boolean),
      })),
    calendar: formatCalendarEventsForAi(calendarEvents, now),
    workflows: buildWorkflowContext(activeContextPages).slice(0, 12),
    todos: buildTodoContext(activeContextPages).slice(0, 12),
  }

  function handleReplaceSelection(newText: string) {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    for (const [id, el] of blockRefs.current) {
      if (el.contains(sel.anchorNode)) {
        updateBlock(pageId, id, { content: newText })
        sel.removeAllRanges()
        return
      }
    }
  }

  function focusBlock(id: string) {
    const el = blockRefs.current.get(id)
    if (el) { el.focus(); placeCursorAtEnd(el) }
  }

  function focusNext(currentId: string) {
    const idx = page.blocks.findIndex(b => b.id === currentId)
    const next = page.blocks[idx + 1]
    if (next) focusBlock(next.id)
  }

  function focusPrev(currentId: string) {
    const idx = page.blocks.findIndex(b => b.id === currentId)
    const prev = page.blocks[idx - 1]
    if (prev) focusBlock(prev.id)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full">
      {page && (
        <PageInsightBar
          pageId={page.id}
          onNavigate={openTab}
        />
      )}
      <AiTextToolbar
        containerRef={containerRef}
        workspaceContext={workspaceContext}
        onReplaceSelection={handleReplaceSelection}
      />
      {page.blocks.map((block, i) => (
        <BlockRow
          key={block.id}
          block={block}
          pageId={pageId}
          index={i}
          focusNext={focusNext}
          focusPrev={focusPrev}
          registerRef={registerRef}
        />
      ))}
    </div>
  )
}

function placeCursorAtEnd(el: HTMLElement) {
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(el)
  range.collapse(false)
  sel?.removeAllRanges()
  sel?.addRange(range)
}
