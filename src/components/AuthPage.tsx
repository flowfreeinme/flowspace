import { useState } from 'react'
import { useAuth } from '@/stores/auth'
import { Check, ShieldCheck } from 'lucide-react'

type Mode = 'signin' | 'signup'

const PERKS = [
  'Unlimited boards, cards & sections',
  'Real-time collaboration & presence',
  'Built-in calendar with Google sync',
  'File attachments & freehand drawing',
  'Live notifications — no refresh needed',
  'AI-powered workspace — coming soon',
]

export default function AuthPage() {
  const { signIn, signUp, verifyMfa } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const err = await signUp(email, password, name)
      if (err) { setError(err); setLoading(false) }
      else setConfirm(true)
    } else {
      const err = await signIn(email, password)
      if (err === 'mfa_required') { setMfaStep(true); setLoading(false) }
      else if (err) { setError(err); setLoading(false) }
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await verifyMfa(mfaCode)
    if (err) { setError(err); setLoading(false) }
  }

  if (confirm) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5 text-3xl">📬</div>
          <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Click it to activate your account, then come back and sign in.
          </p>
          <button
            onClick={() => { setConfirm(false); setMode('signin') }}
            className="mt-6 text-accent hover:text-accent-hover text-sm transition-colors"
          >
            Back to sign in →
          </button>
        </div>
      </div>
    )
  }

  if (mfaStep) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-surface-3 bg-surface-1 shadow-2xl">
          <div className="border-b border-surface-3 px-6 py-5 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl font-bold text-white">Two-factor authentication</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <form onSubmit={handleMfaVerify} className="space-y-4">
          <div className="p-6 space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              className="w-full rounded-xl border border-surface-4 bg-surface-2 px-3 py-3 text-center font-mono text-2xl tracking-[0.35em] text-white outline-none transition-colors placeholder-gray-700 focus:border-accent"
            />
            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={loading || mfaCode.length !== 6}
              className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setMfaStep(false); setMfaCode(''); setError(null) }}
              className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Back to sign in
            </button>
          </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-0 flex">

      {/* Left panel — brand & perks (hidden on small screens) */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-surface-1 border-r border-surface-3 p-12">
        <div>
          <span className="text-2xl font-bold text-white tracking-tight">✦ FlowSpace</span>
          <h2 className="mt-12 text-3xl font-bold text-white leading-snug tracking-tight">
            Think visually.<br />Work together.
          </h2>
          <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-xs">
            A workspace that keeps up with how you actually think — freeform boards, real-time collaboration, and an AI that understands your work.
          </p>
          <ul className="mt-10 space-y-3.5">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-5 h-5 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                  <Check size={11} className="text-accent" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-gray-700">© {new Date().getFullYear()} FlowSpace · flowspaced.com</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">

        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-10">
          <span className="text-2xl font-bold text-white tracking-tight">✦ FlowSpace</span>
          <p className="text-gray-500 text-sm mt-1">Think visually. Work together.</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'signup'
                ? 'Your workspace is ready to build the moment you sign up.'
                : 'Sign in to pick up right where you left off.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-surface-2 rounded-xl p-1 mb-6 border border-surface-3">
            {(['signin', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === m ? 'bg-accent text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full bg-surface-2 border border-surface-4 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-surface-2 border border-surface-4 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                minLength={6}
                className="w-full bg-surface-2 border border-surface-4 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent/20 mt-1"
            >
              {loading
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign in to FlowSpace'
                  : 'Create my workspace →'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-[11px] text-gray-700 mt-4 text-center leading-relaxed">
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>

        {/* Mobile perks */}
        <div className="lg:hidden mt-10 w-full max-w-sm">
          <p className="text-xs text-gray-600 text-center mb-4 uppercase tracking-widest font-semibold">What's included</p>
          <div className="grid grid-cols-2 gap-2">
            {PERKS.slice(0, 4).map(p => (
              <div key={p} className="flex items-start gap-2 bg-surface-1 border border-surface-3 rounded-xl px-3 py-2.5">
                <Check size={11} className="text-accent mt-0.5 shrink-0" />
                <span className="text-[11px] text-gray-400 leading-tight">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
