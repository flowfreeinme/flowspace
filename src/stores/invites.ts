import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useSharing } from '@/stores/sharing'
import { pingNotif } from '@/lib/appChannel'
import type { Page } from '@/types'

export interface ShareInvite {
  shareId: string
  pageId: string
  pageTitle: string
  pageIcon: string
  pageData: Page
  ownerEmail: string
  sharedAt: string
}

export interface OwnerNotif {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

interface InvitesStore {
  pendingInvites: ShareInvite[]
  ownerNotifs: OwnerNotif[]
  loadPendingInvites: (email: string) => Promise<void>
  loadOwnerNotifs: (userId: string) => Promise<void>
  acceptInvite: (invite: ShareInvite, userEmail: string) => Promise<void>
  declineInvite: (invite: ShareInvite) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useInvites = create<InvitesStore>((set, get) => ({
  pendingInvites: [],
  ownerNotifs: [],

  async loadPendingInvites(_email) {
    const { data } = await supabase.rpc('get_pending_invites')
    // If status column doesn't exist yet, data will be null — that's fine, bell stays empty
    if (data) {
      set({
        pendingInvites: data.map((r: any) => ({
          shareId: r.id,
          pageId: r.page_id,
          pageTitle: r.page_title,
          pageIcon: r.page_icon,
          pageData: r.page_data as Page,
          ownerEmail: r.owner_email,
          sharedAt: r.created_at,
        })),
      })
    }
  },

  async loadOwnerNotifs(userId) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) {
      set({
        ownerNotifs: data.map(r => ({
          id: r.id,
          type: r.type?.split(':')[0] ?? r.type,
          title: r.title,
          body: r.body ?? '',
          read: r.read,
          createdAt: r.created_at,
        })),
      })
    }
  },

  async acceptInvite(invite, userEmail) {
    const { error } = await supabase.rpc('respond_to_share', {
      p_share_id: invite.shareId,
      p_status: 'accepted',
    })
    if (error) return
    await useSharing.getState().loadSharedWithMe(userEmail)
    set(s => ({ pendingInvites: s.pendingInvites.filter(i => i.shareId !== invite.shareId) }))
  },

  async declineInvite(invite) {
    const { error } = await supabase.rpc('respond_to_share', {
      p_share_id: invite.shareId,
      p_status: 'declined',
    })
    if (error) return
    set(s => ({ pendingInvites: s.pendingInvites.filter(i => i.shareId !== invite.shareId) }))
    // Ping the owner so their bell updates instantly
    pingNotif(invite.ownerEmail, 'Invite declined', `${invite.ownerEmail} — your invite to "${invite.pageTitle}" was declined.`)
  },

  async markAllRead() {
    const ids = get().ownerNotifs.filter(n => !n.read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ read: true }).in('id', ids)
    set(s => ({ ownerNotifs: s.ownerNotifs.map(n => ({ ...n, read: true })) }))
  },
}))
