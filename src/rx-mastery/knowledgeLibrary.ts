import type { Medication, SigCode } from './types'

export type KnowledgeKind = 'medication' | 'sigCode'
export type KnowledgeFilter = 'all' | KnowledgeKind

export type KnowledgeField = {
  label: string
  value: string
}

export type KnowledgeEntry = {
  id: string
  kind: KnowledgeKind
  title: string
  subtitle: string
  fields: KnowledgeField[]
  tags: string[]
  searchText: string
}

function createSearchText(values: string[]) {
  return values.join(' ').toLowerCase()
}

function getSearchRank(entry: KnowledgeEntry, normalizedQuery: string) {
  if (normalizedQuery.length === 0) return 0

  const searchableValues = [
    entry.title,
    entry.subtitle,
    ...entry.tags,
    ...entry.fields.flatMap((field) => [field.label, field.value]),
  ].map((value) => value.toLowerCase())

  if (searchableValues.some((value) => value === normalizedQuery)) return 0
  if (searchableValues.some((value) => value.startsWith(normalizedQuery))) return 1
  return 2
}

export function getTestableKnowledgeEntries(
  medications: Medication[],
  sigCodes: SigCode[],
): KnowledgeEntry[] {
  const medicationEntries = medications.map((medication) => {
    const fields = [
      { label: 'Brand', value: medication.brandName },
      { label: 'Generic', value: medication.genericName },
      { label: 'Indication', value: medication.indication },
      { label: 'Control', value: medication.control },
    ]

    return {
      id: `medication-${medication.id}`,
      kind: 'medication' as const,
      title: medication.brandName,
      subtitle: medication.genericName,
      fields,
      tags: ['Medication', medication.control, medication.indication],
      searchText: createSearchText([
        medication.brandName,
        medication.genericName,
        medication.indication,
        medication.control,
      ]),
    }
  })

  const sigCodeEntries = sigCodes.map((sigCode) => {
    const fields = [
      { label: 'Code', value: sigCode.code },
      { label: 'Meaning', value: sigCode.meaning },
      { label: 'Category', value: sigCode.category },
    ]

    return {
      id: `sig-${sigCode.id}`,
      kind: 'sigCode' as const,
      title: sigCode.code,
      subtitle: sigCode.meaning,
      fields,
      tags: ['SIG', sigCode.category],
      searchText: createSearchText([sigCode.code, sigCode.meaning, sigCode.category]),
    }
  })

  return [...medicationEntries, ...sigCodeEntries]
}

export function filterKnowledgeEntries(
  entries: KnowledgeEntry[],
  query: string,
  kind: KnowledgeFilter,
): KnowledgeEntry[] {
  const normalizedQuery = query.trim().toLowerCase()

  return entries
    .filter((entry) => {
      const matchesKind = kind === 'all' || entry.kind === kind
      const matchesQuery = normalizedQuery.length === 0 || entry.searchText.includes(normalizedQuery)

      return matchesKind && matchesQuery
    })
    .sort((first, second) => getSearchRank(first, normalizedQuery) - getSearchRank(second, normalizedQuery))
}
