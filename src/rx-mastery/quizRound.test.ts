import { describe, expect, it } from 'vitest'
import { createQuizRoundDeck } from './quizRound'

const medications = ['med-a', 'med-b', 'med-c', 'med-d'].map((id) => ({ id }))
const sigCodes = ['sig-a', 'sig-b', 'sig-c', 'sig-d'].map((id) => ({ id }))
const zeroRandom = () => 0

describe('createQuizRoundDeck', () => {
  it('creates a randomized medication deck capped by round length', () => {
    const deck = createQuizRoundDeck({
      practiceArea: 'brandGeneric',
      medications,
      sigCodes,
      questionType: 'brandToGeneric',
      sigQuestionType: 'sigToMeaning',
      roundLength: 3,
      random: zeroRandom,
    })

    expect(deck).toEqual([
      { kind: 'medication', itemId: 'med-b', questionType: 'brandToGeneric' },
      { kind: 'medication', itemId: 'med-c', questionType: 'brandToGeneric' },
      { kind: 'medication', itemId: 'med-d', questionType: 'brandToGeneric' },
    ])
  })

  it('creates a randomized SIG code deck with alternating SIG question types', () => {
    const deck = createQuizRoundDeck({
      practiceArea: 'sigCodes',
      medications,
      sigCodes,
      questionType: 'brandToGeneric',
      sigQuestionType: 'sigToMeaning',
      roundLength: 4,
      random: zeroRandom,
    })

    expect(deck).toEqual([
      { kind: 'sigCode', itemId: 'sig-b', questionType: 'sigToMeaning' },
      { kind: 'sigCode', itemId: 'sig-c', questionType: 'meaningToSig' },
      { kind: 'sigCode', itemId: 'sig-d', questionType: 'sigToMeaning' },
      { kind: 'sigCode', itemId: 'sig-a', questionType: 'meaningToSig' },
    ])
  })

  it('creates a randomized mixed-review medication deck with varied question types', () => {
    const deck = createQuizRoundDeck({
      practiceArea: 'mixedReview',
      medications,
      sigCodes,
      questionType: 'brandToGeneric',
      sigQuestionType: 'sigToMeaning',
      roundLength: 4,
      random: zeroRandom,
    })

    expect(deck).toEqual([
      { kind: 'medication', itemId: 'med-b', questionType: 'control' },
      { kind: 'medication', itemId: 'med-c', questionType: 'indication' },
      { kind: 'medication', itemId: 'med-d', questionType: 'brandToGeneric' },
      { kind: 'medication', itemId: 'med-a', questionType: 'genericToBrand' },
    ])
  })

  it('uses at most 10 questions in a round', () => {
    const largeMedicationList = Array.from({ length: 14 }, (_, index) => ({ id: `med-${index}` }))
    const deck = createQuizRoundDeck({
      practiceArea: 'controlStatus',
      medications: largeMedicationList,
      sigCodes,
      questionType: 'control',
      sigQuestionType: 'sigToMeaning',
      random: zeroRandom,
    })

    expect(deck).toHaveLength(10)
  })
})
