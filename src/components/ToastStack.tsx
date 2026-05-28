import { X } from 'lucide-react'
import { useNotifications } from '@/stores/notifications'

export default function ToastStack() {
  const { toasts, dismiss } = useNotifications()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-xs">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all ${
            t.type === 'error'
              ? 'bg-red-950 border-red-800 text-red-200'
              : t.type === 'success'
              ? 'bg-green-950 border-green-800 text-green-200'
              : 'bg-surface-2 border-surface-4 text-gray-200'
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t.message}</p>
            {t.sub && <p className="text-xs opacity-70 mt-0.5 truncate">{t.sub}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
