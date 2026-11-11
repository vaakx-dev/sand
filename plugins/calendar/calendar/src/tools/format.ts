import { instant, isDate, type When } from '@sand/ical'
import type { Occurrence } from '../contract'

const formats = new Map<string, { day: Intl.DateTimeFormat; clock: Intl.DateTimeFormat }>()

const formatsOf = (zone: string) => {
  const known = formats.get(zone)
  if (known) return known
  const made = {
    day: new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: zone }),
    clock: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone }),
  }
  formats.set(zone, made)
  return made
}

export const dayText = (ms: number, zone: string) => formatsOf(zone).day.format(ms)

export const clockText = (ms: number, zone: string) => formatsOf(zone).clock.format(ms)

export const whenText = ({ start, from, to }: { start: When; from: number; to: number }, zone: string) => {
  if (isDate(start)) {
    const last = to - 86_400_000
    return dayText(last, zone) === dayText(from, zone) ? `${dayText(from, zone)}, all day` : `${dayText(from, zone)} – ${dayText(last, zone)}, all day`
  }
  const until = dayText(to, zone) === dayText(from, zone) ? clockText(to, zone) : `${dayText(to, zone)} ${clockText(to, zone)}`
  return `${dayText(from, zone)} ${clockText(from, zone)}–${until}`
}

export const spanText = (start: When, end: When, zone: string) => whenText({ start, from: instant(start, zone), to: instant(end, zone) }, zone)

export const originalText = (when: When) => (isDate(when) ? when.date : when.time)

const responseText = { 'needs-action': 'invited, not answered yet', accepted: 'you accepted', declined: 'you declined', tentative: 'you said maybe' }

const details = (event: Occurrence) =>
  [
    `id ${event.id}`,
    event.recurrence && event.original && `occurrence ${originalText(event.original)}`,
    event.recurrence && 'repeats',
    event.series && 'changed occurrence of a repeating event',
    event.response && responseText[event.response],
    event.status === 'tentative' && 'tentative',
    event.free && 'shown as free',
    event.attendees?.length && `with ${event.attendees.map(guest => guest.name ?? guest.email).join(', ')}`,
  ].filter(Boolean)

export const lineOf = (event: Occurrence, zone: string, calendar?: string) => {
  const time = isDate(event.start) ? 'all day' : `${clockText(event.from, zone)}–${clockText(event.to, zone)}`
  const place = event.location ? ` (${event.location})` : ''
  const where = calendar ? ` in ${calendar}` : ''
  return `- ${time} ${event.title}${place}${where} [${details(event).join('; ')}]`
}
