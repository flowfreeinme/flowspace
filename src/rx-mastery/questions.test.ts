import { describe, expect, it } from 'vitest'
import { createQuestion } from './questions'
import type { Medication } from './types'

const meds: Medication[] = [
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
  {
    id: 'xanax-alprazolam',
    brandName: 'Xanax',
    genericName: 'alprazolam',
    indication: 'Anxiety',
    control: 'C-IV',
    reviewedAt: '2026-06-08',
    indicationSource: { name: 'DailyMed', url: 'https://dailymed.nlm.nih.gov/dailymed/' },
    controlSource: { name: 'DEA', url: 'https://www.dea.gov/drug-information/drug-scheduling' },
  },
  {
    id: 'lyrica-pregabalin',
    brandName: 'Lyrica',
    genericName: 'pregabalin',
    indication: 'Neuropathic pain',
    control: 'C-V',
    reviewedAt: '2026-06-08',
    indicationSource: { name: 'DailyMed', url: 'https://dailymed.nlm.nih.gov/dailymed/' },
    controlSource: { name: 'DEA', url: 'https://www.dea.gov/drug-information/drug-scheduling' },
  },
]

describe('createQuestion', () => {
  it('creates brand-to-generic questions with unique choices', () => {
    const question = createQuestion(meds[0], meds, 'brandToGeneric')

    expect(question.prompt).toContain('Lipitor')
    expect(question.correctAnswer).toBe('atorvastatin')
    expect(new Set(question.choices).size).toBe(question.choices.length)
    expect(question.choices).toContain('atorvastatin')
  })

  it('creates generic-to-brand and control questions', () => {
    expect(createQuestion(meds[0], meds, 'genericToBrand').correctAnswer).toBe('Lipitor')
    expect(createQuestion(meds[1], meds, 'control').skillArea).toBe('controlStatus')
  })
})
