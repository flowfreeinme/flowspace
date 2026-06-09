import { describe, expect, it } from 'vitest'
import {
  createInitialProgress,
  ensureProgressForSigCodes,
  getOverallMastery,
  getSigCodeMastery,
  recordAnswer,
  recordSigAnswer,
} from './mastery'
import type { ProgressState } from './types'

describe('mastery model', () => {
  it('creates skill buckets for every medication', () => {
    const progress = createInitialProgress(['lipitor-atorvastatin'])

    expect(progress.medications['lipitor-atorvastatin'].brandGeneric.confidence).toBe(0)
    expect(progress.medications['lipitor-atorvastatin'].indications.confidence).toBe(0)
    expect(progress.medications['lipitor-atorvastatin'].controlStatus.confidence).toBe(0)
  })

  it('creates and updates SIG code progress buckets', () => {
    const progress = createInitialProgress(['lipitor-atorvastatin'], ['bid-twice-daily'])
    const legacyProgress = {
      version: 1,
      updatedAt: progress.updatedAt,
      medications: progress.medications,
    } as ProgressState
    const expanded = ensureProgressForSigCodes(legacyProgress, ['bid-twice-daily', 'tid-three-times-daily'])

    const next = recordSigAnswer(expanded, {
      sigCodeId: 'bid-twice-daily',
      correct: true,
      mode: 'quiz',
      answeredAt: '2026-06-08T12:00:00.000Z',
    })

    expect(expanded.sigCodes['bid-twice-daily'].confidence).toBe(0)
    expect(expanded.sigCodes['tid-three-times-daily'].confidence).toBe(0)
    expect(next.sigCodes['bid-twice-daily'].attempts).toBe(1)
    expect(next.sigCodes['bid-twice-daily'].confidence).toBe(18)
    expect(getSigCodeMastery(next)).toBe(9)
  })

  it('updates confidence after quiz and flashcard answers', () => {
    const progress = createInitialProgress(['lipitor-atorvastatin'])
    const afterCorrect = recordAnswer(progress, {
      medicationId: 'lipitor-atorvastatin',
      skillArea: 'brandGeneric',
      correct: true,
      mode: 'quiz',
      answeredAt: '2026-06-08T12:00:00.000Z',
    })
    const afterMiss = recordAnswer(afterCorrect, {
      medicationId: 'lipitor-atorvastatin',
      skillArea: 'brandGeneric',
      correct: false,
      mode: 'flashcard',
      answeredAt: '2026-06-08T12:01:00.000Z',
    })

    expect(afterCorrect.medications['lipitor-atorvastatin'].brandGeneric.confidence).toBe(18)
    expect(afterMiss.medications['lipitor-atorvastatin'].brandGeneric.confidence).toBe(10)
  })

  it('calculates overall mastery as average confidence', () => {
    const progress = createInitialProgress(['a', 'b'])
    const next = recordAnswer(progress, {
      medicationId: 'a',
      skillArea: 'controlStatus',
      correct: true,
      mode: 'quiz',
      answeredAt: '2026-06-08T12:00:00.000Z',
    })

    expect(getOverallMastery(next)).toBe(3)
  })
})
