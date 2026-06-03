import { describe, expect, it, vi } from 'vitest'
import { blobToBase64, makeR2ObjectKey } from './r2'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

describe('r2 upload helpers', () => {
  it('creates user-scoped object keys', () => {
    expect(makeR2ObjectKey('user-1', 'page-1', 'drawing.png', 'fixed-id')).toBe('user-1/page-1/fixed-id-drawing.png')
  })

  it('converts blobs to base64 for same-origin drawing uploads', async () => {
    const blob = new Blob(['draw'], { type: 'image/png' })

    await expect(blobToBase64(blob)).resolves.toBe('ZHJhdw==')
  })
})
