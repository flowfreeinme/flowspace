import { useRef, useEffect, useState, useCallback } from 'react'
import { Paperclip, Type, Lasso, Pencil } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import BlockEditor from './BlockEditor'
import DrawingCanvas from './DrawingCanvas'
import LassoOverlay from './LassoOverlay'

const EMOJIS = ['📄','📝','📋','📌','⭐','🎯','💡','🔥','✅','📊','🗂️','🚀','💬','🎨','📅','🔖']

interface ContextMenu { x: number; y: number }

interface PageViewProps {
  pageId: string
}

export default function PageView({ pageId }: PageViewProps) {
  const { pages, updatePageTitle, updatePageIcon, addBlock, updateBlock, changeBlockType } = useWorkspace()
  const titleRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadFileRef = useRef<((file: File) => void) | null>(null)
  const page = pages[pageId]
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null)
  const [showDrawing, setShowDrawing] = useState(false)
  const [showLasso, setShowLasso] = useState(false)

  useEffect(() => {
    if (titleRef.current && titleRef.current.textContent !== page?.title) {
      titleRef.current.textContent = page?.title ?? ''
    }
  }, [pageId])

  useEffect(() => {
    function close() { setCtxMenu(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const handleRequestFileUpload = useCallback((fn: (file: File) => void) => {
    uploadFileRef.current = fn
  }, [])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }

  function handleAttachFile() {
    setCtxMenu(null)
    fileInputRef.current?.click()
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFileRef.current?.(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleAddTextBox() {
    setCtxMenu(null)
    if (!page) return
    const lastBlock = page.blocks[page.blocks.length - 1]
    const id = addBlock(pageId, lastBlock?.id ?? '')
    changeBlockType(pageId, id, 'textbox')
    updateBlock(pageId, id, { content: '' })
  }

  function handleDrawingInsert(url: string, name: string, size: number) {
    if (!page) return
    const lastBlock = page.blocks[page.blocks.length - 1]
    const id = addBlock(pageId, lastBlock?.id ?? '')
    changeBlockType(pageId, id, 'file')
    updateBlock(pageId, id, { content: JSON.stringify({ url, name, size }) })
    setShowDrawing(false)
  }

  if (!page) return (
    <div className="flex-1 flex items-center justify-center text-gray-600">
      Page not found
    </div>
  )

  function cycleIcon() {
    const idx = EMOJIS.indexOf(page.icon)
    const next = EMOJIS[(idx + 1) % EMOJIS.length]
    updatePageIcon(pageId, next)
  }

  const toolboxItems = [
    { icon: <Lasso size={15} />, label: 'Lasso', active: showLasso, onClick: () => { setShowLasso(true); setShowDrawing(false) } },
    { icon: <Pencil size={15} />, label: 'Draw', active: showDrawing, onClick: () => { setShowDrawing(true); setShowLasso(false) } },
    { icon: <Type size={15} />, label: 'Text box', active: false, onClick: handleAddTextBox },
    { icon: <Paperclip size={15} />, label: 'Attach', active: false, onClick: () => fileInputRef.current?.click() },
  ]

  return (
    <div className="flex-1 overflow-y-auto relative" data-page-id={pageId} onContextMenu={handleContextMenu}>
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-32 md:px-12 md:pt-16">
        <button onClick={cycleIcon} className="text-5xl mb-4 hover:scale-110 transition-transform cursor-pointer">
          {page.icon}
        </button>

        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onInput={e => updatePageTitle(pageId, (e.target as HTMLDivElement).textContent ?? '')}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault() } }}
          className="text-4xl font-bold text-white outline-none mb-8 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
          data-placeholder="Untitled"
          data-page-title="true"
        />

        <BlockEditor pageId={pageId} onRequestFileUpload={handleRequestFileUpload} />
      </div>

      {/* Floating toolbox */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-1 bg-surface-2 border border-surface-4 rounded-2xl p-1.5 shadow-2xl">
        {toolboxItems.map(t => (
          <button
            key={t.label}
            onClick={t.onClick}
            title={t.label}
            className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              t.active
                ? 'bg-accent text-white'
                : 'text-gray-500 hover:text-white hover:bg-surface-3'
            }`}
          >
            {t.icon}
            <span className="text-[10px] leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChosen} />

      {ctxMenu && (
        <div
          className="fixed z-50 bg-surface-2 border border-surface-4 rounded-xl shadow-xl py-1 min-w-[170px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={handleAttachFile}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors">
            <Paperclip size={13} />
            Attach file
          </button>
          <button onClick={handleAddTextBox}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors">
            <Type size={13} />
            Text box
          </button>
          <button onClick={() => { setCtxMenu(null); setShowLasso(true) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors">
            <Lasso size={13} />
            Lasso select
          </button>
          <button onClick={() => { setCtxMenu(null); setShowDrawing(true) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors">
            <Pencil size={13} />
            Draw
          </button>
        </div>
      )}

      {showDrawing && (
        <DrawingCanvas
          pageId={pageId}
          onInsert={handleDrawingInsert}
          onClose={() => setShowDrawing(false)}
        />
      )}

      {showLasso && (
        <LassoOverlay pageId={pageId} onClose={() => setShowLasso(false)} />
      )}
    </div>
  )
}
