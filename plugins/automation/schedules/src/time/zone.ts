export interface Wall {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const hourMs = 60 * 60 * 1000
const formats = new Map<string, Intl.DateTimeFormat>()

const formatOf = (zone: string) => {
  const known = formats.get(zone)
  if (known) return known
  const made = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
  formats.set(zone, made)
  return made
}

const partsOf = (instant: number, zone: string) => {
  const parts = Object.fromEntries(formatOf(zone).formatToParts(instant).map(part => [part.type, Number(part.value)]))
  return { year: parts.year!, month: parts.month!, day: parts.day!, hour: parts.hour!, minute: parts.minute!, second: parts.second! }
}

export const keyOf = ({ year, month, day, hour, minute }: Wall) => Date.UTC(year, month - 1, day, hour, minute)

export const wallOf = (instant: number, zone: string): Wall => {
  const { year, month, day, hour, minute } = partsOf(instant, zone)
  return { year, month, day, hour, minute }
}

const offsetAt = (instant: number, zone: string) => {
  const parts = partsOf(instant, zone)
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(instant / 1000) * 1000
}

export const instantsOf = (wall: Wall, zone: string) => {
  const key = keyOf(wall)
  const offsets = new Set([offsetAt(key - 12 * hourMs, zone), offsetAt(key + 12 * hourMs, zone)])
  const found = [...offsets].map(offset => key - offset).filter(instant => keyOf(wallOf(instant, zone)) === key)
  if (!found.length) return [key - offsetAt(key - 12 * hourMs, zone)]
  return found.sort((a, b) => a - b)
}

export const checkZone = (zone: string) => {
  try {
    formatOf(zone)
  } catch {
    throw new Error(`"${zone}" is not a time zone; use a name like Europe/Berlin`)
  }
}

export const systemZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

const localPattern = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/

export const localInstant = (text: string, zone: string) => {
  checkZone(zone)
  const match = localPattern.exec(text.trim())
  if (!match) throw new Error(`"${text}" is not a local time like 2026-11-04 18:00`)
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  const wall = { year: year!, month: month!, day: day!, hour: hour!, minute: minute! }
  const back = new Date(keyOf(wall))
  if (back.getUTCMonth() + 1 !== month || back.getUTCDate() !== day || wall.hour > 23 || wall.minute > 59) throw new Error(`"${text}" is not a real date and time`)
  return instantsOf(wall, zone)[0]!
}
