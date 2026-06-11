import { useMemo, useState } from 'react'
import { recordAnswer, recordSigAnswer } from './mastery'
import { createQuestion, createSigCodeQuestion } from './questions'
import { createMissedQuestionReview, createRoundReviewSummary, type MissedQuestionReplay, type MissedQuestionReview } from './quizReview'
import type { Medication, PracticeArea, ProgressState, QuizQuestion, QuizQuestionType, SigCode, SigCodeQuestion, SigCodeQuestionType } from './types'

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

type ActiveQuestion = {
  question: QuizQuestion | SigCodeQuestion
  explanation: string
  replay: MissedQuestionReplay
}

type QuizScreen = 'question' | 'summary'

function questionTypeForMixedReview(index: number): QuizQuestionType {
  if (index % 3 === 0) return 'control'
  if (index % 3 === 1) return 'indication'
  return index % 2 === 0 ? 'brandToGeneric' : 'genericToBrand'
}

function sigQuestionTypeForRound(index: number, preferredType: SigCodeQuestionType): SigCodeQuestionType {
  if (index === 0) return preferredType
  return index % 2 === 0 ? 'sigToMeaning' : 'meaningToSig'
}

function medicationExplanation(medication: Medication) {
  return `${medication.brandName} is ${medication.genericName}. Common training indication: ${medication.indication}. Control title: ${medication.control}.`
}

function sigCodeExplanation(sigCode: SigCode) {
  return `${sigCode.code} means ${sigCode.meaning}. Category: ${sigCode.category}.`
}

function createMedicationActiveQuestion(
  medication: Medication,
  medications: Medication[],
  questionType: QuizQuestionType,
): ActiveQuestion {
  const question = createQuestion(medication, medications, questionType)

  return {
    question,
    explanation: medicationExplanation(medication),
    replay: {
      kind: 'medication',
      itemId: medication.id,
      questionType,
    },
  }
}

function createSigActiveQuestion(
  sigCode: SigCode,
  sigCodes: SigCode[],
  questionType: SigCodeQuestionType,
): ActiveQuestion {
  const question = createSigCodeQuestion(sigCode, sigCodes, questionType)

  return {
    question,
    explanation: sigCodeExplanation(sigCode),
    replay: {
      kind: 'sigCode',
      itemId: sigCode.id,
      questionType,
    },
  }
}

function createReviewActiveQuestion(
  missed: MissedQuestionReview,
  medications: Medication[],
  sigCodes: SigCode[],
): ActiveQuestion {
  if (missed.replay.kind === 'sigCode') {
    const sigCode = sigCodes.find((candidate) => candidate.id === missed.replay.itemId) ?? sigCodes[0]
    return createSigActiveQuestion(sigCode, sigCodes, missed.replay.questionType)
  }

  const medication = medications.find((candidate) => candidate.id === missed.replay.itemId) ?? medications[0]
  return createMedicationActiveQuestion(medication, medications, missed.replay.questionType)
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
  const [screen, setScreen] = useState<QuizScreen>('question')
  const [missedQuestions, setMissedQuestions] = useState<MissedQuestionReview[]>([])
  const [reviewDeck, setReviewDeck] = useState<MissedQuestionReview[]>([])
  const medication = medications[index % medications.length]
  const sigCode = sigCodes[index % sigCodes.length]
  const reviewingMisses = reviewDeck.length > 0
  const activeRoundTotal = reviewingMisses ? reviewDeck.length : ROUND_LENGTH
  const currentReviewItem = reviewingMisses ? reviewDeck[index] : null
  const activeType = practiceArea === 'mixedReview' ? questionTypeForMixedReview(index) : questionType
  const activeSigType = sigQuestionTypeForRound(index, sigQuestionType)
  const activeQuestion = useMemo(() => {
    if (currentReviewItem) return createReviewActiveQuestion(currentReviewItem, medications, sigCodes)
    if (practiceArea === 'sigCodes') return createSigActiveQuestion(sigCode, sigCodes, activeSigType)
    return createMedicationActiveQuestion(medication, medications, activeType)
  }, [activeSigType, activeType, currentReviewItem, medication, medications, practiceArea, sigCode, sigCodes])
  const question = activeQuestion.question
  const summary = useMemo(
    () => createRoundReviewSummary({ score, total: activeRoundTotal, missed: missedQuestions }),
    [activeRoundTotal, missedQuestions, score],
  )
  const isAnswered = selected !== null
  const roundComplete = index >= activeRoundTotal - 1

  const choose = (choice: string) => {
    if (isAnswered) return
    const correct = choice === question.correctAnswer
    setSelected(choice)
    setScore((current) => current + (correct ? 1 : 0))
    if (!correct) {
      setMissedQuestions((current) => [
        ...current,
        createMissedQuestionReview({
          id: `${question.id}-${reviewingMisses ? 'review' : 'round'}-${index}-${current.length}`,
          prompt: question.prompt,
          selectedAnswer: choice,
          correctAnswer: question.correctAnswer,
          explanation: activeQuestion.explanation,
          replay: activeQuestion.replay,
        }),
      ])
    }

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

  const moveNext = () => {
    setSelected(null)
    setIndex((current) => current + 1)
  }

  const showSummary = () => {
    setSelected(null)
    setScreen('summary')
  }

  const reviewMissed = () => {
    setReviewDeck(summary.missed)
    setMissedQuestions([])
    setScore(0)
    setIndex(0)
    setSelected(null)
    setScreen('question')
  }

  if (screen === 'summary') {
    const ringCircumference = 163.4
    const ringOffset = (1 - summary.score / summary.total) * ringCircumference

    return (
      <section className="rx-session-panel">
        <div className="rx-session-topbar">
          <button className="rx-ghost-button" onClick={onExit}>Back</button>
          <span>{reviewingMisses ? 'Missed review summary' : 'Round summary'}</span>
        </div>
        <div className="rx-review-summary-card">
          <div className="rx-score-hero">
            <div className="rx-score-ring">
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,252,0.15)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26" fill="none"
                  stroke="#e8a245" strokeWidth="6"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="rx-score-ring-num">{summary.score}</div>
            </div>
            <div>
              <p className="rx-score-hero-eyebrow">
                {reviewingMisses ? 'Missed review' : summary.perfect ? 'Perfect round' : 'Round complete'}
              </p>
              <p className="rx-score-hero-label">{summary.score} / {summary.total} correct</p>
              <p className="rx-score-hero-sub">
                {summary.perfect
                  ? 'No missed questions — great work!'
                  : `${summary.missedCount} ${summary.missedCount === 1 ? 'question needs' : 'questions need'} another look`}
              </p>
            </div>
          </div>

          {summary.missed.length > 0 && (
            <div className="rx-missed-list">
              {summary.missed.map((missed) => (
                <article className="rx-missed-row" key={missed.id}>
                  <strong>{missed.prompt}</strong>
                  <div className="rx-missed-answers">
                    <div className="rx-answer-chip rx-answer-wrong">
                      <span className="rx-chip-label">Your answer</span>
                      <span className="rx-chip-value">{missed.selectedAnswer}</span>
                    </div>
                    <div className="rx-answer-chip rx-answer-right">
                      <span className="rx-chip-label">Correct</span>
                      <span className="rx-chip-value">{missed.correctAnswer}</span>
                    </div>
                  </div>
                  <span>{missed.explanation}</span>
                </article>
              ))}
            </div>
          )}

          <div className="rx-review-summary-actions">
            {summary.canReviewMissed && (
              <button className="rx-primary-button" onClick={reviewMissed}>Review Missed ({summary.missedCount})</button>
            )}
            <button className="rx-ghost-button" onClick={onExit}>Finish Round</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rx-session-panel">
      <div className="rx-quiz-progress-track">
        <div className="rx-quiz-progress-fill" style={{ width: `${(index / activeRoundTotal) * 100}%` }} />
      </div>
      <div className="rx-session-topbar">
        <button className="rx-ghost-button" onClick={onExit}>Back</button>
        <span>{reviewingMisses ? 'Missed review' : 'Question'} {index + 1} of {activeRoundTotal}</span>
        <span className="rx-score-pill">{score} ✓</span>
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
            <span>{activeQuestion.explanation}</span>
            {roundComplete ? (
              <button className="rx-primary-button" onClick={showSummary}>View summary</button>
            ) : (
              <button className="rx-primary-button" onClick={moveNext}>
                Next question
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
