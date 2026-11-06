import { localStamp } from '../stamp'
import { validZone } from '../when'
import { writeLine } from './lines'

export const resolveZone = (tzid: string) => {
  const parts = tzid.replace(/^"|"$/g, '').split('/')
  for (let from = 0; from < parts.length; from++) {
    const found = validZone(parts.slice(from).join('/'))
    if (found) return found
  }
}

const offsetText = (nanoseconds: number) => {
  const minutes = Math.round(nanoseconds / 60e9)
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`
}

interface Observance {
  kind: 'STANDARD' | 'DAYLIGHT'
  from: number
  to: number
  starts: Temporal.PlainDateTime[]
}

const observances = (zone: string, firstYear: number, lastYear: number) => {
  let at = Temporal.ZonedDateTime.from({ year: firstYear, month: 1, day: 1, timeZone: zone })
  const groups = new Map<string, Observance>()
  const add = (kind: Observance['kind'], from: number, to: number, start: Temporal.PlainDateTime) => {
    const key = `${kind}${from}${to}`
    const group = groups.get(key) ?? { kind, from, to, starts: [] }
    group.starts.push(start)
    groups.set(key, group)
  }
  add('STANDARD', at.offsetNanoseconds, at.offsetNanoseconds, at.toPlainDateTime())
  for (let next = at.getTimeZoneTransition('next'); next && next.year <= lastYear; next = next.getTimeZoneTransition('next')) {
    const before = next.subtract({ nanoseconds: 1 }).offsetNanoseconds
    const kind = next.offsetNanoseconds > before ? 'DAYLIGHT' : 'STANDARD'
    add(kind, before, next.offsetNanoseconds, next.toInstant().toZonedDateTimeISO('UTC').toPlainDateTime().add({ nanoseconds: before }))
    at = next
  }
  return [...groups.values()]
}

export const writeZone = (zone: string, firstYear: number, lastYear: number) => [
  'BEGIN:VTIMEZONE',
  writeLine('TZID', zone),
  ...observances(zone, firstYear, lastYear).flatMap(({ kind, from, to, starts }) => [
    `BEGIN:${kind}`,
    writeLine('DTSTART', localStamp(starts[0]!)),
    ...(starts.length > 1 ? [writeLine('RDATE', starts.slice(1).map(localStamp).join(','))] : []),
    writeLine('TZOFFSETFROM', offsetText(from)),
    writeLine('TZOFFSETTO', offsetText(to)),
    `END:${kind}`,
  ]),
  'END:VTIMEZONE',
]
