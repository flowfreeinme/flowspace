import { useRef, useState } from 'react'
import { X, Upload, Chrome, Trash2 } from 'lucide-react'
import { useCalendar } from '@/stores/calendar'
import { useAuth } from '@/stores/auth'
import { buildGoogleCalendarAuthUrl } from '@/lib/googleOAuth'

interface CalendarImportProps {
  onClose: () => void
}

function openGoogleCalendarPopup(clientId: string) {
  const state = crypto.randomUUID()
  const popupName = `flowspace-google-calendar-${state}`
  const popup = window.open('', popupName, 'width=520,height=680,menubar=no,toolbar=no,location=yes,status=no')
  if (!popup) return Promise.reject(new Error('Popup was blocked. Allow popups for Flowspace, then try again.'))
  const authPopup = popup

  authPopup.location.href = buildGoogleCalendarAuthUrl({ clientId, origin: window.location.origin, state, flow: 'code' })

  return new Promise<string>((resolve, reject) => {
    const startedAt = Date.now()
    const timeoutMs = 2 * 60 * 1000

    function cleanup() {
      window.clearInterval(timer)
      window.removeEventListener('message', onMessage)
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== authPopup) return
      const data = event.data as {
        type?: string
        accessToken?: string | null
        code?: string | null
        error?: string | null
        errorDescription?: string | null
        state?: string | null
      }
      if (data?.type !== 'flowspace-google-calendar-oauth') return

      cleanup()
      authPopup.close()

      if (data.state !== state) {
        reject(new Error('Google sign-in returned an invalid state.'))
      } else if (data.error) {
        reject(new Error(data.errorDescription ?? data.error))
      } else if (data.code) {
        resolve(data.code)
      } else if (data.accessToken) {
        resolve(data.accessToken)
      } else {
        reject(new Error('No authorization code returned.'))
      }
    }

    const timer = window.setInterval(() => {
      if (authPopup.closed) {
        cleanup()
        reject(new Error('Google sign-in was closed before finishing.'))
        return
      }

      if (Date.now() - startedAt > timeoutMs) {
        cleanup()
        authPopup.close()
        reject(new Error('Google sign-in timed out.'))
      }
    }, 250)

    window.addEventListener('message', onMessage)
  })
}

export default function CalendarImport({ onClose }: CalendarImportProps) {
  const { user } = useAuth()
  const { importICS, connectGoogle, syncGoogle, disconnectGoogle, clearAll, googleConnected, events } = useCalendar()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const googleClientConfigured = Boolean(googleClientId)

  async function handleGoogleConnect() {
    if (!user) return
    if (!googleClientId) {
      setStatus('Failed to sync: Google Calendar is not configured for this app.')
      return
    }

    setLoading(true)
    setStatus('Opening Google sign-in popup...')

    let authorizationCode: string
    try {
      authorizationCode = await openGoogleCalendarPopup(googleClientId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      setStatus(`Google sign-in failed: ${message}`)
      setLoading(false)
      return
    }

    setStatus('Connecting direct Google Calendar sync...')
    try {
      await connectGoogle(authorizationCode, user.id)
      setStatus('Google Calendar connected. Background sync is enabled.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      setStatus(`Google Calendar sync failed: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSyncNow() {
    if (!user) return
    setLoading(true)
    setStatus('Syncing Google Calendar...')
    try {
      await syncGoogle(user.id)
      setStatus('Google Calendar is up to date.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      setStatus(`Google Calendar sync failed: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleDisconnect() {
    if (!user) return
    if (!confirm('Disconnect Google Calendar and remove synced Google events?')) return
    setLoading(true)
    setStatus('Disconnecting Google Calendar...')
    try {
      await disconnectGoogle(user.id)
      setStatus('Google Calendar disconnected.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      setStatus(`Google Calendar disconnect failed: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setLoading(true)
    setStatus('Importing events…')
    try {
      const text = await file.text()
      await importICS(text, user.id)
      setStatus(`Done! Events imported from ${file.name}`)
    } catch {
      setStatus('Failed to parse file. Make sure it\'s a valid .ics file.')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleClear() {
    if (!user) return
    if (!confirm('Remove all imported calendar events?')) return
    await clearAll(user.id)
    setStatus('All calendar events removed.')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-2 border border-surface-4 rounded-2xl shadow-2xl w-[min(420px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <div>
            <h2 className="font-semibold text-white">Import Calendar</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {events.length > 0 ? `${events.length} events imported` : 'No events yet'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-4 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Google Calendar */}
          <div className="bg-surface-3 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                <Chrome size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Google Calendar</p>
                <p className="text-xs text-gray-500">Direct background sync from your Google account</p>
              </div>
              {googleConnected && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Connected</span>
              )}
            </div>
            <div className="grid gap-2">
              <button
                onClick={handleGoogleConnect}
                disabled={loading || !googleClientConfigured}
                className="w-full py-2 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-800 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
                {loading ? 'Connecting…' : googleConnected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
              </button>
              {googleConnected && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleGoogleSyncNow}
                    disabled={loading}
                    className="py-2 bg-surface-4 hover:bg-surface-0 disabled:opacity-50 text-gray-200 rounded-lg text-sm transition-colors"
                  >
                    Sync now
                  </button>
                  <button
                    onClick={handleGoogleDisconnect}
                    disabled={loading}
                    className="py-2 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-300 rounded-lg text-sm transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
            {!googleClientConfigured && (
              <p className="text-xs text-red-400 mt-2">
                Google Calendar needs a VITE_GOOGLE_CLIENT_ID before it can connect.
              </p>
            )}
          </div>

          {/* ICS file import */}
          <div className="bg-surface-3 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-surface-4 flex items-center justify-center shrink-0">
                <Upload size={16} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Import .ics file</p>
                <p className="text-xs text-gray-500">Works with Google, Apple, Outlook & more</p>
              </div>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="w-full py-2 bg-surface-4 hover:bg-surface-0 disabled:opacity-50 text-gray-200 rounded-lg text-sm transition-colors border border-dashed border-surface-3 hover:border-accent"
            >
              Choose .ics file
            </button>
            <input ref={fileRef} type="file" accept=".ics" className="hidden" onChange={handleFileUpload} />

            <p className="text-xs text-gray-600 mt-2">
              In Google Calendar: Settings → Import & Export → Export
            </p>
          </div>

          {/* Status */}
          {status && (
            <p className={`text-xs px-3 py-2 rounded-lg ${
              status.includes('Failed') ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent'
            }`}>
              {status}
            </p>
          )}

          {/* Clear all */}
          {events.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={12} />
              Remove all imported events
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
