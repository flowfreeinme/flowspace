import { v4 as uuid } from 'uuid'
import { supabase } from './supabase'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_SAME_ORIGIN_UPLOAD_SIZE = 4 * 1024 * 1024

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

  const key = makeR2ObjectKey(userId, pageId, fileName)
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

export function makeR2ObjectKey(userId: string, pageId: string, fileName: string, id = uuid()) {
  return `${userId}/${pageId}/${id}-${fileName}`
}

export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export async function uploadDrawingToR2(
  file: Blob,
  userId: string,
  pageId: string,
  fileName: string,
): Promise<{ url: string; name: string; size: number }> {
  const size = file.size
  if (size > MAX_SAME_ORIGIN_UPLOAD_SIZE) {
    throw new Error('Drawing is too large to upload. Try clearing detail or using a smaller browser window.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You need to sign in again before uploading.')

  const key = makeR2ObjectKey(userId, pageId, fileName)
  const contentType = file.type || 'image/png'
  const dataBase64 = await blobToBase64(file)

  const res = await fetch('/api/upload-object', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ key, contentType, dataBase64 }),
  })
  if (!res.ok) throw new Error(await getResponseError(res, 'Drawing upload failed.'))

  const { publicUrl } = await res.json()
  return { url: publicUrl, name: fileName, size }
}
