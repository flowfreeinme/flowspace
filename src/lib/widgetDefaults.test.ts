import { describe, it, expect } from 'vitest'
import { getWidgetSettings } from './homeCenter'
import { DEFAULT_WIDGET_SETTINGS } from './widgetDefaults'

describe('getWidgetSettings', () => {
  it('returns full defaults when widgetSettings is undefined', () => {
    const result = getWidgetSettings('weather', undefined)
    expect(result.unit).toBe('F')
    expect(result.showHumidity).toBe(true)
  })

  it('merges stored partial config over defaults', () => {
    const stored = { unit: 'C' as const }
    const result = getWidgetSettings('weather', { weather: stored })
    expect(result.unit).toBe('C')
    expect(result.showHumidity).toBe(true) // default preserved
  })

  it('returns today defaults with correct greeting', () => {
    const result = getWidgetSettings('today', undefined)
    expect(result.greeting).toBe('Good morning')
    expect(result.showClock).toBe(true)
  })

  it('returns stored config when full config provided', () => {
    const full = { ...DEFAULT_WIDGET_SETTINGS.today, greeting: 'Yo' }
    const result = getWidgetSettings('today', { today: full })
    expect(result.greeting).toBe('Yo')
  })
})
