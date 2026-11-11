import { isDate, type When } from '@sand/ical'
import { z } from 'zod'
import { scopes, type Calendar, type CalendarEvent, type Calendars, type Target } from '../contract'

export const localZone = () => Temporal.Now.timeZoneId()

export const moment = z.union([z.iso.date(), z.iso.datetime({ local: true })])

export const whenFrom = (text: string, zone: string): When => (text.includes('T') ? { time: text, zone } : { date: text })

export const instantOf = (text: string, zone: string) =>
  (text.includes('T') ? Temporal.PlainDateTime.from(text) : Temporal.PlainDate.from(text).toPlainDateTime()).toZonedDateTime(zone).epochMilliseconds

export const calendarField = z.string().optional().describe('Calendar name or id (default: the main calendar)')

const named = (calendar: Calendar, name: string) => calendar.id === name || calendar.name.toLowerCase() === name.trim().toLowerCase()

const findCalendar = (service: Calendars, name: string) => service.list().find(calendar => named(calendar, name))

export const pickCalendar = (service: Calendars, name: string | undefined): Calendar | undefined => {
  if (!name) return
  const found = findCalendar(service, name)
  if (found) return found
  throw new Error(`No calendar called ${name}. Calendars: ${service.list().map(calendar => calendar.name).join(', ')}`)
}

export interface Found {
  calendar: Calendar
  event: CalendarEvent
}

const matches = (service: Calendars, id: string, calendar?: string): Found[] =>
  service
    .list()
    .filter(other => !calendar || named(other, calendar))
    .flatMap(other => {
      const event = service.get(other.id, id)
      return event ? [{ calendar: other, event }] : []
    })

export const locate = (service: Calendars, id: string, calendar?: string): Found => {
  const [found, other] = matches(service, id, calendar)
  if (!found) throw new Error(`No event with id ${id}. Look it up with calendar_agenda first.`)
  if (other) throw new Error(`Event ${id} is in more than one calendar; say which`)
  return found
}

export const targetOf = ({ calendar, event }: Found, occurrence: string | undefined): Target => ({
  calendar: calendar.id,
  id: event.id,
  ...(occurrence && { original: isDate(event.start) ? { date: occurrence.slice(0, 10) } : { time: occurrence, zone: event.start.zone } }),
})

export const eventFields = {
  location: z.string().optional(),
  notes: z.string().optional(),
  attendees: z.array(z.email()).optional().describe("Guests' email addresses"),
  reminders: z.array(z.number().int().min(0)).optional().describe('Remind this many minutes before'),
  free: z.boolean().optional().describe('Show the time as free instead of busy'),
}

export const guestsOf = (emails: string[] | undefined) => emails?.map(email => ({ email }))

export const eventRef = {
  id: z.string().describe('The event id from calendar_agenda'),
  calendar: calendarField.describe('Calendar name or id, only needed when the id is in more than one'),
  occurrence: moment.optional().describe('For a repeating event, the occurrence from calendar_agenda'),
  scope: z.enum(scopes).default('occurrence').describe('For a repeating event: just this occurrence, this and the following ones, or the whole series'),
}
