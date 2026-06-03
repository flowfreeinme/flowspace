// api/ai-embed.ts
import { createClient } from '@supabase/supabase-js'
import { getEmbedding } from './_embed'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
    const { data } = await supabase.auth.getUser(token)
    if (!data.user) return res.status(401).json({ error: 'Unauthorized' })

    const { messageId, text } = req.body
    if (!messageId || !text) return res.status(400).json({ error: 'Missing fields' })

    const embedding = await getEmbedding(text)

    // pgvector expects the array as a literal string '[0.1,0.2,...]'
    const { error, data: updated } = await supabase
      .from('ai_chat_history')
      .update({ embedding: `[${embedding.join(',')}]` })
      .eq('id', messageId)
      .eq('user_id', data.user.id)
      .select('id')

    if (error) return res.status(500).json({ error: error.message })
    if (!updated?.length) return res.status(404).json({ error: 'Message not found' })
    return res.json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Internal error' })
  }
}
