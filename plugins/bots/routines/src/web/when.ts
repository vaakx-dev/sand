import type { When } from '@sand/schedules/contract'

const custom = 'Custom schedule'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const weekOrder = [1, 2, 3, 4, 5, 6, 0]

const dayNames = days.map(day => day.slice(0, 3).toLowerCase())

const suffixes: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'st', two: 'nd', few: 'rd' }

const ordinals = new Intl.PluralRules('en', { type: 'ordinal' })

const moment = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const numberIn = (text: string, min: number, max: number) => {
  const value = /^\d+$/.test(text) ? Number(text) : NaN
  return value >= min && value <= max ? value : undefined
}

const nth = (day: number) => `${day}${suffixes[ordinals.select(day)] ?? 'th'}`

const weekday = (text: string) => {
  const named = dayNames.indexOf(text.toLowerCase())
  return named >= 0 ? named : numberIn(text, 0, 7)
}

const weekdaysOf = (field: string) => {
  if (field === '*') return new Set(weekOrder)
  const found = new Set<number>()
  for (const part of field.split(',')) {
    const [from = '', to = from] = part.split('-')
    const start = weekday(from)
    const end = weekday(to)
    if (start === undefined || end === undefined || end < start) return undefined
    for (let day = start; day <= end; day++) found.add(day % 7)
  }
  return found
}

const daysPhrase = (weekdays: Set<number>) => {
  const ordered = weekOrder.filter(day => weekdays.has(day))
  if (ordered.length === 7) return 'Daily'
  if (ordered.join() === '1,2,3,4,5') return 'Weekdays'
  if (ordered.length === 1) return `${days[ordered[0]!]}s`
  return ordered.map(day => days[day]!.slice(0, 3)).join(', ')
}

const cronWords = (cron: string) => {
  const fields = cron.trim().split(/\s+/)
  if (fields.length !== 5) return custom
  const [minute = '', hour = '', day = '', month = '', weekdays = ''] = fields
  const everyHour = [hour, day, month, weekdays].every(field => field === '*')
  const step = /^\*\/(\d+)$/.exec(minute)
  if (everyHour && step) return `Every ${step[1]} minutes`
  if (everyHour && minute === '0') return 'Hourly'
  const minutes = numberIn(minute, 0, 59)
  const hours = numberIn(hour, 0, 23)
  if (minutes === undefined || hours === undefined || month !== '*') return custom
  const time = `${hours}:${String(minutes).padStart(2, '0')}`
  if (day === '*') {
    const found = weekdaysOf(weekdays)
    return found ? `${daysPhrase(found)} ${time}` : custom
  }
  const date = numberIn(day, 1, 31)
  return date !== undefined && weekdays === '*' ? `Monthly on the ${nth(date)}, ${time}` : custom
}

export const describe = (when: When) => (when.kind === 'once' ? `Once, ${moment.format(when.at)}` : cronWords(when.cron))
