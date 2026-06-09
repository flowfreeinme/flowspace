import { useEffect, useState } from 'react'

// ── Update this to notify all users on their next visit ──────────────────────
const ANNOUNCEMENT = {
  id: '2026-05-02',
  message: '05/02/2026 Updates and Bug Fixes',
  sub: 'Sections, lasso tool, image attachments, and R2 file storage.',
}
// ─────────────────────────────────────────────────────────────────────────────
import { useWorkspace } from '@/stores/workspace'
import { useAuth } from '@/stores/auth'
import AuthPage from '@/components/AuthPage'
import LandingPage from '@/components/LandingPage'
import ToastStack from '@/components/ToastStack'
import DesktopShell from '@/components/DesktopShell'
import MobileShell from '@/components/MobileShell'
import KeyboardShortcutsOverlay from '@/components/KeyboardShortcutsOverlay'
import FocusTimerAlarm from '@/components/FocusTimerAlarm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSharing } from '@/stores/sharing'
import { useNotifications } from '@/stores/notifications'
import { useInvites } from '@/stores/invites'
import { supabase } from '@/lib/supabase'
import { appChannel } from '@/lib/appChannel'
import RxMasteryPage from '@/rx-mastery/RxMasteryPage'

export default function App() {
  const { init: initAuth, user, loading: authLoading } = useAuth()
  const { init: initWorkspace, syncFromRemote, initialized, tabs, activeTabId, createBoard, openTab, closeTab, setHomeActive, toggleSidebar } = useWorkspace()
  const isMobile = useIsMobile()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const { loadSharedWithMe, loadMyShares } = useSharing()
  const { add: addToast } = useNotifications()
  const { loadPendingInvites, loadOwnerNotifs } = useInvites()
  const isRxMasteryRoute = window.location.pathname.replace(/\/+$/, '') === '/rx-mastery'

  useEffect(() => { initAuth() }, [])

  useEffect(() => {
    if (isRxMasteryRoute) return
    if (!user) return
    const key = `flowspace_announcement_${ANNOUNCEMENT.id}`
    if (localStorage.getItem(key)) return
    setTimeout(() => {
      addToast({ type: 'info', message: ANNOUNCEMENT.message, sub: ANNOUNCEMENT.sub })
      localStorage.setItem(key, '1')
    }, 1500)
  }, [isRxMasteryRoute, user])
  useEffect(() => {
    if (isRxMasteryRoute) return
    if (authLoading || !user) return
    if (!initialized) initWorkspace()
  }, [authLoading, user, initialized, isRxMasteryRoute])

  useEffect(() => {
    if (isRxMasteryRoute) return
    if (authLoading || !user?.email) return
    loadSharedWithMe(user.email)
    loadMyShares(user.id)
    loadPendingInvites(user.email)
    loadOwnerNotifs(user.id)
  }, [authLoading, user, isRxMasteryRoute])

  // Cross-device sync: reload workspace when app regains focus or another device saves
  useEffect(() => {
    if (isRxMasteryRoute) return
    if (!user || !initialized) return
    function onVisibility() {
      if (document.visibilityState === 'visible') syncFromRemote()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [user, initialized, isRxMasteryRoute])

  useEffect(() => {
    if (isRxMasteryRoute) return
    if (!user || !initialized) return
    const channel = supabase
      .channel(`workspace-sync:${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `user_id=eq.${user.id}` },
        () => syncFromRemote())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, initialized, isRxMasteryRoute])

  // Realtime: persistent broadcast channel — handles invite + notification pings instantly
  useEffect(() => {
    if (isRxMasteryRoute) return
    appChannel
      .on('broadcast', { event: 'invite-ping' }, ({ payload }) => {
        const me = useAuth.getState().user?.email?.toLowerCase()
        if (!me || payload.recipientEmail !== me) return
        const myEmail = useAuth.getState().user!.email!
        addToast({ type: 'info', message: `${payload.ownerEmail} invited you to a board`, sub: payload.pageTitle })
        useInvites.getState().loadPendingInvites(myEmail)
      })
      .on('broadcast', { event: 'notif-ping' }, ({ payload }) => {
        const me = useAuth.getState().user?.email?.toLowerCase()
        if (!me || payload.recipientEmail !== me) return
        const myId = useAuth.getState().user!.id
        addToast({ type: 'info', message: payload.title, sub: payload.body })
        useInvites.getState().loadOwnerNotifs(myId)
      })
      .subscribe()
  }, [isRxMasteryRoute])

  // Realtime: broadcast → instant board removal when owner revokes access
  useEffect(() => {
    if (isRxMasteryRoute) return
    if (!user?.email) return
    const channel = supabase
      .channel(`access:${user.email.trim().toLowerCase()}`)
      .on('broadcast', { event: 'revoked' }, ({ payload }) => {
        const pageId = payload?.pageId as string
        if (!pageId) return
        useSharing.getState().loadSharedWithMe(user.email!)
        const ws = useWorkspace.getState()
        ws.tabs.filter(t => t.pageId === pageId).forEach(t => ws.closeTab(t.id))
        useWorkspace.setState(s => { const p = { ...s.pages }; delete p[pageId]; return { pages: p } })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.email, isRxMasteryRoute])

  // Global keyboard shortcuts
  useEffect(() => {
    if (isRxMasteryRoute) return
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      // Cmd+K — command palette
      if (mod && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p) }

      // Cmd+/ — keyboard shortcuts
      if (mod && e.key === '/') { e.preventDefault(); setShortcutsOpen(p => !p) }

      // Cmd+N — new board
      if (mod && e.key === 'n') { e.preventDefault(); const id = createBoard(null); openTab(id) }

      // Cmd+W — close active tab
      if (mod && e.key === 'w') {
        e.preventDefault()
        const active = tabs.find(t => t.id === activeTabId)
        if (active) closeTab(active.id)
      }

      // Cmd+[ — toggle sidebar
      if (mod && e.key === '[') { e.preventDefault(); toggleSidebar() }

      // Cmd+H — go home
      if (mod && e.key === 'h') { e.preventDefault(); setHomeActive() }

      // Escape — close overlays
      if (e.key === 'Escape') { setPaletteOpen(false); setShortcutsOpen(false) }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tabs, activeTabId, isRxMasteryRoute])

  if (authLoading) {
    return <div className="app-screen bg-surface-0 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
  }

  if (isRxMasteryRoute) {
    return <RxMasteryPage user={user} />
  }

  if (!user) {
    if (showAuth) return <AuthPage />
    return <LandingPage onGetStarted={() => setShowAuth(true)} />
  }

  if (!initialized) {
    return <div className="app-screen bg-surface-0 flex items-center justify-center text-gray-500 text-sm">Loading workspace…</div>
  }

  return (
    <>
      {isMobile
        ? (
          <MobileShell
            paletteOpen={paletteOpen}
            onClosePalette={() => setPaletteOpen(false)}
          />
        )
        : (
          <DesktopShell
            paletteOpen={paletteOpen}
            onClosePalette={() => setPaletteOpen(false)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
        )
      }
      <FocusTimerAlarm />
      {shortcutsOpen && !isMobile && <KeyboardShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
      <ToastStack />
    </>
  )
}
