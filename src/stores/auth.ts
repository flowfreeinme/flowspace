import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from './workspace'

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  mfaFactorId: string | null
  mfaChallengeId: string | null
  init: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  verifyMfa: (code: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  mfaFactorId: null,
  mfaChallengeId: null,

  async init() {
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, user: data.session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      const prevUser = get().user
      set({ session, user: session?.user ?? null })
      if (!session) {
        useWorkspace.getState().reset()
      } else if (!prevUser) {
        // Session restored after being null (token refresh / delayed init on mobile)
        // Force a fresh workspace load so stale/default data is replaced
        useWorkspace.getState().reset()
      }
    })
  },

  async signUp(email, password, name) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.href,
      },
    })
    return error?.message ?? null
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error?.message?.toLowerCase().includes('email not confirmed')) {
      return 'Please confirm your email before signing in. Check your inbox for a confirmation link.'
    }
    if (error) return error.message

    // Check if MFA is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (totp) {
        const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
        if (cErr || !challenge) return cErr?.message ?? 'MFA challenge failed'
        set({ mfaFactorId: totp.id, mfaChallengeId: challenge.id })
        return 'mfa_required'
      }
    }
    return null
  },

  async verifyMfa(code) {
    const { mfaFactorId, mfaChallengeId } = get()
    if (!mfaFactorId || !mfaChallengeId) return 'No MFA challenge active'
    const { error } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code })
    if (error) return 'Incorrect code. Please try again.'
    set({ mfaFactorId: null, mfaChallengeId: null })
    return null
  },

  async signOut() {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
