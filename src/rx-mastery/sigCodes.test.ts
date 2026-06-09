import { describe, expect, it } from 'vitest'
import { sigCodeSource, sigCodes } from './sigCodes'

describe('sigCodes dataset', () => {
  it('includes core SIG codes from the training sheet', () => {
    const byCode = new Map(sigCodes.map((sigCode) => [sigCode.code, sigCode.meaning]))

    expect(sigCodeSource.name).toBe('User-provided SIG code sheet')
    expect(sigCodeSource.reviewedAt).toBe('2026-06-08')
    expect(byCode.get('BID')).toBe('Twice Daily')
    expect(byCode.get('TID')).toBe('Three Times Daily')
    expect(byCode.get('PRN')).toBe('When Required')
    expect(byCode.get('AA')).toBe('To Affected Area')
    expect(byCode.get('OU')).toBe('In Each Eye')
  })

  it('keeps ids and SIG codes unique', () => {
    const ids = sigCodes.map((sigCode) => sigCode.id)
    const codes = sigCodes.map((sigCode) => sigCode.code)

    expect(sigCodes.length).toBeGreaterThanOrEqual(80)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
