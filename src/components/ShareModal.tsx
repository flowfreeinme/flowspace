import { useState } from 'react'
import { X, UserPlus, Trash2, Check, ImageDown } from 'lucide-react'
import { useSharing } from '@/stores/sharing'
import { useAuth } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import type { Page } from '@/types'

interface ShareModalProps {
  page: Page
  onClose: () => void
}

export default function ShareModal({ page, onClose }: ShareModalProps) {
  const { user } = useAuth()
  const { sharePage, unsharePage, myShares, loadMyShares } = useSharing()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const sharedWith = myShares[page.id] ?? []

  async function exportAsJPG() {
    const el = document.querySelector(`[data-page-id="${page.id}"]`) as HTMLElement
    if (!el) { alert('Open this page in a tab first to export it.'); return }
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(el, { backgroundColor: '#0f0f0f', scale: 2, useCORS: true })
    const link = document.createElement('a')
    link.download = `${page.title || 'untitled'}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !email.trim()) return
    setLoading(true)
    setStatus(null)

    // Always fetch the live email from Supabase — never trust the cached user object
    const { data: { user: liveUser } } = await supabase.auth.getUser()
    const ownerEmail = liveUser?.email ?? ''

    if (!ownerEmail || email.trim().toLowerCase() === ownerEmail.toLowerCase()) {
      setStatus({ msg: "You can't share a board with yourself.", ok: false })
      setLoading(false)
      return
    }

    const err = await sharePage(page, ownerEmail, user.id, email.trim())
    if (err) {
      setStatus({ msg: err, ok: false })
    } else {
      setStatus({ msg: `Shared with ${email.trim()}`, ok: true })
      setEmail('')
    }
    setLoading(false)
  }

  async function handleRemove(target: string) {
    await unsharePage(page.id, target)
    await loadMyShares(user!.id)
    setRemoveTarget(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-[400px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <div>
            <h2 className="font-semibold text-white">Share "{page.title || 'Untitled'}"</h2>
            <p className="text-xs text-gray-500 mt-0.5">Anyone you share with must have a FlowSpace account</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-4 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Email input */}
          <form onSubmit={handleShare} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email address…"
              className="flex-1 bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              <UserPlus size={14} />
              Share
            </button>
          </form>

          {/* Status */}
          {status && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              status.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {status.ok && <Check size={12} />}
              {status.msg}
            </div>
          )}

          {/* Current shares */}
          {sharedWith.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Shared with</p>
              <div className="space-y-1">
                {sharedWith.map(e => (
                  <div key={e}>
                    <div className="flex items-center justify-between px-3 py-2 bg-surface-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-accent text-xs font-semibold">
                          {e[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-300">{e}</span>
                      </div>
                      <button
                        onClick={() => setRemoveTarget(removeTarget === e ? null : e)}
                        className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {removeTarget === e && (
                      <div className="mt-1 mx-1 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-red-300 mb-2 leading-relaxed">
                          Remove <span className="font-medium text-white">{e}</span>'s access? You will need to reinvite them if you wish to grant access again.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRemoveTarget(null)}
                            className="flex-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-surface-4 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRemove(e)}
                            className="flex-1 px-2 py-1 rounded text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                          >
                            Remove access
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sharedWith.length === 0 && !status && (
            <p className="text-xs text-gray-600 text-center py-2">Not shared with anyone yet</p>
          )}

          <div className="border-t border-surface-3 pt-3">
            <button
              onClick={exportAsJPG}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"
            >
              <ImageDown size={14} />
              Export as JPG
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
