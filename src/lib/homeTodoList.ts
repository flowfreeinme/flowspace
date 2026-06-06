import type { HomeTodoItem } from '@/types/widgetSettings'

export type TodoDropPosition = 'before' | 'after'

export function reorderHomeTodoItems(
  items: HomeTodoItem[],
  draggedId: string,
  targetId: string,
  position: TodoDropPosition,
) {
  if (draggedId === targetId) return items

  const draggedIndex = items.findIndex(item => item.id === draggedId)
  const targetIndex = items.findIndex(item => item.id === targetId)
  if (draggedIndex === -1 || targetIndex === -1) return items

  const next = [...items]
  const [dragged] = next.splice(draggedIndex, 1)
  const adjustedTargetIndex = next.findIndex(item => item.id === targetId)
  next.splice(position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1, 0, dragged)
  return next
}
