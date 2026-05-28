import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@supabase/supabase-js'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_CONTENT_TYPE_PREFIXES = ['image/', 'video/', 'application/pdf', 'application/octet-stream', 'text/plain']

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify caller is authenticated
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  let userId: string
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    userId = user.id
  } catch {
    return res.status(401).json({ error: 'Could not verify identity.' })
  }

  const { key, contentType } = req.body
  if (!key || !contentType) return res.status(400).json({ error: 'Missing key or contentType' })

  // Key must be scoped to the authenticated user's ID to prevent writing to other users' paths
  if (!key.startsWith(`${userId}/`)) {
    return res.status(403).json({ error: 'Forbidden: key must be scoped to your user ID' })
  }

  if (!ALLOWED_CONTENT_TYPE_PREFIXES.some(p => contentType.startsWith(p))) {
    return res.status(400).json({ error: 'Content type not allowed' })
  }

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    })
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 })
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    res.json({ uploadUrl, publicUrl })
  } catch {
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
}
