import { useMemo, useState } from 'react'
import { FileText, Pill, Search } from 'lucide-react'
import { filterKnowledgeEntries, getTestableKnowledgeEntries, type KnowledgeFilter } from './knowledgeLibrary'
import type { Medication, SigCode } from './types'

type Props = {
  medications: Medication[]
  sigCodes: SigCode[]
}

const filters: Array<{ label: string; value: KnowledgeFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Medications', value: 'medication' },
  { label: 'SIG Codes', value: 'sigCode' },
]

export default function RxKnowledgeLibrary({ medications, sigCodes }: Props) {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<KnowledgeFilter>('all')
  const entries = useMemo(() => getTestableKnowledgeEntries(medications, sigCodes), [medications, sigCodes])
  const filteredEntries = useMemo(
    () => filterKnowledgeEntries(entries, query, activeFilter),
    [activeFilter, entries, query],
  )
  const medicationCount = entries.filter((entry) => entry.kind === 'medication').length
  const sigCodeCount = entries.filter((entry) => entry.kind === 'sigCode').length

  return (
    <section className="rx-panel rx-knowledge-panel" aria-labelledby="rx-knowledge-title">
      <div className="rx-knowledge-top">
        <div>
          <p className="rx-eyebrow">Knowledge library</p>
          <h2 id="rx-knowledge-title">All testable knowledge</h2>
          <p className="rx-knowledge-summary">
            {medicationCount} medications and {sigCodeCount} SIG codes
          </p>
        </div>
        <label className="rx-search-box">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brand, generic, indication, control, or SIG"
            type="search"
          />
        </label>
      </div>

      <div className="rx-segmented-control" role="tablist" aria-label="Knowledge type">
        {filters.map((filter) => (
          <button
            aria-selected={activeFilter === filter.value}
            className={activeFilter === filter.value ? 'is-active' : ''}
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            role="tab"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="rx-knowledge-list" aria-live="polite">
        {filteredEntries.map((entry) => {
          const Icon = entry.kind === 'medication' ? Pill : FileText

          return (
            <article className="rx-knowledge-row" key={entry.id}>
              <span className="rx-knowledge-icon" aria-hidden="true"><Icon size={18} /></span>
              <div className="rx-knowledge-name">
                <strong>{entry.title}</strong>
                <span>{entry.subtitle}</span>
                <small>{entry.tags.join(' / ')}</small>
              </div>
              <dl className="rx-knowledge-fields">
                {entry.fields.map((field) => (
                  <div className="rx-knowledge-field" key={`${entry.id}-${field.label}`}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )
        })}
        {filteredEntries.length === 0 && (
          <p className="rx-knowledge-empty">No matching testable knowledge found.</p>
        )}
      </div>
    </section>
  )
}
