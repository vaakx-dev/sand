import { request, type, wireEvent } from '@sand/host-hub/contract'
import { responses, statuses, validZone, type Event, type Range, type Response, type When } from '@sand/ical'
import { lazy } from '@sand/util'
import { event, service, type Dispose } from 'drydock'
import { z } from 'zod'

export type { Attendee, Event, Person, Range, Recurrence, Response, Status, When } from '@sand/ical'

export const capabilities = ['read', 'write', 'invite', 'freebusy'] as const

export type Capability = (typeof capabilities)[number]

export interface Calendar {
  id: string
  provider: string
  name: string
  color?: string
  zone: string
  email?: string
  capabilities: Capability[]
  primary: boolean
}

export interface CalendarEvent extends Event {
  id: string
  calendar: string
  series?: string
  response?: Response
  etag?: string
  updated: number
}

export interface Occurrence extends CalendarEvent {
  from: number
  to: number
}

export interface Busy {
  from: number
  to: number
}

export interface Target {
  calendar: string
  id: string
  original?: When
}

export interface CalendarChange {
  calendar: string
  changed: string[]
  removed: string[]
}

export const notifies = (calendar: Calendar | undefined, event: { attendees?: unknown[] } | undefined) =>
  Boolean(calendar?.capabilities.includes('invite') && event?.attendees?.length)

export const timeZone = lazy(() => z.string().refine(value => validZone(value) !== undefined, 'Not a known time zone'))

export const when = lazy(() => z.union([
  z.object({ date: z.iso.date() }).strict(),
  z.object({ time: z.iso.datetime({ local: true }), zone: timeZone() }).strict(),
]))

const person = lazy(() => z.object({ email: z.email(), name: z.string().max(200).optional() }))

const attendee = lazy(() => person().extend({ response: z.enum(responses).optional(), optional: z.boolean().optional() }))

const recurrence = lazy(() => z.object({ rule: z.string().min(6).max(500), exdates: z.array(when()).optional(), rdates: z.array(when()).optional() }))

export const eventDraft = lazy(() => z.object({
  title: z.string().trim().min(1).max(500),
  start: when(),
  end: when(),
  recurrence: recurrence().optional(),
  location: z.string().max(2000).optional(),
  notes: z.string().max(20_000).optional(),
  attendees: z.array(attendee()).max(200).optional(),
  status: z.enum(statuses).optional(),
  free: z.boolean().optional(),
  reminders: z.array(z.number().int().min(0).max(40_320)).max(10).optional(),
}))

export const eventPatch = lazy(() => eventDraft().partial().extend({ recurrence: recurrence().nullable().optional() }))

export type EventDraft = z.infer<ReturnType<typeof eventDraft>>

export type EventPatch = z.infer<ReturnType<typeof eventPatch>>

export const scopes = ['occurrence', 'following', 'series'] as const

export type Scope = (typeof scopes)[number]

export const agendaQuery = lazy(() => z.object({
  from: z.number(),
  to: z.number(),
  calendars: z.array(z.string()).optional(),
  zone: timeZone().optional(),
}))

export type AgendaQuery = z.infer<ReturnType<typeof agendaQuery>>

export type RemoteCalendar = Omit<Calendar, 'id' | 'provider'> & { key: string }

export type RemoteEvent = Omit<CalendarEvent, 'calendar' | 'updated'>

export interface SyncPage {
  events: RemoteEvent[]
  removed: string[]
  token: string
  more?: boolean
  reset?: boolean
}

export interface Source {
  poll: number
  calendars(signal: AbortSignal): Promise<RemoteCalendar[]>
  sync(calendar: string, token: string | undefined, signal: AbortSignal): Promise<SyncPage>
  create?(calendar: string, event: Omit<RemoteEvent, 'id'>, notify: boolean): Promise<RemoteEvent>
  update?(calendar: string, event: RemoteEvent, notify: boolean): Promise<RemoteEvent>
  remove?(calendar: string, event: RemoteEvent, notify: boolean): Promise<void>
  respond?(calendar: string, event: RemoteEvent, response: Response, notify: boolean): Promise<RemoteEvent>
  freeBusy?(people: string[], range: Range, signal: AbortSignal): Promise<Record<string, Busy[]>>
}

export interface Provider {
  id: string
  label: string
  source?: Source
}

export interface NewCalendar {
  name: string
  zone: string
  color?: string
}

export interface Calendars {
  provide(provider: Provider): Dispose
  forget(provider: string): void
  list(): Calendar[]
  add(provider: string, calendar: NewCalendar): Calendar
  preferred(): Calendar | undefined
  agenda(query: AgendaQuery): Occurrence[]
  busy(query: AgendaQuery): Busy[]
  freeBusy(people: string[], range: Range): Promise<Record<string, Busy[]>>
  events(calendar: string): CalendarEvent[]
  get(calendar: string, id: string): CalendarEvent | undefined
  create(calendar: string | undefined, draft: EventDraft): Promise<CalendarEvent>
  update(target: Target, patch: EventPatch, scope: Scope): Promise<CalendarEvent>
  remove(target: Target, scope: Scope): Promise<void>
  respond(target: Target, response: Response): Promise<CalendarEvent>
  put(calendar: string, events: (Event & Pick<CalendarEvent, 'response'>)[]): CalendarChange
  sync(provider?: string): Promise<void>
}

export const calendars = service<Calendars>('calendars')

export const calendarChange = event<(change: CalendarChange) => void>('calendar.change')
export const calendarsChange = event<(list: Calendar[]) => void>('calendars.change')

export const calendarChangeWire = wireEvent<CalendarChange>('calendar.change')
export const calendarsChangeWire = wireEvent<Calendar[]>('calendars.change')

const target = lazy(() => z.object({ calendar: z.string(), id: z.string(), original: when().optional() }))

export const answers = ['accepted', 'declined', 'tentative'] as const satisfies Response[]

export type Answer = (typeof answers)[number]

export const calendarList = request('calendar.list', { input: () => z.object({}), output: type<Calendar[]>() })
export const calendarAgenda = request('calendar.agenda', { input: agendaQuery, output: type<Occurrence[]>() })
export const calendarCreate = request('calendar.create', {
  input: () => z.object({ calendar: z.string().optional(), event: eventDraft() }),
  output: type<CalendarEvent>(),
})
export const calendarUpdate = request('calendar.update', {
  input: () => z.object({ target: target(), patch: eventPatch(), scope: z.enum(scopes) }),
  output: type<CalendarEvent>(),
})
export const calendarRemove = request('calendar.remove', { input: () => z.object({ target: target(), scope: z.enum(scopes) }), output: type<boolean>() })
export const calendarRespond = request('calendar.respond', { input: () => z.object({ target: target(), response: z.enum(answers) }), output: type<CalendarEvent>() })
