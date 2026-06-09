import { describe, expect, it } from 'vitest'
import { createInitialProgress, recordAnswer } from './mastery'
import { getMasteryTiles, getWeakestPracticeTarget } from './recommendations'

describe('recommendations', () => {
  it('recommends the lowest-confidence skill area', () => {
    const progress = recordAnswer(createInitialProgress(['a']), {
      medicationId: 'a',
      skillArea: 'brandGeneric',
      correct: true,
      mode: 'quiz',
      answeredAt: '2026-06-08T12:00:00.000Z',
    })

    expect(getWeakestPracticeTarget(progress).skillArea).toBe('indications')
  })

  it('returns dashboard tiles in display order', () => {
    const tiles = getMasteryTiles(createInitialProgress(['a', 'b']))

    expect(tiles.map((tile) => tile.skillArea)).toEqual([
      'brandGeneric',
      'indications',
      'controlStatus',
      'mixedReview',
    ])
  })
})
