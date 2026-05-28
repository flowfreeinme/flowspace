import { v4 as uuid } from 'uuid'
import { supabase } from './supabase'

const MAX_FILE_SIZE = 25 * 1024 * 1024

async function getResponseError(response: Response, fallback: string) {
  const text = await response.text().catch(() => '')
  if (!text) return fallback

  try {
    const json = JSON.parse(text) as { error?: unknown; message?: unknown }
    if (typeof json.error === 'string') return json.error
    if (typeof json.message === 'string') return json.message
  } catch {
    return text.slice(0, 160)
  }

  return fallback
}

export async function uploadToR2(
  file: File | Blob,
  userId: string,
  pageId: string,
  fileName: string,
): Promise<{ url: string; name: string; size: number }> {
  const size = file.size
  if (size > MAX_FILE_SIZE) throw new Error('File exceeds 25 MB limit')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You need to sign in again before uploading.')

  const key = `${userId}/${pageId}/${uuid()}-${fileName}`
  const contentType = file.type || 'application/octet-stream'

  const res = await fetch('/api/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ key, contentType }),
  })
  if (!res.ok) throw new Error(await getResponseError(res, 'Failed to get upload URL.'))

  const { uploadUrl, publicUrl } = await res.json()

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!put.ok) throw new Error(await getResponseError(put, 'Upload to storage failed.'))

  return { url: publicUrl, name: fileName, size }
}
