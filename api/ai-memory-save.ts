// api/ai-memory-save.ts
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  let user: any
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
    const { data } = await supabase.auth.getUser(token)
    if (!data.user) return res.status(401).json({ error: 'Unauthorized' })
    user = data.user

    const { sessionId, role, content } = req.body
    if (!sessionId || !role || !content) return res.status(400).json({ error: 'Missing fields' })
    if (!['user', 'assistant'].includes(role)) return res.status(400).json({ error: 'Invalid role' })

    const { data: row, error } = await supabase
      .from('ai_chat_history')
      .insert({ user_id: user.id, session_id: sessionId, role, content })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ id: row.id })
  } catch {
    return res.status(500).json({ error: 'Internal error' })
  }
}
