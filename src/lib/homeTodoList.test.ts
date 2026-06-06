import { describe, expect, it } from 'vitest'
import { reorderHomeTodoItems } from './homeTodoList'
import type { HomeTodoItem } from '@/types/widgetSettings'

const tasks: HomeTodoItem[] = [
  { id: 'a', text: 'Alpha', done: false },
  { id: 'b', text: 'Bravo', done: true },
  { id: 'c', text: 'Charlie', done: false },
  { id: 'd', text: 'Delta', done: false },
]

describe('reorderHomeTodoItems', () => {
  it('moves a dragged task above another task', () => {
    const result = reorderHomeTodoItems(tasks, 'd', 'b', 'before')

    expect(result.map(task => task.id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves a dragged task below another task', () => {
    const result = reorderHomeTodoItems(tasks, 'a', 'c', 'after')

    expect(result.map(task => task.id)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('leaves the list unchanged for invalid drag targets', () => {
    expect(reorderHomeTodoItems(tasks, 'a', 'missing', 'before')).toBe(tasks)
    expect(reorderHomeTodoItems(tasks, 'a', 'a', 'after')).toBe(tasks)
  })
})
