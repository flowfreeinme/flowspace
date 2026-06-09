import type { MedicationProgress, ProgressState, SkillArea, SkillProgress } from './types'

type AnswerEvent = {
  medicationId: string
  skillArea: Exclude<SkillArea, 'mixedReview'>
  correct: boolean
  mode: 'quiz' | 'flashcard'
  answeredAt: string
}

const emptySkill = (): SkillProgress => ({
  attempts: 0,
  correct: 0,
  confidence: 0,
})

const createMedicationProgress = (medicationId: string): MedicationProgress => ({
  medicationId,
  brandGeneric: emptySkill(),
  indications: emptySkill(),
  controlStatus: emptySkill(),
})

const clampConfidence = (value: number) => Math.max(0, Math.min(100, value))

export function createInitialProgress(medicationIds: string[]): ProgressState {
  const medications: Record<string, MedicationProgress> = {}

  for (const medicationId of medicationIds) {
    medications[medicationId] = createMedicationProgress(medicationId)
  }

  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    medications,
  }
}

export function ensureProgressForMedications(progress: ProgressState, medicationIds: string[]): ProgressState {
  const next: ProgressState = {
    ...progress,
    medications: { ...progress.medications },
  }

  for (const medicationId of medicationIds) {
    if (!next.medications[medicationId]) {
      next.medications[medicationId] = createMedicationProgress(medicationId)
    }
  }

  return next
}

export function recordAnswer(progress: ProgressState, event: AnswerEvent): ProgressState {
  const ensured = ensureProgressForMedications(progress, [event.medicationId])
  const currentMedication = ensured.medications[event.medicationId]
  const currentSkill = currentMedication[event.skillArea]
  const delta = event.mode === 'quiz' ? 18 : 8
  const updatedSkill: SkillProgress = {
    attempts: currentSkill.attempts + 1,
    correct: currentSkill.correct + (event.correct ? 1 : 0),
    confidence: clampConfidence(currentSkill.confidence + (event.correct ? delta : -delta)),
    lastPracticedAt: event.answeredAt,
  }

  return {
    ...ensured,
    updatedAt: event.answeredAt,
    medications: {
      ...ensured.medications,
      [event.medicationId]: {
        ...currentMedication,
        [event.skillArea]: updatedSkill,
      },
    },
  }
}

export function getOverallMastery(progress: ProgressState): number {
  const buckets = Object.values(progress.medications).flatMap((med) => [
    med.brandGeneric.confidence,
    med.indications.confidence,
    med.controlStatus.confidence,
  ])

  if (buckets.length === 0) return 0
  return Math.round(buckets.reduce((sum, value) => sum + value, 0) / buckets.length)
}
