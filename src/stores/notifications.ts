import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  sub?: string
  type: 'info' | 'success' | 'error'
  durationMs?: number | null
}

interface NotificationStore {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

export const useNotifications = create<NotificationStore>((set) => ({
  toasts: [],
  add(toast) {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }))
    if (toast.durationMs !== null) {
      setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), toast.durationMs ?? 5000)
    }
    return id
  },
  dismiss(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))
