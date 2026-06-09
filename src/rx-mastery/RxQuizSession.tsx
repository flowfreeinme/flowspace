import { useMemo, useState } from 'react'
import { recordAnswer, recordSigAnswer } from './mastery'
import { createQuestion, createSigCodeQuestion } from './questions'
import type { Medication, PracticeArea, ProgressState, QuizQuestionType, SigCode, SigCodeQuestionType } from './types'

type Props = {
  medications: Medication[]
  sigCodes: SigCode[]
  progress: ProgressState
  practiceArea: PracticeArea
  questionType: QuizQuestionType
  sigQuestionType: SigCodeQuestionType
  onProgress: (progress: ProgressState) => void
  onExit: () => void
}

const ROUND_LENGTH = 10

function questionTypeForMixedReview(index: number): QuizQuestionType {
  if (index % 3 === 0) return 'control'
  if (index % 3 === 1) return 'indication'
  return index % 2 === 0 ? 'brandToGeneric' : 'genericToBrand'
}

function sigQuestionTypeForRound(index: number, preferredType: SigCodeQuestionType): SigCodeQuestionType {
  if (index === 0) return preferredType
  return index % 2 === 0 ? 'sigToMeaning' : 'meaningToSig'
}

export default function RxQuizSession({
  medications,
  sigCodes,
  progress,
  practiceArea,
  questionType,
  sigQuestionType,
  onProgress,
  onExit,
}: Props) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const medication = medications[index % medications.length]
  const sigCode = sigCodes[index % sigCodes.length]
  const activeType = practiceArea === 'mixedReview' ? questionTypeForMixedReview(index) : questionType
  const activeSigType = sigQuestionTypeForRound(index, sigQuestionType)
  const question = useMemo(() => {
    if (practiceArea === 'sigCodes') return createSigCodeQuestion(sigCode, sigCodes, activeSigType)
    return createQuestion(medication, medications, activeType)
  }, [activeSigType, activeType, medication, medications, practiceArea, sigCode, sigCodes])
  const isAnswered = selected !== null
  const roundComplete = index >= ROUND_LENGTH - 1

  const choose = (choice: string) => {
    if (isAnswered) return
    const correct = choice === question.correctAnswer
    setSelected(choice)
    setScore((current) => current + (correct ? 1 : 0))
    if (question.skillArea === 'sigCodes') {
      onProgress(recordSigAnswer(progress, {
        sigCodeId: question.sigCodeId,
        correct,
        mode: 'quiz',
        answeredAt: new Date().toISOString(),
      }))
      return
    }

    onProgress(recordAnswer(progress, {
      medicationId: question.medicationId,
      skillArea: question.skillArea,
      correct,
      mode: 'quiz',
      answeredAt: new Date().toISOString(),
    }))
  }

  return (
    <section className="rx-session-panel">
      <div className="rx-session-topbar">
        <button className="rx-ghost-button" onClick={onExit}>Back</button>
        <span>Question {index + 1} of {ROUND_LENGTH}</span>
        <strong>{score} correct</strong>
      </div>
      <div className="rx-question-card">
        <p className="rx-eyebrow">
          {question.skillArea === 'sigCodes'
            ? 'SIG codes'
            : question.skillArea === 'controlStatus'
              ? 'Control status'
              : question.skillArea}
        </p>
        <h2>{question.prompt}</h2>
        <div className="rx-choice-grid">
          {question.choices.map((choice) => {
            const isCorrect = choice === question.correctAnswer
            const stateClass = isAnswered
              ? isCorrect
                ? 'rx-choice-correct'
                : choice === selected
                  ? 'rx-choice-missed'
                  : ''
              : ''

            return (
              <button className={`rx-choice-button ${stateClass}`} key={choice} onClick={() => choose(choice)}>
                {choice}
              </button>
            )
          })}
        </div>
        {isAnswered && (
          <div className="rx-feedback">
            <strong>{selected === question.correctAnswer ? 'Correct' : 'Review this one'}</strong>
            {question.skillArea === 'sigCodes' ? (
              <span>
                {sigCode.code} means {sigCode.meaning}. Category: {sigCode.category}.
              </span>
            ) : (
              <span>
                {medication.brandName} is {medication.genericName}. Common training indication: {medication.indication}.
                Control title: {medication.control}.
              </span>
            )}
            {roundComplete ? (
              <button className="rx-primary-button" onClick={onExit}>Finish round</button>
            ) : (
              <button
                className="rx-primary-button"
                onClick={() => { setSelected(null); setIndex((current) => current + 1) }}
              >
                Next question
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
