import { LogIn, UserRound } from 'lucide-react'

type Props = {
  onAuth: () => void
  onGuest: () => void
}

export default function RxAccessGate({ onAuth, onGuest }: Props) {
  return (
    <main className="rx-page">
      <section className="rx-gate">
        <p className="rx-eyebrow">Hidden Flowspace trainer</p>
        <h1>Rx Mastery</h1>
        <p>
          Practice common brand/generic names, indications, and control titles. Choose how you want to play before
          the round starts.
        </p>
        <div className="rx-gate-actions">
          <button className="rx-choice-card" onClick={onAuth}>
            <span className="rx-choice-icon" aria-hidden="true"><LogIn size={22} /></span>
            <strong>Log in or create account</strong>
            <small>Create or use a Flowspace profile so Rx Mastery progress can be saved.</small>
          </button>
          <button className="rx-choice-card rx-choice-card-muted" onClick={onGuest}>
            <span className="rx-choice-icon" aria-hidden="true"><UserRound size={22} /></span>
            <strong>Continue as guest</strong>
            <small>Play immediately. Progress is not saved and resets if you reload or close the page.</small>
          </button>
        </div>
      </section>
    </main>
  )
}
