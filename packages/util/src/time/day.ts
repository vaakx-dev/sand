const DAY_MS = 24 * 60 * 60 * 1000

const yearIfOther = (date: Date, today: Date) => (date.getFullYear() === today.getFullYear() ? undefined : 'numeric')

const dayLabel = (at: number) => {
  const date = new Date(at)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === new Date(today.getTime() - DAY_MS).toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: yearIfOther(date, today) })
}

const monthLabel = (at: number) => new Date(at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export { DAY_MS, dayLabel, monthLabel }
