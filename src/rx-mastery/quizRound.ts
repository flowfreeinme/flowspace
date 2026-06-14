import type { PracticeArea, QuizQuestionType, SigCodeQuestionType } from './types'
import type { MissedQuestionReplay } from './quizReview'

type RoundSourceItem = {
  id: string
}

type CreateQuizRoundDeckOptions = {
  practiceArea: PracticeArea
  medications: RoundSourceItem[]
  sigCodes: RoundSourceItem[]
  questionType: QuizQuestionType
  sigQuestionType: SigCodeQuestionType
  roundLength?: number
  random?: () => number
}

const DEFAULT_ROUND_LENGTH = 10

function shuffleItems<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
}

function questionTypeForMixedReview(index: number): QuizQuestionType {
  if (index % 4 === 0) return 'control'
  if (index % 4 === 1) return 'indication'
  if (index % 4 === 2) return 'brandToGeneric'
  return 'genericToBrand'
}

function sigQuestionTypeForRound(index: number, preferredType: SigCodeQuestionType): SigCodeQuestionType {
  if (index === 0) return preferredType
  return index % 2 === 0 ? 'sigToMeaning' : 'meaningToSig'
}

export function createQuizRoundDeck({
  practiceArea,
  medications,
  sigCodes,
  questionType,
  sigQuestionType,
  roundLength = DEFAULT_ROUND_LENGTH,
  random = Math.random,
}: CreateQuizRoundDeckOptions): MissedQuestionReplay[] {
  const limit = Math.max(0, roundLength)

  if (practiceArea === 'sigCodes') {
    return shuffleItems(sigCodes, random)
      .slice(0, limit)
      .map((sigCode, index) => ({
        kind: 'sigCode',
        itemId: sigCode.id,
        questionType: sigQuestionTypeForRound(index, sigQuestionType),
      }))
  }

  return shuffleItems(medications, random)
    .slice(0, limit)
    .map((medication, index) => ({
      kind: 'medication',
      itemId: medication.id,
      questionType: practiceArea === 'mixedReview' ? questionTypeForMixedReview(index) : questionType,
    }))
}
