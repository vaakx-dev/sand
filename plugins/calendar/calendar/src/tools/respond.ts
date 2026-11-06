import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { answers, notifies, type Calendars } from '../contract'
import { calendarField, locate, matches } from './find'

const input = z.object({
  id: z.string().describe('The event id from calendar_agenda'),
  calendar: calendarField.describe('Calendar name or id, only needed when the id is in more than one'),
  response: z.enum(answers),
})

const said = { accepted: 'Accepted', declined: 'Declined', tentative: 'Answered maybe to' }

export const respondTool = (service: Calendars): Tool<typeof input> => ({
  name: 'calendar_respond',
  description: 'Answer an invitation: accept, decline or maybe. The organizer hears back when the calendar can tell them.',
  group: 'calendar',
  input,
  act({ id, calendar, response }) {
    const [found] = matches(service, id, calendar)
    const notify = notifies(found?.calendar, found?.event)
    return { effect: notify ? 'send' : 'write', summary: `${said[response]} "${found?.event.title ?? id}"${notify ? ' and tell the organizer' : ''}` }
  },
  async run({ id, calendar, response }) {
    const found = locate(service, id, calendar)
    const event = await service.respond({ calendar: found.calendar.id, id: found.event.id }, response)
    return `${said[response]} "${event.title}"`
  },
})
