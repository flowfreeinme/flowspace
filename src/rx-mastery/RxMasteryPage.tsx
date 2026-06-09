import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Activity, BadgeCheck, BookOpen, ClipboardList } from 'lucide-react'
import AuthPage from '@/components/AuthPage'
import RxAccessGate from './RxAccessGate'
import RxFlashcardSession from './RxFlashcardSession'
import RxQuizSession from './RxQuizSession'
import { starterMedications } from './medications'
import { createInitialProgress, ensureProgressForMedications, getOverallMastery } from './mastery'
import { getMasteryTiles, getWeakestPracticeTarget } from './recommendations'
import { loadSavedProgress, saveSavedProgress } from './progressPersistence'
import type { Medication, ProgressState, QuizQuestionType, SkillArea } from './types'

type Props = {
  user: User | null
}

type Screen = 'home' | 'quiz' | 'flashcards'
type AccessMode = 'gate' | 'auth' | 'guest'

type SessionConfig = {
  skillArea: SkillArea
  questionType: QuizQuestionType
}

const medicationIds = starterMedications.map((medication) => medication.id)
const icons = {
  brandGeneric: BookOpen,
  indications: ClipboardList,
  controlStatus: BadgeCheck,
  mixedReview: Activity,
}

function questionTypeForSkill(skillArea: SkillArea): QuizQuestionType {
  if (skillArea === 'indications') return 'indication'
  if (skillArea === 'controlStatus') return 'control'
  return 'brandToGeneric'
}

function createReadyProgress(progress: ProgressState | null) {
  return ensureProgressForMedications(progress ?? createInitialProgress(medicationIds), medicationIds)
}

function ReviewQueue({ medications, progress }: { medications: Medication[]; progress: ProgressState }) {
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
      <div className="rx-section-heading">
        <p className="rx-eyebrow">Review queue</p>
        <h2>Medications to revisit</h2>
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
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    skillArea: 'brandGeneric',
    questionType: 'brandToGeneric',
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

  const startSession = (skillArea: SkillArea, nextScreen: Screen) => {
    setSessionConfig({ skillArea, questionType: questionTypeForSkill(skillArea) })
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
            Practice common brand names, generics, indications, and control titles in short focused rounds.
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
          progress={readyProgress}
          skillArea={sessionConfig.skillArea}
          questionType={sessionConfig.questionType}
          onProgress={updateProgress}
          onExit={() => setScreen('home')}
        />
      )}

      {screen === 'flashcards' && (
        <RxFlashcardSession
          medications={starterMedications}
          progress={readyProgress}
          skillArea={sessionConfig.skillArea}
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
                  <article className="rx-mastery-tile" key={tile.skillArea}>
                    <span className="rx-tile-icon" aria-hidden="true"><Icon size={20} /></span>
                    <strong>{tile.label}</strong>
                    <span>{tile.description}</span>
                    <meter min="0" max="100" value={tile.mastery} />
                    <small>{tile.mastery}% mastery</small>
                    <span className="rx-tile-actions">
                      <button className="rx-tile-action" onClick={() => startSession(tile.skillArea, 'quiz')}>Quiz</button>
                      <button className="rx-tile-action rx-tile-action-secondary" onClick={() => startSession(tile.skillArea, 'flashcards')}>Cards</button>
                    </span>
                  </article>
                )
              })}
            </div>
          </section>
          <ReviewQueue medications={starterMedications} progress={readyProgress} />
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
