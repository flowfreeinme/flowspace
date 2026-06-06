import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/stores/workspace'
import { useCalendar } from '@/stores/calendar'
import { useAuth } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { buildDayPlannerPrompt, buildDayPlannerWorkspaceContext, createFallbackDayPlan } from '@/lib/dayPlanner'
import type { ProPlannerConfig } from '@/types/widgetSettings'
import DayPlanDisplay from './DayPlanDisplay'

export default function ProPlannerWidget({ config }: { config: ProPlannerConfig }) {
  const { pages } = useWorkspace()
  const { events } = useCalendar()
  const { user } = useAuth()
  const [dayPlan, setDayPlan] = useState<string | null>(null)
  const [dayPlanLoading, setDayPlanLoading] = useState(false)
  const [dayPlanError, setDayPlanError] = useState<string | null>(null)

  const visiblePages = Object.values(pages).filter(p => !p.folder && !p.archived)

  async function generateDayPlan() {
    const now = new Date()
    const upcomingEvents = events
      .filter(e => e.end.getTime() >= now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
    if (!user) {
      setDayPlanError('Sign in to generate an AI day plan.')
      return
    }
    setDayPlanLoading(true)
    setDayPlanError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sign in again to use the AI day planner.')

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: buildDayPlannerPrompt(now, config) }],
          workspaceContext: buildDayPlannerWorkspaceContext({ now, pages, events }),
        }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'AI day planner failed.')
      if (typeof data.message !== 'string') throw new Error('AI day planner returned an invalid response.')
      setDayPlan(data.message)
    } catch (err) {
      setDayPlan(createFallbackDayPlan({ now, pages: visiblePages, events: upcomingEvents, config }))
      setDayPlanError(err instanceof Error ? `AI unavailable: ${err.message}` : 'AI unavailable. Showing a local plan.')
    } finally {
      setDayPlanLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-br from-surface-1 via-surface-1 to-accent/10 p-4">
      <div className="shrink-0">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
          <Sparkles size={14} />
          AI planner
        </div>
        <p className="text-base font-semibold text-white">AI day planner</p>
        {!dayPlan && (
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            In-depth plan · {config.workStart}–{config.workEnd} · {config.focusStyle.replace('-', ' ')}
            {config.customInstructions ? ` · ${config.customInstructions}` : ''}
          </p>
        )}
      </div>
      {dayPlan && (
        <div className="my-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-surface-3 bg-surface-0/40 px-3 py-3">
          <DayPlanDisplay plan={dayPlan} emptyText="Generate a detailed plan from this workspace and your calendar." />
        </div>
      )}
      {dayPlanError && (
        <p className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-1.5 text-[11px] leading-snug text-yellow-200">
          {dayPlanError}
        </p>
      )}
      <button
        onClick={generateDayPlan}
        disabled={dayPlanLoading}
        className="mt-auto flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/10 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-60"
      >
        {dayPlanLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {dayPlan ? 'Refresh plan' : 'Generate plan'}
      </button>
    </div>
  )
}
