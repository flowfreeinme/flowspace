import type { Medication, QuizQuestion, QuizQuestionType, SigCode, SigCodeQuestion, SigCodeQuestionType } from './types'

const skillForType = (type: QuizQuestionType): QuizQuestion['skillArea'] => {
  if (type === 'indication') return 'indications'
  if (type === 'control') return 'controlStatus'
  return 'brandGeneric'
}

const answerForType = (medication: Medication, type: QuizQuestionType): string => {
  if (type === 'brandToGeneric') return medication.genericName
  if (type === 'genericToBrand') return medication.brandName
  if (type === 'indication') return medication.indication
  return medication.control
}

const promptForType = (medication: Medication, type: QuizQuestionType): string => {
  if (type === 'brandToGeneric') return `What is the generic name for ${medication.brandName}?`
  if (type === 'genericToBrand') return `What is the brand name for ${medication.genericName}?`
  if (type === 'indication') return `What is ${medication.brandName} commonly used for?`
  return `What is the control title for ${medication.brandName}?`
}

function rotateChoices(choices: string[], seed: string) {
  if (choices.length <= 1) return choices
  const offset = Array.from(seed).reduce((sum, character) => sum + character.charCodeAt(0), 0) % choices.length
  return choices.slice(offset).concat(choices.slice(0, offset))
}

export function createQuestion(
  medication: Medication,
  allMedications: Medication[],
  type: QuizQuestionType,
): QuizQuestion {
  const correctAnswer = answerForType(medication, type)
  const distractors = allMedications
    .map((candidate) => answerForType(candidate, type))
    .filter((answer) => answer !== correctAnswer)
  const choices = rotateChoices(Array.from(new Set([correctAnswer, ...distractors])).slice(0, 4), medication.id)

  return {
    id: `${medication.id}-${type}`,
    medicationId: medication.id,
    type,
    prompt: promptForType(medication, type),
    choices,
    correctAnswer,
    skillArea: skillForType(type),
  }
}

const sigAnswerForType = (sigCode: SigCode, type: SigCodeQuestionType): string => {
  if (type === 'sigToMeaning') return sigCode.meaning
  return sigCode.code
}

const sigPromptForType = (sigCode: SigCode, type: SigCodeQuestionType): string => {
  if (type === 'sigToMeaning') return `What does SIG code ${sigCode.code} mean?`
  return `Which SIG code means "${sigCode.meaning}"?`
}

export function createSigCodeQuestion(
  sigCode: SigCode,
  allSigCodes: SigCode[],
  type: SigCodeQuestionType,
): SigCodeQuestion {
  const correctAnswer = sigAnswerForType(sigCode, type)
  const distractors = allSigCodes
    .map((candidate) => sigAnswerForType(candidate, type))
    .filter((answer) => answer !== correctAnswer)
  const choices = rotateChoices(Array.from(new Set([correctAnswer, ...distractors])).slice(0, 4), `${sigCode.id}-${type}`)

  return {
    id: `${sigCode.id}-${type}`,
    sigCodeId: sigCode.id,
    type,
    prompt: sigPromptForType(sigCode, type),
    choices,
    correctAnswer,
    skillArea: 'sigCodes',
  }
}
