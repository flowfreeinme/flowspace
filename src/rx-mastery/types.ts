export type ControlTitle = 'Rx' | 'C-II' | 'C-III' | 'C-IV' | 'C-V'

export type SkillArea = 'brandGeneric' | 'indications' | 'controlStatus' | 'mixedReview'

export type SourceReference = {
  name: string
  url: string
}

export type Medication = {
  id: string
  brandName: string
  genericName: string
  indication: string
  control: ControlTitle
  reviewedAt: string
  indicationSource: SourceReference
  controlSource: SourceReference
}

export type SkillProgress = {
  attempts: number
  correct: number
  confidence: number
  lastPracticedAt?: string
}

export type MedicationProgress = {
  medicationId: string
  brandGeneric: SkillProgress
  indications: SkillProgress
  controlStatus: SkillProgress
}

export type ProgressState = {
  version: 1
  updatedAt: string
  medications: Record<string, MedicationProgress>
}

export type QuizQuestionType = 'brandToGeneric' | 'genericToBrand' | 'indication' | 'control'

export type QuizQuestion = {
  id: string
  medicationId: string
  type: QuizQuestionType
  prompt: string
  choices: string[]
  correctAnswer: string
  skillArea: Exclude<SkillArea, 'mixedReview'>
}
