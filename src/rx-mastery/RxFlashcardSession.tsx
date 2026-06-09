import { useState } from 'react'
import { recordAnswer, recordSigAnswer } from './mastery'
import type { Medication, ProgressState, SigCode, SkillArea, PracticeArea } from './types'

type Props = {
  medications: Medication[]
  sigCodes: SigCode[]
  progress: ProgressState
  practiceArea: PracticeArea
  onProgress: (progress: ProgressState) => void
  onExit: () => void
}

function skillForFlashcard(skillArea: SkillArea): 'brandGeneric' | 'indications' | 'controlStatus' {
  if (skillArea === 'indications') return 'indications'
  if (skillArea === 'controlStatus') return 'controlStatus'
  return 'brandGeneric'
}

function promptForSkill(skillArea: ReturnType<typeof skillForFlashcard>) {
  if (skillArea === 'indications') return 'Recall the common training indication'
  if (skillArea === 'controlStatus') return 'Recall the control title'
  return 'Recall the generic name'
}

export default function RxFlashcardSession({ medications, sigCodes, progress, practiceArea, onProgress, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const medication = medications[index % medications.length]
  const sigCode = sigCodes[index % sigCodes.length]
  const isSigSession = practiceArea === 'sigCodes'
  const activeSkill = isSigSession ? 'brandGeneric' : skillForFlashcard(practiceArea as SkillArea)

  const grade = (correct: boolean) => {
    if (isSigSession) {
      onProgress(recordSigAnswer(progress, {
        sigCodeId: sigCode.id,
        correct,
        mode: 'flashcard',
        answeredAt: new Date().toISOString(),
      }))
      setFlipped(false)
      setIndex((current) => current + 1)
      return
    }

    onProgress(recordAnswer(progress, {
      medicationId: medication.id,
      skillArea: activeSkill,
      correct,
      mode: 'flashcard',
      answeredAt: new Date().toISOString(),
    }))
    setFlipped(false)
    setIndex((current) => current + 1)
  }

  return (
    <section className="rx-session-panel">
      <div className="rx-session-topbar">
        <button className="rx-ghost-button" onClick={onExit}>Back</button>
        <span>Flashcard {index + 1}</span>
      </div>
      <button className={`rx-flashcard ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped((value) => !value)}>
        {isSigSession && !flipped ? (
          <>
            <span className="rx-eyebrow">SIG code</span>
            <strong className="rx-sig-code">{sigCode.code}</strong>
            <small>Recall the meaning</small>
          </>
        ) : isSigSession ? (
          <>
            <span>{sigCode.meaning}</span>
            <strong>{sigCode.category}</strong>
            <small>{sigCode.code}</small>
          </>
        ) : !flipped ? (
          <>
            <span className="rx-eyebrow">Tap to reveal</span>
            <strong>{medication.brandName}</strong>
            <small>{promptForSkill(activeSkill)}</small>
          </>
        ) : (
          <>
            <span>{medication.genericName}</span>
            <strong>{medication.indication}</strong>
            <small>{medication.control}</small>
          </>
        )}
      </button>
      {flipped && (
        <div className="rx-grade-actions">
          <button className="rx-ghost-button" onClick={() => grade(false)}>Missed it</button>
          <button className="rx-primary-button" onClick={() => grade(true)}>Knew it</button>
        </div>
      )}
    </section>
  )
}
