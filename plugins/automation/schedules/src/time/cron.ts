export interface Cron {
  minutes: number[]
  hours: number[]
  days: Set<number>
  months: Set<number>
  weekdays: Set<number>
  anyDay: boolean
  anyWeekday: boolean
}

interface Field {
  name: string
  min: number
  max: number
  names?: string[]
}

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const fields: Field[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of the month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: months },
  { name: 'day of the week', min: 0, max: 7, names: weekdays },
]

const numberOf = (field: Field, text: string) => {
  const named = field.names?.indexOf(text.toLowerCase()) ?? -1
  if (named >= 0) return named + field.min
  const value = /^\d+$/.test(text) ? Number(text) : NaN
  if (!(value >= field.min && value <= field.max)) throw new Error(`"${text}" is not a valid ${field.name}`)
  return value
}

const rangeOf = (field: Field, text: string, stepped: boolean): [number, number] => {
  if (text === '*') return [field.min, field.max]
  const [from, to] = text.split('-')
  const start = numberOf(field, from!)
  if (to === undefined) return [start, stepped ? field.max : start]
  const end = numberOf(field, to)
  if (end < start) throw new Error(`"${text}" runs backwards in the ${field.name}`)
  return [start, end]
}

const partOf = (field: Field, part: string) => {
  const [range, step] = part.split('/')
  const every = step === undefined ? 1 : Number(step)
  if (!Number.isInteger(every) || every < 1) throw new Error(`"${part}" has a bad step in the ${field.name}`)
  const [start, end] = rangeOf(field, range!, step !== undefined)
  const values: number[] = []
  for (let value = start; value <= end; value += every) values.push(value)
  return values
}

const fieldOf = (field: Field, text: string) => [...new Set(text.split(',').flatMap(part => partOf(field, part)))].sort((a, b) => a - b)

export const parseCron = (text: string): Cron => {
  const parts = text.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`"${text}" is not a cron schedule: it needs five fields (minute hour day month weekday)`)
  const [minutes, hours, days, monthList, weekdayList] = fields.map((field, index) => fieldOf(field, parts[index]!))
  return {
    minutes: minutes!,
    hours: hours!,
    days: new Set(days),
    months: new Set(monthList),
    weekdays: new Set(weekdayList!.map(day => day % 7)),
    anyDay: parts[2]!.startsWith('*'),
    anyWeekday: parts[4]!.startsWith('*'),
  }
}

export const matchesDay = (cron: Cron, date: Date) => {
  if (!cron.months.has(date.getUTCMonth() + 1)) return false
  const day = cron.days.has(date.getUTCDate())
  const weekday = cron.weekdays.has(date.getUTCDay())
  if (cron.anyDay) return weekday
  if (cron.anyWeekday) return day
  return day || weekday
}
