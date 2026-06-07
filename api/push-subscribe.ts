import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { endpoint, p256dh_key, auth_key, timezone, notify_hour } = req.body ?? {}
  if (!endpoint || !p256dh_key || !auth_key) {
    return res.status(400).json({ error: 'Missing required fields: endpoint, p256dh_key, auth_key' })
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh_key,
      auth_key,
      timezone: typeof timezone === 'string' ? timezone : 'UTC',
      notify_hour: typeof notify_hour === 'number' ? notify_hour : 8,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
