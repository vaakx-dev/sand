import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { timeZone, type Calendars } from '../contract'
import { defaultEnd } from '../edit'
import { calendarField, eventFields, guestsOf, localZone, moment, pickCalendar, whenFrom } from './find'
import { spanText } from './format'

const input = z.object({
  title: z.string().min(1),
  start: moment.describe('A day (2026-11-07) for an all-day event, or a time (2026-11-07T13:00)'),
  end: moment.optional().describe('When it ends (default: an hour after a time, or the end of the day)'),
  zone: timeZone().optional().describe("Time zone of start and end, like Europe/Berlin (default: the user's)"),
  repeat: z.string().optional().describe('An iCalendar RRULE like FREQ=WEEKLY;BYDAY=MO,WE'),
  calendar: calendarField,
  ...eventFields,
})

type Input = z.output<typeof input>

const draftOf = ({ title, start, end, zone = localZone(), repeat, attendees, calendar: _, ...rest }: Input) => {
  const begins = whenFrom(start, zone)
  const guests = guestsOf(attendees)
  return {
    ...rest,
    title,
    start: begins,
    end: end ? whenFrom(end, zone) : defaultEnd(begins),
    ...(repeat && { recurrence: { rule: repeat } }),
    ...(guests && { attendees: guests }),
  }
}

export const createTool = (service: Calendars): Tool<typeof input> => ({
  name: 'calendar_create',
  description: "Add an event to the user's calendar. Adding guests sends them invitations when the calendar can.",
  group: 'calendar',
  input,
  effect: 'write',
  async run(given) {
    const target = pickCalendar(service, given.calendar)
    const event = await service.create(target?.id, draftOf(given))
    return `Added "${event.title}", ${spanText(event.start, event.end, localZone())} [id ${event.id}]`
  },
})
