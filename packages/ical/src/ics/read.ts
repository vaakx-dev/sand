import { responses, statuses, type Attendee, type Event, type Person, type Recurrence, type When } from '../event'
import { readStamp } from '../stamp'
import { type Component, type Property, readComponents, readLine, unescapeText } from './lines'
import { resolveZone } from './zones'

const property = (component: Component, name: string) => component.properties.find(found => found.name === name)

const text = (component: Component, name: string) => {
  const found = property(component, name)
  return found ? unescapeText(found.value) : undefined
}

const whens = (found: Property, zone: string): When[] =>
  found.value.split(',').map(value => {
    const stamp = readStamp(value)
    if (stamp.kind === 'date') return { date: stamp.date.toString() }
    if (stamp.kind === 'utc') return { time: stamp.instant.toZonedDateTimeISO('UTC').toPlainDateTime().toString({ smallestUnit: 'second' }), zone: 'UTC' }
    const own = found.params.TZID ? resolveZone(found.params.TZID) : undefined
    return { time: stamp.plain.toString({ smallestUnit: 'second' }), zone: own ?? zone }
  })

const when = (found: Property, zone: string) => whens(found, zone)[0]!

const listed = (properties: Property[], name: string, zone: string) => {
  const found = properties.filter(other => other.name === name).flatMap(other => whens(other, zone))
  return found.length ? found : undefined
}

const recurrenceOf = (properties: Property[], zone: string): Recurrence | undefined => {
  const rule = properties.find(found => found.name === 'RRULE')?.value
  if (!rule) return
  const exdates = listed(properties, 'EXDATE', zone)
  const rdates = listed(properties, 'RDATE', zone)
  return { rule, ...(exdates && { exdates }), ...(rdates && { rdates }) }
}

export const readRecurrence = (lines: string[], zone: string) => recurrenceOf(lines.flatMap(line => readLine(line) ?? []), zone)

const person = ({ value, params }: Property): Person => ({ email: value.replace(/^mailto:/i, ''), ...(params.CN && { name: params.CN }) })

const attendee = (found: Property): Attendee => {
  const response = responses.find(known => known === found.params.PARTSTAT?.toLowerCase()) ?? 'needs-action'
  return { ...person(found), response, ...(found.params.ROLE === 'OPT-PARTICIPANT' && { optional: true }) }
}

const endOf = (event: Component, start: When, zone: string): When => {
  const end = property(event, 'DTEND')
  if (end) return when(end, zone)
  const duration = property(event, 'DURATION')
  const plain = 'date' in start ? Temporal.PlainDate.from(start.date).toPlainDateTime() : Temporal.PlainDateTime.from(start.time)
  const add = duration ? Temporal.Duration.from(duration.value) : Temporal.Duration.from({ days: 'date' in start ? 1 : 0 })
  const ends = plain.add(add)
  return 'date' in start ? { date: ends.toPlainDate().toString() } : { time: ends.toString({ smallestUnit: 'second' }), zone: start.zone }
}

const reminders = (event: Component) => {
  const minutes = event.children
    .filter(child => child.name === 'VALARM')
    .flatMap(alarm => {
      const trigger = property(alarm, 'TRIGGER')
      if (!trigger || trigger.params.VALUE === 'DATE-TIME' || trigger.params.RELATED === 'END') return []
      const before = -Temporal.Duration.from(trigger.value).total({ unit: 'minutes', relativeTo: Temporal.PlainDate.from('2000-01-01') })
      return before >= 0 ? [before] : []
    })
  return minutes.length ? minutes : undefined
}

const statusOf = (event: Component, cancelled: boolean) =>
  cancelled ? 'cancelled' : (statuses.find(known => known === text(event, 'STATUS')?.toLowerCase()) ?? 'confirmed')

export const eventOf = (event: Component, zone: string, cancelled: boolean): Event | undefined => {
  const uid = text(event, 'UID')
  const begins = property(event, 'DTSTART')
  if (!uid || !begins) return
  const start = when(begins, zone)
  const recurrence = recurrenceOf(event.properties, zone)
  const original = property(event, 'RECURRENCE-ID')
  const organizer = property(event, 'ORGANIZER')
  const attendees = event.properties.filter(found => found.name === 'ATTENDEE').map(attendee)
  const location = text(event, 'LOCATION')
  const notes = text(event, 'DESCRIPTION')
  const alarms = reminders(event)
  const sequence = Number(text(event, 'SEQUENCE'))
  return {
    uid,
    title: text(event, 'SUMMARY') ?? '',
    start,
    end: endOf(event, start, zone),
    status: statusOf(event, cancelled),
    ...(recurrence && { recurrence }),
    ...(original && { original: when(original, zone) }),
    ...(location && { location }),
    ...(notes && { notes }),
    ...(organizer && { organizer: person(organizer) }),
    ...(attendees.length > 0 && { attendees }),
    ...(text(event, 'TRANSP') === 'TRANSPARENT' && { free: true }),
    ...(alarms && { reminders: alarms }),
    ...(sequence > 0 && { sequence }),
  }
}

export const readCalendar = (ics: string, zone: string) => {
  const calendars = readComponents(ics).filter(component => component.name === 'VCALENDAR')
  return calendars.flatMap(calendar => {
    const cancelled = property(calendar, 'METHOD')?.value.toUpperCase() === 'CANCEL'
    return calendar.children.filter(child => child.name === 'VEVENT').flatMap(event => eventOf(event, zone, cancelled) ?? [])
  })
}

export const calendarName = (ics: string) => {
  const calendar = readComponents(ics).find(component => component.name === 'VCALENDAR')
  return calendar && text(calendar, 'X-WR-CALNAME')
}
