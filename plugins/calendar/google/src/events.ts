import type { RemoteEvent, Response, When } from '@sand/calendar/contract'
import { instant, isDate, readRecurrence, validZone, writeRecurrence, zoneOf } from '@sand/ical'
import type { Answer, Item, Reminders, Time } from './google'

const responses = { needsAction: 'needs-action', accepted: 'accepted', declined: 'declined', tentative: 'tentative' } as const satisfies Record<Answer, Response>

export const answers = { 'needs-action': 'needsAction', accepted: 'accepted', declined: 'declined', tentative: 'tentative' } as const satisfies Record<Response, Answer>

const whenOf = (time: Time, zone: string): When => {
  if ('date' in time) return { date: time.date }
  const own = validZone(time.timeZone ?? zone) ?? zone
  return { time: Temporal.Instant.from(time.dateTime).toZonedDateTimeISO(own).toPlainDateTime().toString({ smallestUnit: 'second' }), zone: own }
}

const timeOf = (when: When): Time => (isDate(when) ? { date: when.date } : { dateTime: when.time, timeZone: when.zone })

const remindersOf = (reminders: Reminders | undefined) => (reminders && !reminders.useDefault ? (reminders.overrides ?? []).map(({ minutes }) => minutes) : undefined)

const cancelledOf = (item: Item, series: string, original: When): RemoteEvent => ({
  id: item.id,
  uid: item.iCalUID ?? series,
  title: item.summary ?? '',
  start: original,
  end: original,
  status: 'cancelled',
  series,
  original,
  etag: item.etag,
})

export const eventOf = (item: Item, zone: string): RemoteEvent => {
  const series = item.recurringEventId
  const original = item.originalStartTime && whenOf(item.originalStartTime, zone)
  if (item.status === 'cancelled' && series && original) return cancelledOf(item, series, original)
  if (!item.start || !item.end) throw new Error(`Google Calendar sent event ${item.id} without a time`)
  const start = whenOf(item.start, zone)
  const recurrence = item.recurrence && readRecurrence(item.recurrence, zoneOf(start, zone))
  const attendees = item.attendees
    ?.filter(attendee => !attendee.resource)
    .map(({ email, displayName, responseStatus, optional }) => ({ email, ...(displayName && { name: displayName }), response: responses[responseStatus], ...(optional && { optional }) }))
  const meeting = Boolean(attendees?.length)
  const own = item.attendees?.find(attendee => attendee.self)
  const reminders = remindersOf(item.reminders)
  return {
    id: item.id,
    uid: item.iCalUID ?? item.id,
    title: item.summary ?? '',
    start,
    end: whenOf(item.end, zone),
    status: item.status,
    etag: item.etag,
    ...(recurrence && { recurrence }),
    ...(series && { series }),
    ...(original && { original }),
    ...(item.location && { location: item.location }),
    ...(item.description && { notes: item.description }),
    ...(meeting && { attendees }),
    ...(meeting && item.organizer && { organizer: { email: item.organizer.email, ...(item.organizer.displayName && { name: item.organizer.displayName }) } }),
    ...(own && { response: responses[own.responseStatus] }),
    ...(item.transparency === 'transparent' && { free: true }),
    ...(reminders && { reminders }),
    ...((item.sequence ?? 0) > 0 && { sequence: item.sequence }),
  }
}

export const bodyOf = (event: Omit<RemoteEvent, 'id'>) => ({
  summary: event.title,
  description: event.notes ?? null,
  location: event.location ?? null,
  start: timeOf(event.start),
  end: timeOf(event.end),
  status: event.status,
  transparency: event.free ? 'transparent' : 'opaque',
  attendees: (event.attendees ?? []).map(({ email, name, response, optional }) => ({
    email,
    ...(name && { displayName: name }),
    responseStatus: answers[response],
    ...(optional && { optional }),
  })),
  reminders: event.reminders ? { useDefault: false, overrides: event.reminders.map(minutes => ({ method: 'popup', minutes })) } : { useDefault: true },
  ...(!event.series && { recurrence: event.recurrence ? writeRecurrence(event.recurrence, event.start) : null }),
})

export const startOf = (when: When) => (isDate(when) ? when.date : new Date(instant(when, 'UTC')).toISOString())
