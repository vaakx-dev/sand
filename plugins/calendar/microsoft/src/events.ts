import type { Attendee, RemoteEvent, Response, When } from '@sand/calendar/contract'
import { instant, isDate, spans, type Range } from '@sand/ical'
import type { Answer, Guest, Item, Time } from './graph'
import { repeatBody, ruleOf } from './recurrence'
import { ianaZone, windowsZone } from './zones'

const answers: Record<Answer, Response> = {
  none: 'needs-action',
  notResponded: 'needs-action',
  organizer: 'accepted',
  tentativelyAccepted: 'tentative',
  accepted: 'accepted',
  declined: 'declined',
}

const whenOf = (time: Time, zone: string, allDay: boolean): When => {
  const plain = Temporal.PlainDateTime.from(time.dateTime)
  const local = plain.toZonedDateTime(ianaZone(time.timeZone) ?? 'UTC').withTimeZone(zone).toPlainDateTime()
  if (!allDay) return { time: local.toString({ smallestUnit: 'second' }), zone }
  const midnight = Temporal.PlainTime.compare(plain.toPlainTime(), new Temporal.PlainTime()) === 0
  return { date: (midnight ? plain : local).toPlainDate().toString() }
}

const zoneOf = (item: Item) => ianaZone(item.recurrence?.range.recurrenceTimeZone) ?? ianaZone(item.originalStartTimeZone) ?? 'UTC'

const originalOf = (item: Item, zone: string, start: When): When => {
  if (item.type !== 'exception' || !item.originalStart) return start
  const at = Temporal.Instant.from(item.originalStart).toZonedDateTimeISO(zone)
  return isDate(start) ? { date: at.toPlainDate().toString() } : { time: at.toPlainDateTime().toString({ smallestUnit: 'second' }), zone }
}

const attendeeOf = ({ emailAddress: { address, name }, status, type }: Guest): Attendee[] =>
  address ? [{ email: address, ...(name && { name }), response: answers[status?.response ?? 'none'], ...(type === 'optional' && { optional: true }) }] : []

export const eventOf = (item: Item): RemoteEvent => {
  const zone = zoneOf(item)
  const allDay = Boolean(item.isAllDay)
  const start = whenOf(item.start, zone, allDay)
  const series = item.type === 'seriesMaster' ? undefined : item.seriesMasterId
  const organizer = item.organizer?.emailAddress
  const attendees = (item.attendees ?? []).flatMap(attendeeOf)
  const notes = item.body?.content.trim()
  const response = item.isOrganizer || !item.responseStatus ? undefined : answers[item.responseStatus.response]
  return {
    id: item.id,
    uid: item.iCalUId ?? item.id,
    title: item.subject ?? '',
    start,
    end: whenOf(item.end, ianaZone(item.originalEndTimeZone) ?? zone, allDay),
    status: item.isCancelled ? 'cancelled' : 'confirmed',
    ...(item.recurrence && { recurrence: { rule: ruleOf(item.recurrence, start) } }),
    ...(series && { series, original: originalOf(item, zone, start) }),
    ...(item.location?.displayName && { location: item.location.displayName }),
    ...(notes && { notes }),
    ...(organizer?.address && { organizer: { email: organizer.address, ...(organizer.name && { name: organizer.name }) } }),
    ...(attendees.length > 0 && { attendees }),
    ...(item.showAs === 'free' && { free: true }),
    ...(item.isReminderOn && item.reminderMinutesBeforeStart !== undefined && { reminders: [item.reminderMinutesBeforeStart] }),
    ...(response && { response }),
    ...(item['@odata.etag'] && { etag: item['@odata.etag'] }),
  }
}

export const originOf = (item: Item) => {
  const { start, original } = eventOf(item)
  return original ?? start
}

const keyOf = (when: When) => (isDate(when) ? when.date : String(instant(when, 'UTC')))

export const seriesOf = (item: Item, present: Item[], range: Range): RemoteEvent => {
  const master = eventOf(item)
  if (!master.recurrence) return master
  const taken = new Set(present.map(instance => keyOf(originOf(instance))))
  const exdates = spans(master, range, 'UTC')
    .map(span => span.start)
    .filter(start => !taken.has(keyOf(start)))
  return exdates.length ? { ...master, recurrence: { ...master.recurrence, exdates } } : master
}

const timeOf = (when: When, zone: string): Time =>
  isDate(when) ? { dateTime: `${when.date}T00:00:00`, timeZone: windowsZone(zone) } : { dateTime: when.time, timeZone: windowsZone(when.zone) }

export const bodyOf = (event: Omit<RemoteEvent, 'id'>, zone: string) => {
  if ((event.reminders?.length ?? 0) > 1) throw new Error('Outlook keeps one reminder per event')
  const [reminder] = event.reminders ?? []
  return {
    subject: event.title,
    start: timeOf(event.start, zone),
    end: timeOf(event.end, zone),
    isAllDay: isDate(event.start),
    location: { displayName: event.location ?? '' },
    body: { contentType: 'text', content: event.notes ?? '' },
    attendees: (event.attendees ?? []).map(({ email, name, optional }) => ({ emailAddress: { address: email, ...(name && { name }) }, type: optional ? 'optional' : 'required' })),
    showAs: event.free ? 'free' : 'busy',
    isReminderOn: reminder !== undefined,
    ...(reminder !== undefined && { reminderMinutesBeforeStart: reminder }),
    ...(!event.series && { recurrence: event.recurrence ? repeatBody(event.recurrence, event.start, zone) : null }),
  }
}

const timing = new Set(['start', 'end', 'isAllDay'])

export const changes = (current: Record<string, unknown>, next: Record<string, unknown>) => {
  const changed = Object.keys(next).filter(key => !Bun.deepEquals(current[key], next[key]))
  const keys = changed.some(key => timing.has(key)) ? new Set([...changed, ...timing]) : changed
  return Object.fromEntries([...keys].map(key => [key, next[key]]))
}
