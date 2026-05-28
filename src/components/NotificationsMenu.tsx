import { useEffect, useRef, useState } from 'react'
import { Bell, Check, X, Users } from 'lucide-react'
import { useInvites, type ShareInvite } from '@/stores/invites'
import { useAuth } from '@/stores/auth'

export default function NotificationsMenu() {
  const { user } = useAuth()
  const { pendingInvites, ownerNotifs, acceptInvite, declineInvite, markAllRead } = useInvites()
  const [open, setOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (!user) return null

  const unreadCount = ownerNotifs.filter(n => !n.read).length
  const badgeCount = pendingInvites.length + unreadCount
  const isEmpty = pendingInvites.length === 0 && ownerNotifs.length === 0

  async function handleAccept(invite: ShareInvite) {
    setLoadingId(invite.shareId)
    await acceptInvite(invite, user!.email!)
    setLoadingId(null)
  }

  async function handleDecline(invite: ShareInvite) {
    setLoadingId(invite.shareId)
    await declineInvite(invite)
    setLoadingId(null)
  }

  return (
    <div ref={ref} className="relative flex items-center h-full px-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"
        title="Notifications"
      >
        <Bell size={14} />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full text-[9px] text-white flex items-center justify-center font-bold leading-none">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-12 top-11 w-80 bg-surface-2 border border-surface-4 rounded-xl shadow-2xl overflow-hidden z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-accent transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-600">
                <Bell size={20} />
                <p className="text-xs">No notifications</p>
              </div>
            ) : (
              <>
                {/* Pending invitations */}
                {pendingInvites.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Invitations
                    </p>
                    {pendingInvites.map(invite => {
                      const busy = loadingId === invite.shareId
                      return (
                        <div key={invite.shareId}
                          className="px-4 py-3 border-b border-surface-3/50 hover:bg-surface-3/20 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                              <Users size={14} className="text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white leading-snug">{invite.ownerEmail}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                shared <span className="text-gray-300">"{invite.pageTitle || 'Untitled'}"</span> with you
                              </p>
                              <div className="flex items-center gap-2 mt-2.5">
                                <button
                                  disabled={busy}
                                  onClick={() => handleAccept(invite)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                                >
                                  <Check size={11} /> Accept
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => handleDecline(invite)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-surface-3 hover:bg-surface-4 disabled:opacity-50 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
                                >
                                  <X size={11} /> Decline
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Owner activity (declines etc.) */}
                {ownerNotifs.length > 0 && (
                  <div>
                    {pendingInvites.length > 0 && (
                      <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Activity
                      </p>
                    )}
                    {ownerNotifs.map(notif => (
                      <div key={notif.id}
                        className={`px-4 py-3 border-b border-surface-3/50 transition-colors ${notif.read ? '' : 'hover:bg-surface-3/20'}`}>
                        <div className="flex items-start gap-2.5">
                          {!notif.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                          )}
                          <div className={notif.read ? 'opacity-50' : ''}>
                            <p className="text-xs font-medium text-white">{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.body}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
