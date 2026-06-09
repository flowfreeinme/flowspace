import { useMemo, useState } from 'react'
import { recordAnswer } from './mastery'
import { createQuestion } from './questions'
import type { Medication, ProgressState, QuizQuestionType, SkillArea } from './types'

type Props = {
  medications: Medication[]
  progress: ProgressState
  skillArea: SkillArea
  questionType: QuizQuestionType
  onProgress: (progress: ProgressState) => void
  onExit: () => void
}

const ROUND_LENGTH = 10

function questionTypeForMixedReview(index: number): QuizQuestionType {
  if (index % 3 === 0) return 'control'
  if (index % 3 === 1) return 'indication'
  return index % 2 === 0 ? 'brandToGeneric' : 'genericToBrand'
}

export default function RxQuizSession({ medications, progress, skillArea, questionType, onProgress, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const medication = medications[index % medications.length]
  const activeType = skillArea === 'mixedReview' ? questionTypeForMixedReview(index) : questionType
  const question = useMemo(() => createQuestion(medication, medications, activeType), [activeType, medication, medications])
  const isAnswered = selected !== null
  const roundComplete = index >= ROUND_LENGTH - 1

  const choose = (choice: string) => {
    if (isAnswered) return
    const correct = choice === question.correctAnswer
    setSelected(choice)
    setScore((current) => current + (correct ? 1 : 0))
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
        <p className="rx-eyebrow">{question.skillArea === 'controlStatus' ? 'Control status' : question.skillArea}</p>
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
            <span>
              {medication.brandName} is {medication.genericName}. Common training indication: {medication.indication}.
              Control title: {medication.control}.
            </span>
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
