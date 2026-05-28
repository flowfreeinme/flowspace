import { describe, expect, it } from 'vitest'
import { createWorkflowBlockFromAiAction } from './aiWorkflowActions'

describe('createWorkflowBlockFromAiAction', () => {
  it('creates a dated timeline block from AI schedule items', () => {
    const block = createWorkflowBlockFromAiAction({
      type: 'create_workflow',
      workflowType: 'timeline',
      items: [{
        title: 'Chemistry lab',
        start: '2026-05-24',
        end: '2026-05-24',
        startTime: '09:30',
        endTime: '11:15',
        location: 'Science Hall',
      }],
    }, 40, 80, () => 'id-1')

    expect(block?.type).toBe('timeline')
    expect(JSON.parse(block!.content)).toMatchObject({
      x: 40,
      y: 80,
      groups: [{
        label: 'Schedule',
        bars: [{
          id: 'id-1',
          label: 'Chemistry lab',
          start: '2026-05-24',
          end: '2026-05-24',
          startTime: '09:30',
          endTime: '11:15',
          location: 'Science Hall',
        }],
      }],
    })
  })

  it('creates kanban cards in status columns', () => {
    const block = createWorkflowBlockFromAiAction({
      type: 'create_workflow',
      workflowType: 'kanban',
      items: [
        { title: 'Draft essay', status: 'todo' },
        { title: 'Submit quiz', status: 'done' },
      ],
    }, 0, 0, () => 'id')

    const data = JSON.parse(block!.content)
    expect(block?.type).toBe('kanban')
    expect(data.columns[0].cards[0].text).toBe('Draft essay')
    expect(data.columns[2].cards[0].text).toBe('Submit quiz')
  })

  it('creates a sequential flowchart from ordered items', () => {
    let next = 0
    const block = createWorkflowBlockFromAiAction({
      type: 'create_workflow',
      workflowType: 'flowchart',
      items: [
        { title: 'Review notes' },
        { title: 'Take quiz' },
      ],
    }, 10, 20, () => `id-${++next}`)

    const data = JSON.parse(block!.content)
    expect(block?.type).toBe('flowchart')
    expect(data.nodes.map((node: { label: string }) => node.label)).toEqual(['Review notes', 'Take quiz'])
    expect(data.edges).toEqual([{ from: 'id-1', to: 'id-2' }])
  })
})
