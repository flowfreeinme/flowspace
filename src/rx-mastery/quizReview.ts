import type { QuizQuestionType, SigCodeQuestionType } from './types'

export type MissedQuestionReplay =
  | {
      kind: 'medication'
      itemId: string
      questionType: QuizQuestionType
    }
  | {
      kind: 'sigCode'
      itemId: string
      questionType: SigCodeQuestionType
    }

export type MissedQuestionReview = {
  id: string
  prompt: string
  selectedAnswer: string
  correctAnswer: string
  explanation: string
  replay: MissedQuestionReplay
}

export type RoundReviewSummary = {
  score: number
  total: number
  missed: MissedQuestionReview[]
  missedCount: number
  perfect: boolean
  canReviewMissed: boolean
}

export function createMissedQuestionReview(review: MissedQuestionReview): MissedQuestionReview {
  return review
}

export function createRoundReviewSummary({
  score,
  total,
  missed,
}: {
  score: number
  total: number
  missed: MissedQuestionReview[]
}): RoundReviewSummary {
  return {
    score,
    total,
    missed,
    missedCount: missed.length,
    perfect: missed.length === 0,
    canReviewMissed: missed.length > 0,
  }
}
