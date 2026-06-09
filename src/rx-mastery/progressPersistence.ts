import { supabase } from '@/lib/supabase'
import type { ProgressState } from './types'

type ProgressRow = {
  user_id: string
  progress: ProgressState
}

function isProgressState(value: unknown): value is ProgressState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ProgressState>
  return candidate.version === 1 && typeof candidate.updatedAt === 'string' && typeof candidate.medications === 'object'
}

export async function loadSavedProgress(userId: string): Promise<ProgressState | null> {
  const { data, error } = await supabase
    .from('rx_mastery_progress')
    .select('progress')
    .eq('user_id', userId)
    .maybeSingle<Pick<ProgressRow, 'progress'>>()

  if (error || !data || !isProgressState(data.progress)) return null
  return data.progress
}

export async function saveSavedProgress(userId: string, progress: ProgressState): Promise<string | null> {
  const { error } = await supabase
    .from('rx_mastery_progress')
    .upsert(
      {
        user_id: userId,
        progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  return error?.message ?? null
}
