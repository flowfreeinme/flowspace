import { useEffect, useRef } from 'react'
import { useFocusTimer } from '@/stores/focusTimer'
import { useNotifications } from '@/stores/notifications'

type WindowWithLegacyAudio = Window & {
  webkitAudioContext?: typeof AudioContext
}

function createAudioContext() {
  const AudioContextCtor = window.AudioContext ?? (window as WindowWithLegacyAudio).webkitAudioContext
  return AudioContextCtor ? new AudioContextCtor() : null
}

export default function FocusTimerAlarm() {
  const { alarmActive, tick } = useFocusTimer()
  const addToast = useNotifications(s => s.add)
  const dismissToast = useNotifications(s => s.dismiss)
  const notifiedRef = useRef(false)
  const timerToastIdRef = useRef<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const alarmIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => tick(), 500)
    return () => window.clearInterval(id)
  }, [tick])

  useEffect(() => {
    function stopAlarmSound() {
      if (alarmIntervalRef.current) {
        window.clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }

    function playAlarmBeep() {
      const audioContext = audioContextRef.current ?? createAudioContext()
      if (!audioContext) return
      audioContextRef.current = audioContext
      audioContext.resume().catch(() => {})

      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.34)
    }

    if (!alarmActive) {
      notifiedRef.current = false
      if (timerToastIdRef.current) {
        dismissToast(timerToastIdRef.current)
        timerToastIdRef.current = null
      }
      stopAlarmSound()
      return
    }

    if (!notifiedRef.current) {
      notifiedRef.current = true
      timerToastIdRef.current = addToast({
        type: 'success',
        message: 'Timer is up.',
        sub: 'Open the timer and click Stop alarm to silence it.',
        durationMs: null,
      })
    }

    playAlarmBeep()
    alarmIntervalRef.current = window.setInterval(playAlarmBeep, 1300)
    return stopAlarmSound
  }, [addToast, alarmActive, dismissToast])

  return null
}
