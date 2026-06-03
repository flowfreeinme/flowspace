// api/ai-embed.ts
import { createClient } from '@supabase/supabase-js'
const HF_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2'
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not set')
  const res = await fetch(HF_URL, {
    method: 'POST', signal: AbortSignal.timeout(8_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
  })
  if (!res.ok) throw new Error(`HuggingFace error ${res.status}: ${await res.text()}`)
  const data: number[] | number[][] = await res.json()
  if (Array.isArray(data) && typeof data[0] === 'number') return data as number[]
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0] as number[]
  throw new Error('Unexpected embedding shape')
}

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
