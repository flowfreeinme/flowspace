import { supabase } from './supabase'

// Single persistent broadcast channel every logged-in user subscribes to.
// Used to ping clients in real-time without relying on Postgres Changes.
export const appChannel = supabase.channel('app-events')

export function pingInvite(recipientEmail: string, ownerEmail: string, pageTitle: string) {
  appChannel.send({
    type: 'broadcast',
    event: 'invite-ping',
    payload: { recipientEmail: recipientEmail.toLowerCase(), ownerEmail, pageTitle },
  })
}

export function pingNotif(recipientEmail: string, title: string, body: string) {
  appChannel.send({
    type: 'broadcast',
    event: 'notif-ping',
    payload: { recipientEmail: recipientEmail.toLowerCase(), title, body },
  })
}
