import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { STARTER_TEMPLATES, type StarterTemplate } from '@/lib/starterTemplates'

const BLANK_OPTION_ID = 'blank-board'
const ICON_CHOICES = ['🗃️', '✅', '🗒️', '📓', '🚀', '📅', '🎯', '📋']

type OptionId = typeof BLANK_OPTION_ID | StarterTemplate['id']

export default function BoardTemplateModal() {
  const {
    templatePickerOpen,
    templatePickerParentId,
    closeTemplatePicker,
    createBoard,
    applyStarterTemplate,
    updatePageTitle,
    updatePageIcon,
    openTab,
  } = useWorkspace()
  const listRef = useRef<HTMLDivElement>(null)
  const optionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const iconButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [selectedId, setSelectedId] = useState<OptionId>(BLANK_OPTION_ID)
  const [boardTitle, setBoardTitle] = useState('Untitled board')
  const [boardIcon, setBoardIcon] = useState('🗃️')

  const boardTemplates = useMemo(
    () => STARTER_TEMPLATES.filter(t => t.category === 'board'),
    []
  )
  const options = useMemo(
    () => [
      {
        id: BLANK_OPTION_ID,
        label: 'Blank board',
        icon: '🗃️',
        description: 'Empty canvas. Add your own structure.',
        tags: ['1 board', 'No preset blocks'],
      },
      ...boardTemplates.map(template => ({
        id: template.id,
        label: template.label,
        icon: template.icon,
        description: template.description,
        tags: template.tags,
        template,
      })),
    ],
    [boardTemplates]
  )
  const selectedIndex = Math.max(0, options.findIndex(option => option.id === selectedId))
  const selectedOption = options[selectedIndex] ?? options[0]
  const selectedTemplate = 'template' in selectedOption ? selectedOption.template : null

  useEffect(() => {
    if (!templatePickerOpen) return
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const editingText = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      const optionFocus = target?.dataset.templateOption === 'true'
      const iconFocus = target?.dataset.iconOption === 'true'

      if (e.key === 'Escape') {
        closeTemplatePicker()
        return
      }

      if (editingText) return

      if (iconFocus && (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End')) {
        e.preventDefault()
        const currentIconIndex = Math.max(0, ICON_CHOICES.indexOf(boardIcon))
        const nextIconIndex =
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? ICON_CHOICES.length - 1
              : e.key === 'ArrowRight' || e.key === 'ArrowDown'
                ? (currentIconIndex + 1) % ICON_CHOICES.length
                : (currentIconIndex - 1 + ICON_CHOICES.length) % ICON_CHOICES.length
        const nextIcon = ICON_CHOICES[nextIconIndex]
        setBoardIcon(nextIcon)
        window.requestAnimationFrame(() => iconButtonRefs.current[nextIcon]?.focus())
      } else if (optionFocus && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        e.preventDefault()
        selectOption(options[(selectedIndex + 1) % options.length].id, true)
      } else if (optionFocus && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault()
        selectOption(options[(selectedIndex - 1 + options.length) % options.length].id, optionFocus)
      } else if (optionFocus && e.key === 'Home') {
        e.preventDefault()
        selectOption(options[0].id, true)
      } else if (optionFocus && e.key === 'End') {
        e.preventDefault()
        selectOption(options[options.length - 1].id, true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [templatePickerOpen, closeTemplatePicker, options, selectedIndex, boardTitle, boardIcon, selectedTemplate])

  useEffect(() => {
    if (templatePickerOpen) {
      setSelectedId(BLANK_OPTION_ID)
      setBoardTitle('Untitled board')
      setBoardIcon('🗃️')
      window.requestAnimationFrame(() => optionButtonRefs.current[BLANK_OPTION_ID]?.focus() ?? listRef.current?.focus())
    }
  }, [templatePickerOpen])

  if (!templatePickerOpen) return null

  function applyBoardDetails(id: string) {
    const title = boardTitle.trim() || selectedOption.label
    updatePageTitle(id, title)
    updatePageIcon(id, boardIcon)
  }

  function handleCreateSelected() {
    closeTemplatePicker()
    const id = selectedTemplate
      ? applyStarterTemplate(selectedTemplate.id, templatePickerParentId, 'none')
      : createBoard(templatePickerParentId)
    applyBoardDetails(id)
    openTab(id)
  }

  function selectOption(optionId: OptionId, shouldFocus = false) {
    const option = options.find(item => item.id === optionId) ?? options[0]
    setSelectedId(option.id)
    setBoardTitle(option.id === BLANK_OPTION_ID ? 'Untitled board' : option.label)
    setBoardIcon(option.icon)
    if (shouldFocus) {
      window.requestAnimationFrame(() => optionButtonRefs.current[option.id]?.focus())
    }
  }

  const cardBase =
    'group min-h-[122px] w-full rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60'

  function TemplateCard({ option }: { option: typeof options[number] }) {
    const selected = selectedOption?.id === option.id
    return (
      <button
        type="button"
        ref={element => { optionButtonRefs.current[option.id] = element }}
        className={`${cardBase} ${selected ? 'border-accent bg-accent/10' : 'border-surface-4 bg-surface-1 hover:border-surface-3 hover:bg-surface-2'}`}
        onClick={() => selectOption(option.id)}
        data-template-option="true"
        tabIndex={selected ? 0 : -1}
        aria-pressed={selected}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-4 bg-surface-2 text-xl">
            {option.icon}
          </div>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-accent bg-accent text-white' : 'border-surface-4 text-transparent'}`}>
            <Check size={13} />
          </span>
        </div>
        <div className="text-sm font-semibold text-white">{option.label}</div>
        <div className="mt-1 text-xs leading-relaxed text-gray-500">{option.description}</div>
        <div className="mt-3 flex flex-wrap gap-1">
          {option.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="rounded border border-surface-4 bg-surface-3 px-1.5 py-0.5 text-[11px] text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0 p-3 sm:p-6"
      data-no-drag
    >
      <div className="flex max-h-[calc(var(--flowspace-viewport-height)-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-surface-4 bg-surface-1 shadow-2xl sm:max-h-[calc(var(--flowspace-viewport-height)-3rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-surface-4 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Create board</div>
            <h1 className="text-lg font-bold tracking-tight text-white">Choose a starting point</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-400">
              Blank or single-board templates only.
            </p>
          </div>
          <button
            type="button"
            onClick={closeTemplatePicker}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-surface-2 hover:text-white"
            aria-label="Close template picker"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            ref={listRef}
            tabIndex={-1}
            className="min-h-0 overflow-y-auto p-4 focus:outline-none sm:p-5"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {options.map(option => <TemplateCard key={option.id} option={option} />)}
            </div>
          </div>

          <aside className="border-t border-surface-4 bg-surface-0/45 p-4 lg:border-l lg:border-t-0 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-surface-4 bg-surface-2 text-2xl">
                {selectedOption.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{selectedOption.label}</div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{selectedOption.description}</p>
              </div>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-600">Board name</span>
              <input
                value={boardTitle}
                onChange={e => setBoardTitle(e.target.value)}
                className="h-10 w-full rounded-lg border border-surface-4 bg-surface-1 px-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-gray-600 focus:border-accent"
                placeholder="Untitled board"
              />
            </label>

            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-600">Board icon</div>
              <div className="grid grid-cols-4 gap-2">
                {ICON_CHOICES.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    ref={element => { iconButtonRefs.current[icon] = element }}
                    onClick={() => setBoardIcon(icon)}
                    className={`flex h-10 items-center justify-center rounded-lg border text-lg transition-colors ${boardIcon === icon ? 'border-accent bg-accent/10' : 'border-surface-4 bg-surface-2 hover:border-surface-3'}`}
                    data-icon-option="true"
                    tabIndex={boardIcon === icon ? 0 : -1}
                    aria-label={`Use ${icon} board icon`}
                    aria-pressed={boardIcon === icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5 rounded-lg border border-surface-4 bg-surface-2 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">Creates</div>
              <div className="text-sm font-semibold text-gray-200">1 board</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {selectedTemplate ? 'Template blocks are added to the new board. Your Home Center stays unchanged.' : 'A clean board with no preset blocks.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateSelected}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Create board
              <ArrowRight size={16} />
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}
