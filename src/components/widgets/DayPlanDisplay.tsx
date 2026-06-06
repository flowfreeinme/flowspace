import { parseDayPlanSections } from '@/lib/dayPlanner'

interface DayPlanDisplayProps {
  plan: string | null
  emptyText: string
}

export default function DayPlanDisplay({ plan, emptyText }: DayPlanDisplayProps) {
  if (!plan) {
    return <p className="text-xs leading-relaxed text-gray-500">{emptyText}</p>
  }

  const sections = parseDayPlanSections(plan)
  if (!sections.length) {
    return <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-300">{plan}</p>
  }

  return (
    <div className="space-y-3">
      {sections.map(section => (
        <section key={section.title} className="border-b border-surface-3/70 pb-2.5 last:border-b-0 last:pb-0">
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            {section.title}
          </h3>
          <ul className="space-y-1.5">
            {section.items.map((item, index) => (
              <li key={`${section.title}-${index}`} className="flex gap-2 text-xs leading-relaxed text-gray-300">
                <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
