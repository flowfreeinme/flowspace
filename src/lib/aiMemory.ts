// src/lib/aiMemory.ts
import { supabase } from '@/lib/supabase'

export async function saveToMemory(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const res = await fetch('/api/ai-memory-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sessionId, role, content }),
    })
    if (!res.ok) return null

    const data = await res.json()
    return data.id ?? null
  } catch {
    return null
  }
}

export async function embedMessage(messageId: string, text: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await fetch('/api/ai-embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messageId, text }),
    })
  } catch {
    // silent failure — embedding is non-critical
  }
}
