import { describe, expect, it } from 'vitest'
import { starterMedications } from './medications'
import type { ControlTitle } from './types'

const validControls: ControlTitle[] = ['Rx', 'C-II', 'C-III', 'C-IV', 'C-V']

describe('starterMedications', () => {
  it('contains a full starter deck', () => {
    expect(starterMedications.length).toBeGreaterThanOrEqual(60)
  })

  it('has unique ids and brand/generic pairs', () => {
    const ids = new Set(starterMedications.map((med) => med.id))
    const pairs = new Set(starterMedications.map((med) => `${med.brandName}|${med.genericName}`.toLowerCase()))

    expect(ids.size).toBe(starterMedications.length)
    expect(pairs.size).toBe(starterMedications.length)
  })

  it('uses supported control titles and covers each title used in training', () => {
    const controls = new Set(starterMedications.map((med) => med.control))

    expect(starterMedications.every((med) => validControls.includes(med.control))).toBe(true)
    expect(controls).toEqual(new Set(validControls))
  })

  it('includes source review metadata', () => {
    for (const med of starterMedications) {
      expect(med.reviewedAt).toMatch(/^2026-06-/)
      expect(med.indicationSource.url).toMatch(/^https:\/\//)
      expect(med.controlSource.url).toMatch(/^https:\/\//)
    }
  })
})
