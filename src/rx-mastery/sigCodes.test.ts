import { describe, expect, it } from 'vitest'
import { sigCodeSource, sigCodes } from './sigCodes'

describe('sigCodes dataset', () => {
  it('includes core SIG codes from the training sheet', () => {
    const byCode = new Map(sigCodes.map((sigCode) => [sigCode.code, sigCode.meaning]))

    expect(sigCodeSource.name).toBe('User-provided SIG code sheets')
    expect(sigCodeSource.reviewedAt).toBe('2026-06-14')
    expect(byCode.get('BID')).toBe('Twice Daily')
    expect(byCode.get('TID')).toBe('Three Times Daily')
    expect(byCode.get('PRN')).toBe('When Required')
    expect(byCode.get('AA')).toBe('To Affected Area')
    expect(byCode.get('OU')).toBe('In Each Eye')
  })

  it('includes additional SIG codes from the Denali Rx PDF', () => {
    const byCode = new Map(sigCodes.map((sigCode) => [sigCode.code, sigCode.meaning]))

    expect(byCode.get('APAP')).toBe('Acetaminophen')
    expect(byCode.get('DAW')).toBe('Dispense As Written')
    expect(byCode.get('HCTZ')).toBe('Hydrochlorothiazide')
    expect(byCode.get('MDI')).toBe('Metered Dose Inhaler')
    expect(byCode.get('NDC')).toBe('National Drug Code')
    expect(byCode.get('ODT')).toBe('Orally Disintegrating Tablet')
    expect(byCode.get('QHS')).toBe('Every Night At Bedtime')
    expect(byCode.get('SIG')).toBe('Signa; directions for using a prescription')
    expect(byCode.get('TIW')).toBe('Three Times A Week')
    expect(byCode.get('UAD')).toBe('Use As Directed')
    expect(byCode.get('XR')).toBe('Extended Release')
  })

  it('keeps ids and SIG codes unique', () => {
    const ids = sigCodes.map((sigCode) => sigCode.id)
    const codes = sigCodes.map((sigCode) => sigCode.code)
    const normalizedCodes = codes.map((code) => code.toUpperCase())

    expect(sigCodes.length).toBeGreaterThanOrEqual(190)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(normalizedCodes).size).toBe(normalizedCodes.length)
  })
})
