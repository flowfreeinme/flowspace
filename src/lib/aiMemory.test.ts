import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

const mockSession = { access_token: 'test-token' }

async function getModule() {
  return import('./aiMemory')
}

describe('saveToMemory', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns message id on success', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'abc-123' }),
    } as Response)

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBe('abc-123')
    expect(fetch).toHaveBeenCalledWith('/api/ai-memory-save', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-1', role: 'user', content: 'hello' }),
    }))
  })

  it('returns null when no session', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as any)

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null on non-ok response', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBeNull()
  })

  it('returns null on network error', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'))

    const { saveToMemory } = await getModule()
    const id = await saveToMemory('session-1', 'user', 'hello')

    expect(id).toBeNull()
  })
})

describe('embedMessage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response))
  })

  it('calls embed endpoint with messageId and text', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)

    const { embedMessage } = await getModule()
    await embedMessage('msg-1', 'some text')

    expect(fetch).toHaveBeenCalledWith('/api/ai-embed', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ messageId: 'msg-1', text: 'some text' }),
    }))
  })

  it('does nothing when no session', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as any)

    const { embedMessage } = await getModule()
    await embedMessage('msg-1', 'some text')

    expect(fetch).not.toHaveBeenCalled()
  })

  it('swallows network errors silently', async () => {
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
    } as any)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'))

    const { embedMessage } = await getModule()
    await expect(embedMessage('msg-1', 'text')).resolves.toBeUndefined()
  })
})
