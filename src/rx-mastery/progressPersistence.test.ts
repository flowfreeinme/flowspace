import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialProgress } from './mastery'
import { loadSavedProgress, saveSavedProgress } from './progressPersistence'

const queryResult = vi.hoisted(() => ({
  maybeSingleResult: { data: null as unknown, error: null as null | { message: string } },
  upsertResult: { error: null as null | { message: string } },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => queryResult.maybeSingleResult),
        })),
      })),
      upsert: vi.fn(async () => queryResult.upsertResult),
    })),
  },
}))

describe('rx mastery progress persistence', () => {
  beforeEach(() => {
    queryResult.maybeSingleResult = { data: null, error: null }
    queryResult.upsertResult = { error: null }
  })

  it('loads saved progress when the row exists', async () => {
    const progress = createInitialProgress(['lipitor-atorvastatin'])
    queryResult.maybeSingleResult = { data: { progress }, error: null }

    await expect(loadSavedProgress('user-1')).resolves.toEqual(progress)
  })

  it('returns null when loading fails or progress is malformed', async () => {
    queryResult.maybeSingleResult = { data: { progress: { version: 2 } }, error: null }

    await expect(loadSavedProgress('user-1')).resolves.toBeNull()
  })

  it('returns save error messages without throwing', async () => {
    queryResult.upsertResult = { error: { message: 'table missing' } }

    await expect(saveSavedProgress('user-1', createInitialProgress(['a']))).resolves.toBe('table missing')
  })
})
