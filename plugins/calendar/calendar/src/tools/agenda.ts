import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Calendars } from '../contract'
import { calendarField, instantOf, localZone, moment, pickCalendar } from './find'
import { dayText, lineOf } from './format'

const input = z.object({
  from: moment.optional().describe('First day or time to show (default: now)'),
  to: moment.optional().describe('Show events starting before this (default: a week after from)'),
  calendar: calendarField.describe('Only this calendar (default: all)'),
})

const week = 7 * 86_400_000

export const agendaTool = (service: Calendars): Tool<typeof input> => ({
  name: 'calendar_agenda',
  description:
    "List the user's events between two moments, across their calendars, with each event's id. Repeating events show one line per occurrence. Use it before changing events, and to answer what's coming up.",
  group: 'calendar',
  effect: 'read',
  input,
  run({ from, to, calendar }) {
    const zone = localZone()
    const start = from ? instantOf(from, zone) : Date.now()
    const end = to ? instantOf(to, zone) : start + week
    const chosen = pickCalendar(service, calendar)
    const all = service.list()
    const names = new Map(all.map(other => [other.id, other.name]))
    const events = service.agenda({ from: start, to: end, zone, ...(chosen && { calendars: [chosen.id] }) })
    const head = `Times in ${zone}. ${dayText(start, zone)} to ${dayText(end - 1, zone)}.`
    if (!events.length) return `${head}\nNo events.`
    const days = Map.groupBy(events, event => dayText(Math.max(event.from, start), zone))
    const lines = [...days].flatMap(([day, list]) => [day, ...list.map(event => lineOf(event, zone, all.length > 1 ? names.get(event.calendar) : undefined))])
    return [head, ...lines].join('\n')
  },
})
