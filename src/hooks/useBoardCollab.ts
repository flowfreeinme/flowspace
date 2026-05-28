import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/stores/workspace'
import type { Block } from '@/types'

// Stable per-session device ID — lets the same user on two devices
// receive each other's broadcasts (userId would filter them out)
const DEVICE_ID = Math.random().toString(36).slice(2)

function colorFromId(id: string): string {
  const palette = ['#7c6af7', '#34a853', '#ea4335', '#fbbc04', '#4285f4', '#ff6d00', '#e91e63', '#00bcd4']
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return palette[Math.abs(h) % palette.length]
}

export interface Collaborator { userId: string; email: string; color: string }

export function useBoardCollab(pageId: string, userId: string, userEmail: string) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteSnapshotRef = useRef<string>('')

  const broadcastBlocks = useCallback((blocks: Block[]) => {
    const snap = JSON.stringify(blocks)
    if (snap === remoteSnapshotRef.current) return
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
    broadcastTimerRef.current = setTimeout(() => {
      channelRef.current?.send({ type: 'broadcast', event: 'blocks', payload: { deviceId: DEVICE_ID, blocks } })
    }, 200)
  }, [])

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel(`board:${pageId}`, {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    channel.on('broadcast', { event: 'blocks' }, ({ payload }) => {
      if (payload.deviceId === DEVICE_ID) return
      const blocks = payload.blocks as Block[]
      remoteSnapshotRef.current = JSON.stringify(blocks)
      useWorkspace.setState(s => {
        const page = s.pages[pageId]
        if (!page) return s
        return { pages: { ...s.pages, [pageId]: { ...page, blocks, updatedAt: Date.now() } } }
      })
      setTimeout(() => { remoteSnapshotRef.current = '' }, 500)
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ email: string }>()
      const others = Object.entries(state)
        .filter(([key]) => key !== userId)
        .map(([key, presences]) => {
          const arr = presences as Array<{ email: string }>
          return { userId: key, email: arr[0]?.email ?? '', color: colorFromId(key) }
        })
      setCollaborators(others)
    })

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ email: userEmail })
      }
    })

    return () => {
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [pageId, userId, userEmail])

  return { collaborators, broadcastBlocks }
}
