import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const ALLOWED_CONTENT_TYPE_PREFIXES = ['image/']

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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

  const { key, contentType, dataBase64 } = req.body ?? {}
  if (typeof key !== 'string' || typeof contentType !== 'string' || typeof dataBase64 !== 'string') {
    return res.status(400).json({ error: 'Missing upload data.' })
  }

  if (!key.startsWith(`${userId}/`)) {
    return res.status(403).json({ error: 'Forbidden: key must be scoped to your user ID' })
  }

  if (!ALLOWED_CONTENT_TYPE_PREFIXES.some(prefix => contentType.startsWith(prefix))) {
    return res.status(400).json({ error: 'Content type not allowed' })
  }

  let body: Buffer
  try {
    body = Buffer.from(dataBase64, 'base64')
  } catch {
    return res.status(400).json({ error: 'Invalid upload data.' })
  }

  if (!body.length || body.byteLength > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ error: 'Drawing is too large to upload.' })
  }

  try {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }))
    return res.json({ publicUrl: `${process.env.R2_PUBLIC_URL}/${key}` })
  } catch {
    return res.status(500).json({ error: 'Failed to upload drawing.' })
  }
}
