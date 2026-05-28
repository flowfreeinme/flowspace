import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNotifications } from './notifications'

describe('notifications store', () => {
  afterEach(() => {
    vi.useRealTimers()
    useNotifications.setState({ toasts: [] })
  })

  it('auto-dismisses ordinary notifications', () => {
    vi.useFakeTimers()

    useNotifications.getState().add({ type: 'info', message: 'Saved' })

    expect(useNotifications.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(5_000)
    expect(useNotifications.getState().toasts).toHaveLength(0)
  })

  it('keeps persistent notifications until dismissed', () => {
    vi.useFakeTimers()

    const id = useNotifications.getState().add({
      type: 'success',
      message: 'Timer is up',
      durationMs: null,
    })

    vi.advanceTimersByTime(30_000)
    expect(useNotifications.getState().toasts).toEqual([
      expect.objectContaining({ id, message: 'Timer is up' }),
    ])

    useNotifications.getState().dismiss(id)
    expect(useNotifications.getState().toasts).toHaveLength(0)
  })
})
