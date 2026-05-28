import { useState, useEffect } from 'react'
import { X, Shield, ShieldCheck, Copy, Check, Smartphone, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/auth'

type Tab = 'profile' | 'security'

interface TotpEnrollData {
  factorId: string
  qrCode: string
  secret: string
}

export default function AccountSettingsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('security')
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null)
  const [enrollData, setEnrollData] = useState<TotpEnrollData | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [loadingFactors, setLoadingFactors] = useState(true)

  useEffect(() => {
    async function loadFactors() {
      const { data } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.find(f => f.status === 'verified')
      if (totp) { setTotpEnabled(true); setTotpFactorId(totp.id) }
      setLoadingFactors(false)
    }
    loadFactors()
  }, [])

  async function startEnroll() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'FlowSpace', friendlyName: 'Authenticator' })
    if (error || !data) { setError(error?.message ?? 'Failed to start enrollment'); setLoading(false); return }
    setEnrollData({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    setLoading(false)
  }

  async function verifyEnroll() {
    if (!enrollData || verifyCode.length !== 6) return
    setLoading(true)
    setError('')
    const { data: challengeData, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId })
    if (cErr || !challengeData) { setError(cErr?.message ?? 'Challenge failed'); setLoading(false); return }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enrollData.factorId, challengeId: challengeData.id, code: verifyCode })
    if (vErr) { setError('Incorrect code. Try again.'); setLoading(false); return }
    setTotpEnabled(true)
    setTotpFactorId(enrollData.factorId)
    setEnrollData(null)
    setVerifyCode('')
    setSuccess('Two-factor authentication is now active.')
    setLoading(false)
  }

  async function disableTotp() {
    if (!totpFactorId || !confirm('Disable two-factor authentication? Your account will only be protected by your password.')) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactorId })
    if (error) { setError(error.message); setLoading(false); return }
    setTotpEnabled(false)
    setTotpFactorId(null)
    setSuccess('Two-factor authentication has been disabled.')
    setLoading(false)
  }

  function copySecret() {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-[min(560px,calc(100vw-32px))] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <h2 className="font-semibold text-white">Account settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-4 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-3">
          {(['profile', 'security'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                tab === t ? 'text-white border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="px-5 py-5 max-h-[70vh] overflow-y-auto">

          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <p className="text-sm text-gray-200 bg-surface-3 rounded-lg px-3 py-2">
                  {(user?.user_metadata?.full_name as string) || '—'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <p className="text-sm text-gray-200 bg-surface-3 rounded-lg px-3 py-2">{user?.email}</p>
              </div>
              <p className="text-xs text-gray-600">Profile editing coming soon.</p>
            </div>
          )}

          {/* Security tab */}
          {tab === 'security' && (
            <div className="space-y-5">
              {success && (
                <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{success}</p>
              )}
              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="rounded-2xl border border-surface-4 bg-surface-3/70 overflow-hidden">
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      totpEnabled ? 'border-green-500/25 bg-green-500/10 text-green-400' : 'border-surface-4 bg-surface-2 text-gray-500'
                    }`}>
                      {totpEnabled ? <ShieldCheck size={19} /> : <Shield size={19} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">Two-factor authentication</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          totpEnabled ? 'bg-green-500/15 text-green-400' : 'bg-surface-2 text-gray-500'
                        }`}>
                          {totpEnabled ? 'Active' : 'Off'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">
                        {totpEnabled
                          ? 'Your account requires a 6-digit authenticator code when signing in.'
                          : 'Use an authenticator app for a stronger sign-in check.'}
                      </p>
                    </div>
                  </div>
                  {!loadingFactors && !enrollData && (
                    totpEnabled
                      ? <button onClick={disableTotp} disabled={loading}
                          className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition-colors hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50">
                          Disable
                        </button>
                      : <button onClick={startEnroll} disabled={loading}
                          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                          {loading ? 'Loading…' : 'Enable 2FA'}
                        </button>
                  )}
                </div>

                {enrollData && (
                  <div className="border-t border-surface-4 bg-surface-2/35 p-4">
                    <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                      <div className="rounded-2xl border border-surface-4 bg-surface-2 p-3">
                        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-300">
                          <Smartphone size={14} className="text-accent" />
                          Scan with your app
                        </div>
                        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl bg-white p-3 shadow-inner">
                          <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollData.qrCode)}`} className="h-40 w-40" alt="TOTP QR code" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-2xl border border-surface-4 bg-surface-2 p-3">
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-300">
                            <KeyRound size={14} className="text-accent" />
                            Manual setup key
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-surface-1 px-3 py-2">
                            <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-gray-300">{enrollData.secret}</code>
                            <button
                              onClick={copySecret}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-surface-3 hover:text-white"
                              title="Copy setup key"
                            >
                              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-surface-4 bg-surface-2 p-3">
                          <p className="mb-2 text-xs font-medium text-gray-300">Verify the code</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={verifyCode}
                              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="000000"
                              className="min-w-0 flex-1 rounded-xl border border-surface-4 bg-surface-1 px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-white outline-none transition-colors placeholder-gray-700 focus:border-accent"
                              onKeyDown={e => { if (e.key === 'Enter') verifyEnroll() }}
                            />
                            <button onClick={verifyEnroll} disabled={loading || verifyCode.length !== 6}
                              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                              {loading ? '…' : 'Verify'}
                            </button>
                          </div>
                        </div>

                        <button onClick={() => { setEnrollData(null); setVerifyCode('') }}
                          className="text-xs text-gray-600 transition-colors hover:text-gray-400">
                          Cancel setup
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
