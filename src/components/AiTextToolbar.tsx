import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'
import type { WorkspaceContext } from '@/lib/aiTypes'

interface AiTextToolbarProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  workspaceContext: WorkspaceContext
  onReplaceSelection: (text: string) => void
}

const ACTIONS = [
  { label: 'Rewrite',     prompt: 'Rewrite the following text to be clearer and more concise. Return only the rewritten text, nothing else.' },
  { label: 'Expand',      prompt: 'Expand the following text with more detail and depth. Return only the expanded text, nothing else.' },
  { label: 'Summarize',   prompt: 'Summarize the following text into key points. Return only the summary, nothing else.' },
  { label: 'Fix grammar', prompt: 'Fix the grammar and spelling of the following text. Return only the corrected text, nothing else.' },
]

import { isPremiumUser } from '@/lib/premiumAccess'

export default function AiTextToolbar({ containerRef, workspaceContext, onReplaceSelection }: AiTextToolbarProps) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, maxWidth: 9999 })
  const [selectedText, setSelectedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const isPremium = isPremiumUser(user?.email)

  useEffect(() => {
    function onMouseUp() {
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setVisible(false)
          return
        }
        if (!containerRef.current) return
        const range = sel.getRangeAt(0)
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
          setVisible(false)
          return
        }
        const rect = range.getBoundingClientRect()
        const cRect = containerRef.current.getBoundingClientRect()
        setSelectedText(sel.toString())
        const toolbarH = 40
        const below = rect.bottom + 4 + toolbarH <= window.innerHeight
        const top = below ? rect.bottom + 4 : rect.top - toolbarH - 4
        const left = Math.max(cRect.left, Math.min(rect.left, cRect.right - 50))
        setPosition({ top, left, maxWidth: cRect.right - left })
        setVisible(true)
      }, 0)
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [containerRef])

  async function apply(prompt: string) {
    if (!selectedText || loading) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${prompt}\n\nText:\n${selectedText}` }],
          workspaceContext,
        }),
      })
      const data = await res.json()
      const actions = Array.isArray(data.actions) ? data.actions : []
      const replaceAction = actions.find((a: any) => a.type === 'replace_selection')
      if (replaceAction?.text) {
        onReplaceSelection(replaceAction.text)
      } else if (typeof data.message === 'string') {
        onReplaceSelection(data.message)
      }
    } catch {}
    setLoading(false)
    setVisible(false)
    setCustomPrompt('')
  }

  if (!visible) return null

  return (
    <div
      className="fixed z-[300] bg-surface-2 border border-surface-4 rounded-xl shadow-xl px-2 py-1.5 flex items-center gap-1 overflow-x-auto"
      style={{ top: position.top, left: position.left, maxWidth: position.maxWidth }}
      onMouseDown={e => e.preventDefault()}
    >
      {loading ? (
        <Loader2 size={14} className="text-accent animate-spin mx-2" />
      ) : (
        <>
          {ACTIONS.map(a => (
            <button
              key={a.label}
              onClick={() => apply(a.prompt)}
              className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-surface-3 rounded-lg transition-colors whitespace-nowrap"
            >
              {a.label}
            </button>
          ))}
          {isPremium && (
            <input
              type="text"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customPrompt.trim()) apply(customPrompt) }}
              placeholder="Custom…"
              className="ml-1 bg-surface-3 text-xs text-white placeholder-gray-600 rounded-lg px-2 py-1 w-24 outline-none border border-surface-4 focus:border-accent"
            />
          )}
        </>
      )}
    </div>
  )
}
