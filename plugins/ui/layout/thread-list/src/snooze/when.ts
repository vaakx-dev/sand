const minute = 60_000
const hour = 60 * minute
const day = 24 * hour

const units: Record<string, number> = { m: minute, h: hour, d: day, w: 7 * day }
const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const morning = 9

export const presets = [
  { id: '1h', label: '1h', span: hour },
  { id: '2h', label: '2h', span: 2 * hour },
  { id: '4h', label: '4h', span: 4 * hour },
  { id: '1d', label: '1d', span: day },
  { id: '1w', label: '1w', span: 7 * day },
]

const clockTime = (text: string) => {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(text)
  if (!match) return
  const [, rawHour, rawMinute = '0', half] = match
  const hours = Number(rawHour) + (half === 'pm' && Number(rawHour) < 12 ? 12 : 0) - (half === 'am' && Number(rawHour) === 12 ? 12 : 0)
  const minutes = Number(rawMinute)
  return hours < 24 && minutes < 60 ? { hours, minutes } : undefined
}

const dayOffset = (word: string, today: number) => {
  if (word === 'today') return 0
  if (word === 'tomorrow' || word === 'tmr') return 1
  const index = days.findIndex(name => word.length >= 3 && name.startsWith(word.slice(0, 3)))
  return index < 0 ? undefined : (index - today + 7) % 7
}

const isWeekday = (word: string) => !['today', 'tomorrow', 'tmr'].includes(word)

export const parseWhen = (raw: string, now = Date.now()) => {
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  const span = /^(\d+(?:\.\d+)?) ?(m|h|d|w)$/.exec(text)
  if (span) return now + Number(span[1]) * units[span[2]!]!
  const [first = '', ...rest] = text.split(' ')
  const offset = dayOffset(first, new Date(now).getDay())
  const clock = clockTime(offset === undefined ? text : rest.join(' ') || `${morning}am`)
  if (!clock) return
  const at = new Date(now)
  at.setHours(clock.hours, clock.minutes, 0, 0)
  if (offset !== undefined) at.setDate(at.getDate() + offset)
  if (at.getTime() <= now && offset === undefined) at.setDate(at.getDate() + 1)
  if (at.getTime() <= now && offset !== undefined && isWeekday(first)) at.setDate(at.getDate() + 7)
  return at.getTime() > now ? at.getTime() : undefined
}

export const backLabel = (at: number, now = Date.now()) => {
  const date = new Date(at)
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const today = date.toDateString() === new Date(now).toDateString()
  return today ? `back ${time}` : `back ${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}
