import type { Attendee, Event, Recurrence, When } from '../event'
import { parseRule, ruleText } from '../rrule/rule'
import { dateStamp, localStamp, readStamp, type Stamp, utcStamp } from '../stamp'
import { instant, isDate, plainOf } from '../when'
import { contentLine, escapeText, fold, writeLine } from './lines'
import { writeZone } from './zones'

const whenLine = (name: string, when: When) => {
  if (isDate(when)) return contentLine(name, dateStamp(plainOf(when).toPlainDate()), { VALUE: 'DATE' })
  if (when.zone === 'UTC') return contentLine(name, utcStamp(instant(when, 'UTC')))
  return contentLine(name, localStamp(plainOf(when)), { TZID: when.zone })
}

const writeWhen = (name: string, when: When) => fold(whenLine(name, when))

const stampDate = (stamp: Stamp) => {
  if (stamp.kind === 'date') return stamp.date
  if (stamp.kind === 'local') return stamp.plain.toPlainDate()
  return stamp.instant.toZonedDateTimeISO('UTC').toPlainDate()
}

const ruleFor = (text: string, start: When) => {
  const rule = parseRule(text)
  if (!rule.until) return ruleText(rule)
  const until = readStamp(rule.until)
  if (isDate(start)) return ruleText({ ...rule, until: dateStamp(stampDate(until)) })
  if (until.kind !== 'local') return ruleText(rule)
  return ruleText({ ...rule, until: utcStamp(until.plain.toZonedDateTime(start.zone).epochMilliseconds) })
}

export const writeRecurrence = ({ rule, exdates = [], rdates = [] }: Recurrence, start: When) => [
  contentLine('RRULE', ruleFor(rule, start)),
  ...exdates.map(when => whenLine('EXDATE', when)),
  ...rdates.map(when => whenLine('RDATE', when)),
]

const writeAttendee = ({ email, name, response, optional }: Attendee) =>
  writeLine(`ATTENDEE`, `mailto:${email}`, { CN: name, PARTSTAT: response.toUpperCase(), ROLE: optional ? 'OPT-PARTICIPANT' : 'REQ-PARTICIPANT' })

const alarm = (minutes: number) => ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', `TRIGGER:-PT${minutes}M`, 'END:VALARM']

const optionalText = (name: string, value: string | undefined) => (value ? [writeLine(name, escapeText(value))] : [])

const writeEvent = (event: Event, stamp: string) => [
  'BEGIN:VEVENT',
  writeLine('UID', event.uid),
  `DTSTAMP:${stamp}`,
  writeWhen('DTSTART', event.start),
  writeWhen('DTEND', event.end),
  ...(event.original ? [writeWhen('RECURRENCE-ID', event.original)] : []),
  ...(event.recurrence ? writeRecurrence(event.recurrence, event.start).map(fold) : []),
  writeLine('SUMMARY', escapeText(event.title)),
  ...optionalText('LOCATION', event.location),
  ...optionalText('DESCRIPTION', event.notes),
  `STATUS:${event.status.toUpperCase()}`,
  ...(event.free ? ['TRANSP:TRANSPARENT'] : []),
  ...(event.sequence ? [`SEQUENCE:${event.sequence}`] : []),
  ...(event.organizer ? [writeLine('ORGANIZER', `mailto:${event.organizer.email}`, { CN: event.organizer.name })] : []),
  ...(event.attendees ?? []).map(writeAttendee),
  ...(event.reminders ?? []).flatMap(alarm),
  'END:VEVENT',
]

const whensOf = (event: Event) => [event.start, event.end, ...(event.original ? [event.original] : []), ...(event.recurrence?.exdates ?? []), ...(event.recurrence?.rdates ?? [])]

const zonesOf = (events: Event[]) => {
  const years = events.map(event => plainOf(event.start).year)
  const first = Math.min(...years)
  const last = Math.max(...years, Temporal.Now.plainDateISO().year) + 5
  const zones = new Set(events.flatMap(event => whensOf(event).flatMap(when => (isDate(when) || when.zone === 'UTC' ? [] : [when.zone]))))
  return [...zones].sort().flatMap(zone => writeZone(zone, first, last))
}

export interface CalendarHead {
  name?: string
  stamp: number
}

export const writeCalendar = (events: Event[], { name, stamp }: CalendarHead) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//sand//calendar//EN',
    'CALSCALE:GREGORIAN',
    ...(name ? [writeLine('X-WR-CALNAME', escapeText(name))] : []),
    ...zonesOf(events),
    ...events.flatMap(event => writeEvent(event, utcStamp(stamp))),
    'END:VCALENDAR',
    '',
  ].join('\r\n')
