import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Busy, Calendars } from '../contract'
import { instantOf, localZone, moment } from './find'
import { clockText, dayText } from './format'

const clock = z.string().regex(/^\d{2}:\d{2}$/, 'Use 24-hour times like 09:00')

const input = z.object({
  from: moment.describe('Search from this day or time'),
  to: moment.describe('Search until this day or time'),
  minutes: z.number().int().min(5).max(1440).describe('How long the free time has to be'),
  day_start: clock.default('09:00').describe('Earliest time of day (default 09:00)'),
  day_end: clock.default('18:00').describe('Latest time of day (default 18:00)'),
  people: z.array(z.email()).optional().describe("Also respect these people's busy times, when a connected calendar can see them"),
})

const gaps = (window: Busy, busy: Busy[]) => {
  const free: Busy[] = []
  let at = window.from
  for (const span of busy) {
    if (span.to <= at || span.from >= window.to) continue
    if (span.from > at) free.push({ from: at, to: span.from })
    at = Math.max(at, span.to)
  }
  if (at < window.to) free.push({ from: at, to: window.to })
  return free
}

const windows = (from: number, to: number, zone: string, dayStart: string, dayEnd: string) => {
  const found: Busy[] = []
  const last = Temporal.Instant.fromEpochMilliseconds(to).toZonedDateTimeISO(zone).toPlainDate()
  for (let day = Temporal.Instant.fromEpochMilliseconds(from).toZonedDateTimeISO(zone).toPlainDate(); Temporal.PlainDate.compare(day, last) <= 0; day = day.add({ days: 1 })) {
    const open = instantOf(`${day}T${dayStart}`, zone)
    const close = instantOf(`${day}T${dayEnd}`, zone)
    if (close > open) found.push({ from: Math.max(open, from), to: Math.min(close, to) })
  }
  return found.filter(window => window.to > window.from)
}

const shown = 30

export const freeTool = (service: Calendars): Tool<typeof input> => ({
  name: 'calendar_free_time',
  description: "Find free time of at least the given length in the user's calendars, within working hours of each day.",
  group: 'calendar',
  effect: 'read',
  input,
  async run({ from, to, minutes, day_start, day_end, people }) {
    const zone = localZone()
    const range = { from: instantOf(from, zone), to: instantOf(to, zone) }
    const theirs = people?.length ? Object.values(await service.freeBusy(people, range)).flat() : []
    const busy = [...service.busy({ ...range, zone }), ...theirs].sort((a, b) => a.from - b.from)
    const free = windows(range.from, range.to, zone, day_start, day_end)
      .flatMap(window => gaps(window, busy))
      .filter(gap => gap.to - gap.from >= minutes * 60_000)
    if (!free.length) return `No free time of ${minutes} minutes between ${from} and ${to}.`
    const lines = free.slice(0, shown).map(gap => `- ${dayText(gap.from, zone)} ${clockText(gap.from, zone)}–${clockText(gap.to, zone)}`)
    const more = free.length > shown ? [`…and ${free.length - shown} more`] : []
    return [`Free times in ${zone}:`, ...lines, ...more].join('\n')
  },
})
