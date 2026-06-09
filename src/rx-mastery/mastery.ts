import type { MedicationProgress, MedicationSkillArea, ProgressState, SkillProgress } from './types'

type AnswerEvent = {
  medicationId: string
  skillArea: MedicationSkillArea
  correct: boolean
  mode: 'quiz' | 'flashcard'
  answeredAt: string
}

type SigAnswerEvent = {
  sigCodeId: string
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

export function createInitialProgress(medicationIds: string[], sigCodeIds: string[] = []): ProgressState {
  const medications: Record<string, MedicationProgress> = {}
  const sigCodes: Record<string, SkillProgress> = {}

  for (const medicationId of medicationIds) {
    medications[medicationId] = createMedicationProgress(medicationId)
  }

  for (const sigCodeId of sigCodeIds) {
    sigCodes[sigCodeId] = emptySkill()
  }

  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    medications,
    sigCodes,
  }
}

export function ensureProgressForMedications(progress: ProgressState, medicationIds: string[]): ProgressState {
  const next: ProgressState = {
    ...progress,
    medications: { ...progress.medications },
    sigCodes: { ...(progress.sigCodes ?? {}) },
  }

  for (const medicationId of medicationIds) {
    if (!next.medications[medicationId]) {
      next.medications[medicationId] = createMedicationProgress(medicationId)
    }
  }

  return next
}

export function ensureProgressForSigCodes(progress: ProgressState, sigCodeIds: string[]): ProgressState {
  const next: ProgressState = {
    ...progress,
    medications: { ...progress.medications },
    sigCodes: { ...(progress.sigCodes ?? {}) },
  }

  for (const sigCodeId of sigCodeIds) {
    if (!next.sigCodes[sigCodeId]) {
      next.sigCodes[sigCodeId] = emptySkill()
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

export function recordSigAnswer(progress: ProgressState, event: SigAnswerEvent): ProgressState {
  const ensured = ensureProgressForSigCodes(progress, [event.sigCodeId])
  const currentSkill = ensured.sigCodes[event.sigCodeId]
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
    sigCodes: {
      ...ensured.sigCodes,
      [event.sigCodeId]: updatedSkill,
    },
  }
}

export function getOverallMastery(progress: ProgressState): number {
  const buckets = [
    ...Object.values(progress.medications).flatMap((med) => [
      med.brandGeneric.confidence,
      med.indications.confidence,
      med.controlStatus.confidence,
    ]),
    ...Object.values(progress.sigCodes ?? {}).map((sigProgress) => sigProgress.confidence),
  ]

  if (buckets.length === 0) return 0
  return Math.round(buckets.reduce((sum, value) => sum + value, 0) / buckets.length)
}

export function getSigCodeMastery(progress: ProgressState): number {
  const buckets = Object.values(progress.sigCodes ?? {}).map((sigProgress) => sigProgress.confidence)

  if (buckets.length === 0) return 0
  return Math.round(buckets.reduce((sum, value) => sum + value, 0) / buckets.length)
}
