import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { pingInvite, pingNotif } from '@/lib/appChannel'
import type { Page } from '@/types'

interface SharedPage {
  shareId: string
  pageId: string
  title: string
  icon: string
  pageData: Page
  ownerEmail: string
  sharedAt: string
}

interface SharingStore {
  sharedWithMe: SharedPage[]
  myShares: Record<string, string[]> // pageId -> emails
  loadSharedWithMe: (email: string) => Promise<void>
  loadMyShares: (userId: string) => Promise<void>
  sharePage: (page: Page, ownerEmail: string, ownerId: string, targetEmail: string) => Promise<string | null>
  unsharePage: (pageId: string, targetEmail: string) => Promise<void>
  leaveShare: (pageId: string) => Promise<void>
  notifyBoardDeleted: (pageId: string, pageTitle: string) => Promise<void>
  syncSharedPage: (page: Page, ownerId: string) => Promise<void>
}

export const useSharing = create<SharingStore>((set, get) => ({
  sharedWithMe: [],
  myShares: {},

  async loadSharedWithMe(_email) {
    const { data } = await supabase.rpc('get_accepted_shares')

    if (data) {
      set({
        sharedWithMe: data.map((r: any) => ({
          shareId: r.id,
          pageId: r.page_id,
          title: r.page_title,
          icon: r.page_icon,
          pageData: r.page_data as Page,
          ownerEmail: r.owner_email,
          sharedAt: r.created_at,
        })),
      })
    }
  },

  async loadMyShares(userId) {
    const { data } = await supabase
      .from('page_shares')
      .select('page_id, shared_with_email')
      .eq('owner_id', userId)

    if (data) {
      const map: Record<string, string[]> = {}
      data.forEach(r => {
        if (!map[r.page_id]) map[r.page_id] = []
        map[r.page_id].push(r.shared_with_email)
      })
      set({ myShares: map })
    }
  },

  async sharePage(page, ownerEmail, ownerId, targetEmail) {
    const cleanEmail = targetEmail.toLowerCase().trim()

    const row = {
      page_id: page.id,
      page_title: page.title || 'Untitled',
      page_icon: page.icon,
      page_data: page,
      owner_id: ownerId,
      owner_email: ownerEmail,
      shared_with_email: cleanEmail,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.rpc('share_page', {
      p_page_id: row.page_id,
      p_page_title: row.page_title,
      p_page_icon: row.page_icon,
      p_page_data: row.page_data,
      p_owner_id: row.owner_id,
      p_owner_email: row.owner_email,
      p_shared_with_email: row.shared_with_email,
    })

    if (error) return `Failed to share: ${error.message}`

    // Ping the recipient instantly so their bell updates without a refresh
    pingInvite(cleanEmail, ownerEmail, page.title || 'Untitled')

    set(s => ({
      myShares: {
        ...s.myShares,
        [page.id]: [...(s.myShares[page.id] ?? []).filter(e => e !== targetEmail), targetEmail],
      },
    }))
    return null
  },

  async unsharePage(pageId, targetEmail) {
    await supabase.rpc('remove_share', {
      p_page_id: pageId,
      p_shared_with_email: targetEmail,
    })

    // Broadcast instant UI removal to the removed user
    const ch = supabase.channel(`access:${targetEmail.trim().toLowerCase()}`)
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'revoked', payload: { pageId } })
        setTimeout(() => supabase.removeChannel(ch), 1000)
      }
    })

    // Ping the removed user so the notification appears in their bell instantly
    pingNotif(
      targetEmail,
      'Board access removed',
      'The owner has removed your access to this board. You will need to be reinvited to regain access.',
    )

    set(s => ({
      myShares: {
        ...s.myShares,
        [pageId]: (s.myShares[pageId] ?? []).filter(e => e !== targetEmail),
      },
    }))
  },

  async notifyBoardDeleted(pageId, pageTitle) {
    await supabase.rpc('delete_shared_board', {
      p_page_id: pageId,
      p_page_title: pageTitle,
    })
    // Ping each recipient so their bell updates instantly
    const recipients = get().myShares[pageId] ?? []
    recipients.forEach(email => {
      pingNotif(email, 'Board deleted', `"${pageTitle}" has been deleted by its owner. You no longer have access.`)
    })
  },

  async leaveShare(pageId) {
    await supabase.rpc('leave_share', { p_page_id: pageId })
    set(s => ({ sharedWithMe: s.sharedWithMe.filter(p => p.pageId !== pageId) }))
  },

  async syncSharedPage(page, ownerId) {
    const emails = get().myShares[page.id]
    if (!emails?.length) return
    await supabase.from('page_shares').update({
      page_data: page,
      page_title: page.title || 'Untitled',
      page_icon: page.icon,
      updated_at: new Date().toISOString(),
    }).eq('page_id', page.id).eq('owner_id', ownerId)
  },
}))
