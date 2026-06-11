import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Activity, BadgeCheck, BookOpen, ClipboardList, FileText, ListChecks } from 'lucide-react'
import AuthPage from '@/components/AuthPage'
import RxAccessGate from './RxAccessGate'
import RxFlashcardSession from './RxFlashcardSession'
import RxKnowledgeLibrary from './RxKnowledgeLibrary'
import RxQuizSession from './RxQuizSession'
import { starterMedications } from './medications'
import { createInitialProgress, ensureProgressForMedications, ensureProgressForSigCodes, getOverallMastery } from './mastery'
import { getMasteryTiles, getWeakestPracticeTarget } from './recommendations'
import { loadSavedProgress, saveSavedProgress } from './progressPersistence'
import { sigCodes } from './sigCodes'
import type { Medication, PracticeArea, ProgressState, QuizQuestionType, SigCodeQuestionType, SkillArea } from './types'

type Props = {
  user: User | null
}

type Screen = 'home' | 'quiz' | 'flashcards'
type AccessMode = 'gate' | 'auth' | 'guest'

type SessionConfig = {
  practiceArea: PracticeArea
  questionType: QuizQuestionType
  sigQuestionType: SigCodeQuestionType
}

const medicationIds = starterMedications.map((medication) => medication.id)
const sigCodeIds = sigCodes.map((sigCode) => sigCode.id)
const icons = {
  brandGeneric: BookOpen,
  indications: ClipboardList,
  controlStatus: BadgeCheck,
  sigCodes: FileText,
  mixedReview: Activity,
}

function questionTypeForSkill(skillArea: SkillArea): QuizQuestionType {
  if (skillArea === 'indications') return 'indication'
  if (skillArea === 'controlStatus') return 'control'
  return 'brandToGeneric'
}

function masteryLevel(pct: number): 'novice' | 'learning' | 'proficient' | 'strong' | 'mastered' {
  if (pct >= 90) return 'mastered'
  if (pct >= 75) return 'strong'
  if (pct >= 50) return 'proficient'
  if (pct >= 25) return 'learning'
  return 'novice'
}

function masteryLabel(pct: number): string {
  const level = masteryLevel(pct)
  return level.charAt(0).toUpperCase() + level.slice(1)
}

function createReadyProgress(progress: ProgressState | null) {
  const medicationReady = ensureProgressForMedications(
    progress ?? createInitialProgress(medicationIds, sigCodeIds),
    medicationIds,
  )

  return ensureProgressForSigCodes(medicationReady, sigCodeIds)
}

function ReviewQueue({
  knowledgeOpen,
  medications,
  onToggleKnowledge,
  progress,
}: {
  knowledgeOpen: boolean
  medications: Medication[]
  onToggleKnowledge: () => void
  progress: ProgressState
}) {
  const weakest = medications
    .map((medication) => {
      const medProgress = progress.medications[medication.id]
      const confidence = Math.min(
        medProgress.brandGeneric.confidence,
        medProgress.indications.confidence,
        medProgress.controlStatus.confidence,
      )
      return { medication, confidence }
    })
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 8)

  return (
    <section className="rx-panel">
      <div className="rx-section-heading rx-review-heading">
        <div>
          <p className="rx-eyebrow">Review queue</p>
          <h2>Medications to revisit</h2>
        </div>
        <button
          aria-expanded={knowledgeOpen}
          className="rx-ghost-button rx-review-action"
          onClick={onToggleKnowledge}
        >
          <ListChecks size={17} aria-hidden="true" />
          {knowledgeOpen ? 'Hide testable knowledge' : 'View all testable knowledge'}
        </button>
      </div>
      <div className="rx-review-list">
        {weakest.map(({ medication, confidence }) => (
          <div className="rx-review-row" key={medication.id}>
            <div>
              <strong>{medication.brandName}</strong>
              <span>{medication.genericName}</span>
            </div>
            <span className={`rx-control-pill rx-control-${medication.control.toLowerCase().replace(/-/g, '')}`}>
              {medication.control}
            </span>
            <small>{confidence}%</small>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function RxMasteryPage({ user }: Props) {
  const [accessMode, setAccessMode] = useState<AccessMode>('gate')
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [showKnowledgeLibrary, setShowKnowledgeLibrary] = useState(false)
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    practiceArea: 'brandGeneric',
    questionType: 'brandToGeneric',
    sigQuestionType: 'sigToMeaning',
  })

  useEffect(() => {
    if (!user) return
    setAccessMode('auth')
    setLoadingProgress(true)
    loadSavedProgress(user.id)
      .then((saved) => setProgress(createReadyProgress(saved)))
      .catch(() => setProgress(createReadyProgress(null)))
      .finally(() => setLoadingProgress(false))
  }, [user?.id])

  const startGuest = () => {
    setAccessMode('guest')
    setProgress(createReadyProgress(null))
  }

  const signedIn = Boolean(user)
  const progressMode = signedIn ? 'saved' : 'guest'
  const readyProgress = progress
  const recommended = useMemo(
    () => readyProgress ? getWeakestPracticeTarget(readyProgress) : null,
    [readyProgress],
  )

  const startSession = (practiceArea: PracticeArea, nextScreen: Screen) => {
    setSessionConfig({
      practiceArea,
      questionType: practiceArea === 'sigCodes' ? 'brandToGeneric' : questionTypeForSkill(practiceArea),
      sigQuestionType: 'sigToMeaning',
    })
    setScreen(nextScreen)
  }

  const updateProgress = (next: ProgressState) => {
    setProgress(next)
    setSaveMessage(null)
    if (!user) return
    saveSavedProgress(user.id, next).then((message) => {
      setSaveMessage(message ? `Save issue: ${message}` : 'Progress saved to your Flowspace profile.')
    })
  }

  if (!user && accessMode === 'gate') {
    return <RxAccessGate onAuth={() => setAccessMode('auth')} onGuest={startGuest} />
  }

  if (!user && accessMode === 'auth') {
    return (
      <div className="rx-auth-shell">
        <button className="rx-auth-back" onClick={() => setAccessMode('gate')}>Back to Rx Mastery</button>
        <AuthPage />
      </div>
    )
  }

  if (loadingProgress || !readyProgress || !recommended) {
    return <div className="rx-page rx-loading">Loading Rx Mastery…</div>
  }

  return (
    <main className="rx-page">
      <section className="rx-hero-band">
        <div>
          <p className="rx-eyebrow">Hidden Flowspace trainer</p>
          <h1>Rx Mastery</h1>
          <p className="rx-hero-copy">
            Practice common brand names, generics, indications, control titles, and SIG codes in short focused rounds.
          </p>
          <p className={`rx-save-status rx-save-status-${progressMode}`}>
            {signedIn
              ? `Signed in as ${user?.email ?? 'Flowspace user'}. Progress saves to your Flowspace profile.`
              : 'Guest mode. Progress is not saved and will reset if this page reloads.'}
          </p>
          {saveMessage && <p className="rx-save-message">{saveMessage}</p>}
        </div>
        <div className="rx-hero-stat">
          <span>{getOverallMastery(readyProgress)}%</span>
          <small>Recommended: {recommended.label}</small>
        </div>
      </section>

      {screen === 'quiz' && (
        <RxQuizSession
          medications={starterMedications}
          sigCodes={sigCodes}
          progress={readyProgress}
          practiceArea={sessionConfig.practiceArea}
          questionType={sessionConfig.questionType}
          sigQuestionType={sessionConfig.sigQuestionType}
          onProgress={updateProgress}
          onExit={() => setScreen('home')}
        />
      )}

      {screen === 'flashcards' && (
        <RxFlashcardSession
          medications={starterMedications}
          sigCodes={sigCodes}
          progress={readyProgress}
          practiceArea={sessionConfig.practiceArea}
          onProgress={updateProgress}
          onExit={() => setScreen('home')}
        />
      )}

      {screen === 'home' && (
        <>
          <section className="rx-panel" aria-labelledby="rx-mastery-title">
            <div className="rx-section-heading">
              <p className="rx-eyebrow">Mastery map</p>
              <h2 id="rx-mastery-title">Choose what needs work</h2>
            </div>
            <div className="rx-tile-grid">
              {getMasteryTiles(readyProgress).map((tile) => {
                const Icon = icons[tile.skillArea]
                return (
                  <article className="rx-mastery-tile" data-practice-area={tile.skillArea} key={tile.skillArea}>
                    <span className="rx-tile-icon" aria-hidden="true"><Icon size={20} /></span>
                    <strong>{tile.label}</strong>
                    <span>{tile.description}</span>
                    <div className="rx-tile-bar-track">
                      <div className="rx-tile-bar-fill" style={{ width: `${tile.mastery}%` }} data-level={masteryLevel(tile.mastery)} />
                    </div>
                    <div className="rx-tile-bar-meta">
                      <span className="rx-tile-pct">{tile.mastery}%</span>
                      <span className="rx-tile-level" data-level={masteryLevel(tile.mastery)}>{masteryLabel(tile.mastery)}</span>
                    </div>
                    <span className="rx-tile-actions">
                      <button className="rx-tile-action" onClick={() => startSession(tile.skillArea, 'quiz')}>Quiz</button>
                      <button className="rx-tile-action rx-tile-action-secondary" onClick={() => startSession(tile.skillArea, 'flashcards')}>Cards</button>
                    </span>
                  </article>
                )
              })}
            </div>
          </section>
          <ReviewQueue
            knowledgeOpen={showKnowledgeLibrary}
            medications={starterMedications}
            onToggleKnowledge={() => setShowKnowledgeLibrary((current) => !current)}
            progress={readyProgress}
          />
          {showKnowledgeLibrary && <RxKnowledgeLibrary medications={starterMedications} sigCodes={sigCodes} />}
          <section className="rx-notice">
            <strong>Training note</strong>
            <span>
              Rx Mastery is an educational practice tool. Use current references, prescription labels, pharmacist
              guidance, and store policy for real pharmacy work.
            </span>
          </section>
        </>
      )}
    </main>
  )
}
