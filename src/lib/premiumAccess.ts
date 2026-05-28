const PREMIUM_EMAILS = (import.meta.env.VITE_AI_ALLOWED_EMAILS ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)

export function isPremiumUser(email: string | undefined): boolean {
  return PREMIUM_EMAILS.includes(email?.toLowerCase() ?? '')
}
