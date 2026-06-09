import { describe, expect, it } from 'vitest'
import { filterKnowledgeEntries, getTestableKnowledgeEntries } from './knowledgeLibrary'
import type { Medication, SigCode } from './types'

const medications: Medication[] = [
  {
    id: 'lipitor-atorvastatin',
    brandName: 'Lipitor',
    genericName: 'atorvastatin',
    indication: 'Hyperlipidemia',
    control: 'Rx',
    reviewedAt: '2026-06-08',
    indicationSource: { name: 'DailyMed', url: 'https://dailymed.nlm.nih.gov/dailymed/' },
    controlSource: { name: 'DEA', url: 'https://www.dea.gov/drug-information/drug-scheduling' },
  },
  {
    id: 'adderall-amphetamine-dextroamphetamine',
    brandName: 'Adderall',
    genericName: 'amphetamine and dextroamphetamine',
    indication: 'ADHD',
    control: 'C-II',
    reviewedAt: '2026-06-08',
    indicationSource: { name: 'DailyMed', url: 'https://dailymed.nlm.nih.gov/dailymed/' },
    controlSource: { name: 'DEA', url: 'https://www.dea.gov/drug-information/drug-scheduling' },
  },
]

const sigCodes: SigCode[] = [
  { id: 'bid-twice-daily', code: 'BID', meaning: 'Twice Daily', category: 'Frequency' },
  { id: 'aa-to-affected-area', code: 'AA', meaning: 'To Affected Area', category: 'Application' },
]

describe('knowledge library', () => {
  it('creates entries for every testable medication and SIG code', () => {
    const entries = getTestableKnowledgeEntries(medications, sigCodes)

    expect(entries).toHaveLength(4)
    expect(entries[0]).toMatchObject({
      id: 'medication-lipitor-atorvastatin',
      kind: 'medication',
      title: 'Lipitor',
      subtitle: 'atorvastatin',
    })
    expect(entries[0].fields).toEqual([
      { label: 'Brand', value: 'Lipitor' },
      { label: 'Generic', value: 'atorvastatin' },
      { label: 'Indication', value: 'Hyperlipidemia' },
      { label: 'Control', value: 'Rx' },
    ])
    expect(entries[2]).toMatchObject({
      id: 'sig-bid-twice-daily',
      kind: 'sigCode',
      title: 'BID',
      subtitle: 'Twice Daily',
    })
  })

  it('filters entries by search text and kind', () => {
    const entries = getTestableKnowledgeEntries(medications, sigCodes)

    expect(filterKnowledgeEntries(entries, 'c-ii', 'all').map((entry) => entry.title)).toEqual(['Adderall'])
    expect(filterKnowledgeEntries(entries, 'daily', 'sigCode').map((entry) => entry.title)).toEqual(['BID'])
    expect(filterKnowledgeEntries(entries, '', 'medication').map((entry) => entry.title)).toEqual(['Lipitor', 'Adderall'])
  })

  it('prioritizes exact title matches before substring matches', () => {
    const entries = getTestableKnowledgeEntries(
      [
        ...medications,
        {
          ...medications[0],
          id: 'macrobid-nitrofurantoin',
          brandName: 'Macrobid',
          genericName: 'nitrofurantoin',
          indication: 'Urinary tract infection',
        },
      ],
      sigCodes,
    )

    expect(filterKnowledgeEntries(entries, 'bid', 'all').map((entry) => entry.title)[0]).toBe('BID')
  })
})
