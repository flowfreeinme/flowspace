import { useEffect, useRef, useState } from 'react'
import { LogOut, User, Settings } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import AccountSettingsModal from './AccountSettingsModal'
import SettingsBox from './SettingsBox'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function AvatarMenu() {
  const isMobile = useIsMobile()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAppSettings, setShowAppSettings] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (!user) return null

  const name = user.user_metadata?.full_name as string | undefined
  const email = user.email ?? ''
  const initials = name
    ? name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : email[0]?.toUpperCase() ?? '?'

  return (
    <>
      <div ref={ref} className="relative flex items-center h-full px-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-7 h-7 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center text-white text-xs font-semibold transition-colors select-none"
          title={name ?? email}
        >
          {initials}
        </button>

        {open && (
          <div className="fixed right-2 top-11 w-60 bg-surface-2 border border-surface-4 rounded-xl shadow-2xl overflow-hidden z-[100]">
            {/* Profile info */}
            <div className="px-4 py-3 border-b border-surface-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  {name && <p className="text-sm font-medium text-white truncate">{name}</p>}
                  <p className="text-xs text-gray-500 truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); setShowSettings(true) }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
              >
                <User size={14} />
                <span>Account settings</span>
              </button>
              <button
                onClick={() => { setOpen(false); setShowAppSettings(true) }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
            </div>

            <div className="border-t border-surface-3 py-1">
              <button
                onClick={() => { signOut(); setOpen(false) }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
      {showAppSettings && <SettingsBox open={showAppSettings} onClose={() => setShowAppSettings(false)} mobile={isMobile} />}
    </>
  )
}
