const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const url = typeof req.query?.url === 'string' ? req.query.url : ''
  const publicBase = process.env.R2_PUBLIC_URL
  if (!url || !publicBase) return res.status(400).json({ error: 'Missing image URL.' })
  if (!url.startsWith(`${publicBase}/`)) return res.status(403).json({ error: 'Image URL is not allowed.' })

  try {
    const response = await fetch(url)
    if (!response.ok) return res.status(response.status).json({ error: 'Could not load image.' })

    const contentType = response.headers.get('content-type') ?? 'image/png'
    if (!contentType.startsWith('image/')) return res.status(400).json({ error: 'Only images can be loaded.' })

    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.length || bytes.byteLength > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Image is too large to edit.' })
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'private, max-age=60')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).send(bytes)
  } catch {
    return res.status(500).json({ error: 'Could not load image.' })
  }
}
