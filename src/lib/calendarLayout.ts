interface TimedEventBlockOptions {
  day: Date
  start: Date
  end: Date
  hourHeight: number
  minHeight?: number
}

export function getTimedEventBlock({ day, start, end, hourHeight, minHeight = 18 }: TimedEventBlockOptions) {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const visibleStart = Math.max(start.getTime(), dayStart.getTime())
  const visibleEnd = Math.min(end.getTime(), dayEnd.getTime())
  const startMinutes = Math.max(0, (visibleStart - dayStart.getTime()) / 60000)
  const durationMinutes = Math.max(0, (visibleEnd - visibleStart) / 60000)

  return {
    top: (startMinutes / 60) * hourHeight,
    height: Math.max(minHeight, (durationMinutes / 60) * hourHeight),
  }
}
