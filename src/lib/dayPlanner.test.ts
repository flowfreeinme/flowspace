import { describe, expect, it } from 'vitest'
import { buildDayPlannerPrompt, buildDayPlannerWorkspaceContext, createFallbackDayPlan } from './dayPlanner'
import type { CalendarEvent } from '@/types/calendar'
import type { Page } from '@/types'

function page(overrides: Partial<Page>): Page {
  return {
    id: overrides.id ?? 'p1',
    title: overrides.title ?? 'Project',
    icon: overrides.icon ?? '🗃️',
    blocks: overrides.blocks ?? [],
    children: [],
    parentId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: overrides.id ?? 'e1',
    title: overrides.title ?? 'Class',
    start: overrides.start ?? new Date('2026-05-16T15:00:00Z'),
    end: overrides.end ?? new Date('2026-05-16T16:00:00Z'),
    allDay: false,
    color: '#7c6af7',
    source: 'google',
    ...overrides,
  }
}

describe('day planner helpers', () => {
  it('builds a direct prompt for a concise daily plan', () => {
    expect(buildDayPlannerPrompt(new Date('2026-05-16T14:00:00Z'))).toContain('Create a practical plan for today')
  })

  it('summarizes upcoming events and active work for AI context', () => {
    const context = buildDayPlannerWorkspaceContext({
      now: new Date('2026-05-16T14:00:00Z'),
      pages: {
        active: page({
          id: 'active',
          title: 'Launch plan',
          updatedAt: 10,
          blocks: [{
            id: 'timeline',
            type: 'timeline',
            content: JSON.stringify({
              x: 0, y: 0, width: 520, height: 360,
              dateRange: { start: '2026-05-16', end: '2026-05-16' },
              groups: [{
                id: 'g1',
                label: 'Focus',
                bars: [{
                  id: 'draft',
                  label: 'Draft premium pitch',
                  start: '2026-05-16',
                  end: '2026-05-16',
                  startTime: '18:00',
                  endTime: '19:00',
                  color: '#7c6af7',
                }],
              }],
            }),
          }],
        }),
        archived: page({ id: 'archived', title: 'Old work', archived: true, updatedAt: 20 }),
      },
      events: [
        event({ title: 'Already over', end: new Date('2026-05-16T13:00:00Z') }),
        event({
          title: 'Chemistry lab',
          start: new Date('2026-05-16T15:00:00Z'),
          end: new Date('2026-05-16T17:00:00Z'),
          location: 'Science Hall',
        }),
      ],
    })

    expect(context.mode).toBe('page')
    expect(context.page?.blocks[0].content).toContain('Launch plan')
    expect(context.page?.blocks[0].content).not.toContain('Old work')
    expect(context.calendar?.[0].title).toBe('Chemistry lab')
    expect(context.calendar?.[0].date).toContain('May 16')
    expect(context.calendar?.[0].date).toContain('10:00 AM')
    expect(context.calendar?.[0].location).toBe('Science Hall')
    expect(context.workflows?.[0].items[0]).toContain('Draft premium pitch')
  })

  it('creates a local fallback plan when AI is unavailable', () => {
    const fallback = createFallbackDayPlan({
      now: new Date('2026-05-16T14:00:00Z'),
      pages: [page({ title: 'Research board' })],
      events: [event({ title: 'Advising meeting' })],
    })

    expect(fallback).toContain('Local plan')
    expect(fallback).toContain('Advising meeting')
    expect(fallback).toContain('Research board')
  })
})
