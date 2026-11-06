import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { notifies, timeZone, type Attendee, type Calendars, type EventPatch } from '../contract'
import { eventFields, eventRef, localZone, locate, matches, moment, targetOf, whenFrom, type Found } from './find'
import { momentText, spanText } from './format'

const input = z.object({
  ...eventRef,
  title: z.string().min(1).optional(),
  start: moment.optional().describe('New start. Without an end the event keeps its length, so this moves it'),
  end: moment.optional(),
  zone: timeZone.optional().describe("Time zone of start and end (default: the event's, or the user's)"),
  repeat: z.string().optional().describe('New RRULE for the series, or an empty text to stop repeating'),
  ...eventFields,
})

type Input = z.output<typeof input>

const guests = (found: Found | undefined, emails: string[] | undefined): Attendee[] | undefined =>
  emails?.map(email => found?.event.attendees?.find(guest => guest.email === email) ?? { email, response: 'needs-action' })

const patchOf = (found: Found | undefined, { title, location, notes, reminders, free, start, end, zone, repeat, attendees }: Input): EventPatch => {
  const own = found && 'zone' in found.event.start ? found.event.start.zone : undefined
  const at = zone ?? own ?? localZone()
  const invited = guests(found, attendees)
  return {
    ...(title !== undefined && { title }),
    ...(location !== undefined && { location }),
    ...(notes !== undefined && { notes }),
    ...(reminders !== undefined && { reminders }),
    ...(free !== undefined && { free }),
    ...(start && { start: whenFrom(start, at) }),
    ...(end && { end: whenFrom(end, at) }),
    ...(repeat !== undefined && { recurrence: repeat ? { rule: repeat } : null }),
    ...(invited && { attendees: invited }),
  }
}

export const updateTool = (service: Calendars): Tool<typeof input> => ({
  name: 'calendar_update',
  description:
    'Change or move an event: give only what changes. Changing guests or details of an event with guests updates them when the calendar can.',
  group: 'calendar',
  input,
  act(given) {
    const [found] = matches(service, given.id, given.calendar)
    const patch = patchOf(found, given)
    const notify = notifies(found?.calendar, found?.event) || notifies(found?.calendar, patch)
    const when = patch.start ? ` to ${momentText(patch.start, localZone())}` : ''
    return { effect: notify ? 'send' : 'write', summary: `Change "${found?.event.title ?? given.id}"${when}${notify ? ' and tell its guests' : ''}` }
  },
  async run(given) {
    const found = locate(service, given.id, given.calendar)
    const event = await service.update(targetOf(found, given.occurrence), patchOf(found, given), given.scope)
    return `Changed "${event.title}", ${spanText(event.start, event.end, localZone())} [id ${event.id}]`
  },
})
