import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useDatabase } from '@/stores/database'
import { TITLE_PROP_ID } from '@/lib/databaseTypes'

interface Props { dbId: string; viewId: string; onOpenRow: (rowId: string) => void }

export default function DatabaseCalendarView({ dbId, viewId, onOpenRow }: Props) {
  const { databases, rows, addRow, updateRow, updateView } = useDatabase()
  const db = databases[dbId]
  const dbRows = rows[dbId] ?? []
  const view = db?.views.find(v => v.id === viewId)
  const [date, setDate] = useState(() => new Date())

  if (!db || !view) return null

  const dateProp = db.schema.find(p => p.id === view.datePropId && p.type === 'date')
  const dateProps = db.schema.filter(p => p.type === 'date')

  if (!dateProp && dateProps.length > 0) {
    updateView(dbId, viewId, { datePropId: dateProps[0].id })
    return null
  }

  if (!dateProp) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Calendar view requires a Date property. Add one in Properties (⚙).
      </div>
    )
  }

  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function rowsForDay(day: number) {
    const target = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dbRows.filter(r => {
      const val = r.properties[dateProp!.id]
      if (!val) return false
      const dateStr = typeof val === 'object' && 'start' in (val as object)
        ? (val as { start: string }).start
        : String(val)
      return dateStr.startsWith(target)
    })
  }

  async function handleAddToDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const row = await addRow(dbId)
    await updateRow(dbId, row.id, { [dateProp!.id]: { start: dateStr } })
    onOpenRow(row.id)
  }

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button onClick={() => setDate(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-200"><ChevronLeft size={16} /></button>
        <span className="text-sm font-medium text-gray-200">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => setDate(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-200"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-800 text-xs text-gray-500 text-center">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {cells.map((day, i) => {
          const dayRows = day ? rowsForDay(day) : []
          return (
            <div key={i} className="border-r border-b border-gray-800 min-h-[100px] p-1 group">
              {day && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 px-1">{day}</span>
                    <button onClick={() => handleAddToDay(day)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-300"><Plus size={11} /></button>
                  </div>
                  {dayRows.map(row => (
                    <div key={row.id} onClick={() => onOpenRow(row.id)}
                      className="mt-1 px-1.5 py-0.5 bg-purple-900/50 text-purple-200 rounded text-xs truncate cursor-pointer hover:bg-purple-900/70">
                      {String(row.properties[TITLE_PROP_ID] ?? 'Untitled')}
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
