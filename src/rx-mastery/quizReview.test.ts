import { describe, expect, it } from 'vitest'
import { createMissedQuestionReview, createRoundReviewSummary } from './quizReview'

describe('quiz review helpers', () => {
  it('creates a missed question review item with replay metadata', () => {
    const missed = createMissedQuestionReview({
      id: 'lipitor-atorvastatin-brandToGeneric',
      prompt: 'What is the generic name for Lipitor?',
      selectedAnswer: 'rosuvastatin',
      correctAnswer: 'atorvastatin',
      explanation: 'Lipitor is atorvastatin. Common training indication: Hyperlipidemia.',
      replay: {
        kind: 'medication',
        itemId: 'lipitor-atorvastatin',
        questionType: 'brandToGeneric',
      },
    })

    expect(missed).toEqual({
      id: 'lipitor-atorvastatin-brandToGeneric',
      prompt: 'What is the generic name for Lipitor?',
      selectedAnswer: 'rosuvastatin',
      correctAnswer: 'atorvastatin',
      explanation: 'Lipitor is atorvastatin. Common training indication: Hyperlipidemia.',
      replay: {
        kind: 'medication',
        itemId: 'lipitor-atorvastatin',
        questionType: 'brandToGeneric',
      },
    })
  })

  it('summarizes a round with missed questions available for review', () => {
    const missed = [
      createMissedQuestionReview({
        id: 'bid-sigToMeaning',
        prompt: 'What does SIG code BID mean?',
        selectedAnswer: 'Three Times Daily',
        correctAnswer: 'Twice Daily',
        explanation: 'BID means Twice Daily. Category: Frequency.',
        replay: {
          kind: 'sigCode',
          itemId: 'bid-twice-daily',
          questionType: 'sigToMeaning',
        },
      }),
    ]

    expect(createRoundReviewSummary({ score: 9, total: 10, missed })).toEqual({
      score: 9,
      total: 10,
      missed,
      missedCount: 1,
      perfect: false,
      canReviewMissed: true,
    })
  })

  it('summarizes a perfect round without missed review action', () => {
    expect(createRoundReviewSummary({ score: 10, total: 10, missed: [] })).toEqual({
      score: 10,
      total: 10,
      missed: [],
      missedCount: 0,
      perfect: true,
      canReviewMissed: false,
    })
  })
})
