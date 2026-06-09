import { getOverallMastery, getSigCodeMastery } from './mastery'
import type { PracticeArea, ProgressState, SkillArea } from './types'

export type MasteryTile = {
  skillArea: PracticeArea
  label: string
  mastery: number
  description: string
}

const skillLabels: Record<PracticeArea, string> = {
  brandGeneric: 'Brand / Generic',
  indications: 'Indications',
  controlStatus: 'Control Status',
  sigCodes: 'SIG Codes',
  mixedReview: 'Mixed Review',
}

const skillDescriptions: Record<PracticeArea, string> = {
  brandGeneric: 'Match medication brand and generic names.',
  indications: 'Practice common training indications.',
  controlStatus: 'Review Rx and controlled substance titles.',
  sigCodes: 'Translate prescription SIG abbreviations.',
  mixedReview: 'Blend your weakest areas into one session.',
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function getSkillMastery(
  progress: ProgressState,
  skillArea: Exclude<SkillArea, 'mixedReview'>,
): number {
  return average(Object.values(progress.medications).map((med) => med[skillArea].confidence))
}

export function getMasteryTiles(progress: ProgressState): MasteryTile[] {
  const skillAreas: PracticeArea[] = ['brandGeneric', 'indications', 'controlStatus', 'sigCodes', 'mixedReview']

  return skillAreas.map((skillArea) => ({
    skillArea,
    label: skillLabels[skillArea],
    mastery: skillArea === 'mixedReview'
      ? getOverallMastery(progress)
      : skillArea === 'sigCodes'
        ? getSigCodeMastery(progress)
        : getSkillMastery(progress, skillArea),
    description: skillDescriptions[skillArea],
  }))
}

export function getWeakestPracticeTarget(progress: ProgressState): MasteryTile {
  const skillTiles = getMasteryTiles(progress).filter((tile) => tile.skillArea !== 'mixedReview')
  return skillTiles.sort((a, b) => a.mastery - b.mastery)[0]
}
