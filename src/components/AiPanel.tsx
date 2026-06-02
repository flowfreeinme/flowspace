import { useEffect, useRef, useState } from 'react'
import { X, Send, Sparkles, Wand2, Check } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { useCalendar } from '@/stores/calendar'
import { supabase } from '@/lib/supabase'
import { routeLocally, isSecondBrainQuery } from '@/lib/aiRouter'
import { saveToMemory, embedMessage } from '@/lib/aiMemory'
import { useAiInsightsStore } from '@/stores/aiInsightsStore'
import { getCalendarEventsForAi } from '@/lib/aiCalendarEvents'
import { formatCalendarEventsForAi, resolveCalendarRangeForPrompt } from '@/lib/aiContext'
import { buildCalendarTimelineResponse } from '@/lib/aiCalendarTimeline'
import type { WorkspaceContext, AiAction } from '@/lib/aiTypes'
import type { CalendarEvent } from '@/types/calendar'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: AiAction[]
  applied?: boolean
}

interface AiPanelProps {
  x: number
  y: number
  workspaceContext: WorkspaceContext
  calendarEvents?: CalendarEvent[]
  onClose: () => void
  onApplyActions: (actions: AiAction[]) => void
}

const DAILY_LIMIT = 20

import { isPremiumUser } from '@/lib/premiumAccess'

const CONCEPTUAL_RE = /^(what|how|why|explain|research|find|analyze|suggest|write|draft|help me|compare|describe|tell me|search)/i

// djb2 hash — keeps user IDs out of browser storage keys
function hashId(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function getUsageKey(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `ai_u_${hashId(userId)}_${today}`
}

function getUsageCount(userId: string): number {
  return parseInt(localStorage.getItem(getUsageKey(userId)) ?? '0', 10)
}

function incrementUsage(userId: string): number {
  const key = getUsageKey(userId)
  const next = getUsageCount(userId) + 1
  localStorage.setItem(key, String(next))
  return next
}

function localIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function AiPanel({ x, y, workspaceContext, calendarEvents, onClose, onApplyActions }: AiPanelProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiUsage, setApiUsage] = useState(() => getUsageCount(user?.id ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef(crypto.randomUUID())

  const apiRemaining = DAILY_LIMIT - apiUsage
  const apiLimitReached = apiRemaining <= 0

  const panelW = 380
  const panelH = messages.length === 0 ? 'auto' : 480
  const cx = Math.min(x, window.innerWidth - panelW - 16)
  const cy = Math.min(y, window.innerHeight - (messages.length === 0 ? 140 : 480) - 16)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setMessages(m => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    const freshCalendarEvents = await getCalendarEventsForAi({
      prompt: text,
      currentEvents: calendarEvents,
      userId: user?.id,
      loadEvents: id => useCalendar.getState().loadEvents(id),
      getEvents: () => useCalendar.getState().events,
    })

    if (freshCalendarEvents) {
      const timeline = buildCalendarTimelineResponse(text, freshCalendarEvents, new Date())
      if (timeline) {
        setMessages(m => [...m, {
          role: 'assistant',
          content: timeline.message,
          actions: timeline.actions.length ? timeline.actions : undefined,
        }])
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 50)
        return
      }
    }

    if (isSecondBrainQuery(text)) {
      const { whatNext, byPage } = useAiInsightsStore.getState()

      const actionLines: string[] = Object.values(byPage)
        .filter(p => p.status === 'ready' && p.actionItems.length > 0)
        .flatMap(p => p.actionItems.slice(0, 2))
        .slice(0, 5)

      let reply = ''
      if (whatNext) {
        reply += `I'd suggest opening **${whatNext.title}** — ${whatNext.reason}`
        if (actionLines.length) {
          reply += `\n\nYou also have ${actionLines.length} pending action${actionLines.length !== 1 ? 's' : ''} across your workspace:\n${actionLines.map(a => `• ${a}`).join('\n')}`
        }
      } else if (actionLines.length) {
        reply = `Here are pending actions across your workspace:\n${actionLines.map(a => `• ${a}`).join('\n')}`
      } else {
        reply = 'Open and edit some pages first — I\'ll start building a picture of your workspace and can then suggest what to focus on.'
      }

      setMessages(m => [...m, { role: 'assistant', content: reply }])
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
      return
    }

    const boardCtx = workspaceContext.board ?? { title: '', sections: [], cards: [] }
    const local = routeLocally(text, boardCtx)
    if (local.handled) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: local.message!,
        actions: local.actions?.length ? local.actions : undefined,
      }])
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
      return
    }

    if (apiLimitReached) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'You\'ve reached today\'s AI limit. Try a direct command like "add section [name]" — those are always free.',
      }])
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
      return
    }

    const newCount = incrementUsage(user?.id ?? '')
    setApiUsage(newCount)

    const isPremium = isPremiumUser(user?.email)
    const endpoint = isPremium && CONCEPTUAL_RE.test(text.trim()) ? '/api/ai-premium' : '/api/ai'
    const apiMessages = [...messages, { role: 'user' as const, content: text }].slice(-10)
    const requestNow = new Date()
    const requestRange = freshCalendarEvents ? resolveCalendarRangeForPrompt(text, requestNow) : null
    const trimmedContext: WorkspaceContext = {
      ...workspaceContext,
      board: workspaceContext.board
        ? { ...workspaceContext.board, cards: workspaceContext.board.cards.map(c => ({ text: c.text.slice(0, 100) })) }
        : undefined,
      page: workspaceContext.page
        ? { ...workspaceContext.page, blocks: workspaceContext.page.blocks.map(b => ({ ...b, content: b.content.slice(0, 100) })) }
        : undefined,
      calendar: freshCalendarEvents
        ? formatCalendarEventsForAi(freshCalendarEvents, requestNow, { prompt: text })
        : workspaceContext.calendar?.slice(0, 14),
      calendarRange: requestRange
        ? { label: requestRange.label, start: localIsoDate(requestRange.start), end: localIsoDate(requestRange.end) }
        : workspaceContext.calendarRange,
      workflows: workspaceContext.workflows?.slice(0, 12).map(workflow => ({
        ...workflow,
        items: workflow.items.slice(0, 8).map(item => item.slice(0, 180)),
      })),
      todos: workspaceContext.todos?.slice(0, 12).map(todo => ({
        pageTitle: todo.pageTitle.slice(0, 80),
        open: todo.open.slice(0, 12).map(item => item.slice(0, 160)),
        done: todo.done.slice(0, 8).map(item => item.slice(0, 160)),
      })),
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
          workspaceContext: trimmedContext,
          sessionId: sessionIdRef.current,
        }),
      })
      const data = await res.json()
      if (typeof data.message === 'string') {
        setMessages(m => [...m, {
          role: 'assistant',
          content: data.message,
          actions: data.actions?.length ? data.actions : undefined,
        }])
        // Persist exchange to Supabase for semantic memory (fire-and-forget)
        Promise.all([
          saveToMemory(sessionIdRef.current, 'user', text),
          saveToMemory(sessionIdRef.current, 'assistant', data.message),
        ]).then(([userId, assistantId]) => {
          if (userId) embedMessage(userId, text)
          if (assistantId) embedMessage(assistantId, data.message)
        }).catch(() => {})
      } else {
        setMessages(m => [...m, {
          role: 'assistant',
          content: `Error: ${data.error ?? 'Something went wrong. Please try again.'}`,
        }])
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Could not reach AI. Please try again.' }])
    }

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); send() }
  }

  function applyActions(msgIndex: number, actions: AiAction[]) {
    onApplyActions(actions)
    setMessages(m => m.map((msg, i) => i === msgIndex ? { ...msg, applied: true } : msg))
  }

  return (
    <div
      className="fixed z-[200] flex flex-col bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl overflow-hidden"
      style={{ left: cx, top: cy, width: panelW, height: panelH === 'auto' ? undefined : panelH }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center">
            <Sparkles size={12} className="text-accent" />
          </div>
          <span className="text-sm font-semibold text-white">Ask AI</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !apiLimitReached && (
            <span className="text-[10px] text-gray-600">{apiRemaining} AI calls left</span>
          )}
          <button onClick={onClose} className="p-1 rounded-lg text-gray-600 hover:text-white hover:bg-surface-3 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-surface-3 text-gray-200 rounded-bl-sm'
              }`}>
                {m.content}
              </div>
              {m.actions && m.actions.length > 0 && (
                <button
                  onClick={() => !m.applied && applyActions(i, m.actions!)}
                  className={`mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    m.applied
                      ? 'bg-green-500/10 text-green-400 cursor-default'
                      : 'bg-accent/10 hover:bg-accent/20 text-accent cursor-pointer'
                  }`}
                >
                  {m.applied ? <Check size={11} /> : <Wand2 size={11} />}
                  {m.applied ? 'Applied to board' : 'Apply to board'}
                </button>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-3 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-surface-3 border border-surface-4 rounded-xl px-3 py-2.5 focus-within:border-accent transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={messages.length === 0 ? 'Ask anything or say "reorganize this board…"' : 'Follow up…'}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 text-white transition-colors shrink-0"
          >
            <Send size={12} />
          </button>
        </div>
        {messages.length === 0 && (
          <p className="text-[10px] text-gray-700 mt-2 text-center">
            {apiRemaining} of {DAILY_LIMIT} AI calls left · Commands like "add section" are always free
          </p>
        )}
      </div>
    </div>
  )
}
