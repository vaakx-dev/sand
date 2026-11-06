import type { Event } from '../event'
import { sameWhen } from '../when'
import { type Component, type Property, readComponents, writeLine } from './lines'
import { eventOf } from './read'
import { writeCalendar } from './write'

const modeled = new Set([
  'UID',
  'DTSTAMP',
  'DTSTART',
  'DTEND',
  'DURATION',
  'RECURRENCE-ID',
  'RRULE',
  'EXDATE',
  'RDATE',
  'SUMMARY',
  'LOCATION',
  'DESCRIPTION',
  'STATUS',
  'TRANSP',
  'SEQUENCE',
  'ORGANIZER',
  'ATTENDEE',
])

const writeComponent = ({ name, properties, children }: Component): string[] => [
  `BEGIN:${name}`,
  ...properties.map(found => writeLine(found.name, found.value, found.params)),
  ...children.flatMap(writeComponent),
  `END:${name}`,
]

const emailOf = (found: Property) => found.value.replace(/^mailto:/i, '').toLowerCase()

const optional = (found: Property) => found.params.ROLE === 'OPT-PARTICIPANT'

const person = (fresh: Property, old: Component): Property => {
  const before = old.properties.find(found => found.name === fresh.name && emailOf(found) === emailOf(fresh))
  if (!before) return fresh
  const { ROLE, ...params } = fresh.params
  return { ...fresh, params: { ...before.params, ...params, ...(ROLE && optional(before) !== optional(fresh) && { ROLE }) } }
}

const merged = (fresh: Component, event: Event, old: { component: Component; event: Event } | undefined): Component => {
  if (!old) return fresh
  const sameAlarms = String(old.event.reminders ?? []) === String(event.reminders ?? [])
  const { component } = old
  return {
    name: fresh.name,
    properties: [
      ...fresh.properties.map(found => (found.name === 'ATTENDEE' || found.name === 'ORGANIZER' ? person(found, component) : found)),
      ...component.properties.filter(found => !modeled.has(found.name)),
    ],
    children: sameAlarms ? component.children : [...fresh.children, ...component.children.filter(child => child.name !== 'VALARM')],
  }
}

export const sameInstance = (a: Event, b: Event) => a.uid === b.uid && (a.original && b.original ? sameWhen(a.original, b.original) : a.original === b.original)

export const updateCalendar = (ics: string, events: Event[], { stamp, zone }: { stamp: number; zone: string }) => {
  const written = writeCalendar(events, { stamp })
  const old = readComponents(ics).find(component => component.name === 'VCALENDAR')
  if (!old) return written
  const fresh = readComponents(written)[0]!
  const before = old.children.flatMap(component => {
    const event = component.name === 'VEVENT' ? eventOf(component, zone, false) : undefined
    return event ? [{ component, event }] : []
  })
  const freshEvents = fresh.children.filter(child => child.name === 'VEVENT')
  const calendar: Component = {
    name: old.name,
    properties: old.properties,
    children: [
      ...fresh.children.filter(child => child.name === 'VTIMEZONE'),
      ...old.children.filter(child => child.name !== 'VEVENT' && child.name !== 'VTIMEZONE'),
      ...events.map((event, index) => merged(freshEvents[index]!, event, before.find(other => sameInstance(other.event, event)))),
    ],
  }
  return [...writeComponent(calendar), ''].join('\r\n')
}
