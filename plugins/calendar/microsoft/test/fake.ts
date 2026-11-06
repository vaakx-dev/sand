import type { Account, Connections, Kind } from '@sand/connections/contract'
import type { Entry, Item, Removed, Schedule, Time } from '../src/graph'

type Body = Partial<Item> & Record<string, unknown>

export interface Seen {
  method: string
  path: string
  query: Record<string, string>
  body?: Body
  prefer?: string
  etag?: string
}

export interface DeltaPage {
  value: (Item | Removed)[]
  next?: string
  delta?: string
}

export const zone = 'Europe/Berlin'

const today = Temporal.Now.plainDateISO('UTC')

export const monday = today.add({ days: 8 - today.dayOfWeek })

export const date = (days: number) => monday.add({ days }).toString()

const zoned = (day: string, time: string, where: string) => Temporal.PlainDateTime.from(`${day}T${time}`).toZonedDateTime(where)

export const utc = (day: string, time: string, where = zone): Time => ({
  dateTime: zoned(day, time, where).withTimeZone('UTC').toPlainDateTime().toString({ fractionalSecondDigits: 7 }),
  timeZone: 'UTC',
})

export const instantText = (day: string, time: string, where = zone) => zoned(day, time, where).toInstant().toString()

export const item = (fields: Pick<Item, 'id' | 'start' | 'end'> & Partial<Item>): Item => ({
  '@odata.etag': 'W/"1"',
  iCalUId: `uid-${fields.id}`,
  type: 'singleInstance',
  seriesMasterId: null,
  subject: '',
  body: { contentType: 'text', content: '' },
  originalStartTimeZone: 'W. Europe Standard Time',
  originalEndTimeZone: 'W. Europe Standard Time',
  isAllDay: false,
  isCancelled: false,
  isOrganizer: true,
  showAs: 'busy',
  isReminderOn: true,
  reminderMinutesBeforeStart: 15,
  location: { displayName: '' },
  organizer: { emailAddress: { name: 'Me', address: 'me@contoso.com' } },
  attendees: [],
  responseStatus: { response: 'organizer' },
  originalStart: null,
  recurrence: null,
  ...fields,
})

export const removed = (id: string): Removed => ({ id, '@removed': { reason: 'deleted' } })

export const calendarsOf = (): Entry[] => [
  { id: 'cal-main', name: 'Calendar', hexColor: '#3a96dd', isDefaultCalendar: true, canEdit: true, owner: { name: 'Me', address: 'me@contoso.com' } },
  { id: 'cal-team', name: 'Team', hexColor: '', isDefaultCalendar: false, canEdit: false, owner: { name: 'Team', address: 'team@contoso.com' } },
]

const answers: Record<string, 'accepted' | 'declined' | 'tentativelyAccepted'> = { accept: 'accepted', decline: 'declined', tentativelyAccept: 'tentativelyAccepted' }

const msOf = (time: Time) => Temporal.PlainDateTime.from(time.dateTime).toZonedDateTime('UTC').epochMilliseconds

export const fakeGraph = () => {
  const requests: Seen[] = []
  const events = new Map<string, Item>()
  const deltas = new Map<string, DeltaPage>()
  const schedules: Schedule[] = []
  const calendars = calendarsOf()
  let made = 0
  let version = 1

  const error = (status: number, code: string) => Response.json({ error: { code, message: code } }, { status })
  const stamped = (event: Item): Item => ({ ...event, '@odata.etag': `W/"${++version}"` })
  const found = (id: string) => events.get(id) ?? error(404, 'ErrorItemNotFound')

  const delta = (origin: string, calendar: string, query: Record<string, string>) => {
    const token = query.$deltatoken ?? query.$skiptoken ?? 'start'
    const page = deltas.get(`${calendar}:${token}`)
    if (!page) return error(410, 'SyncStateNotFound')
    const link = `${origin}/v1.0/me/calendars/${calendar}/calendarView/delta`
    return Response.json({
      value: page.value,
      ...(page.next ? { '@odata.nextLink': `${link}?$skiptoken=${page.next}` } : { '@odata.deltaLink': `${link}?$deltatoken=${page.delta}` }),
    })
  }

  const instances = (series: string, query: Record<string, string>) => {
    const from = Date.parse(query.startDateTime ?? '')
    const to = Date.parse(query.endDateTime ?? '')
    const value = [...events.values()].filter(event => event.seriesMasterId === series && msOf(event.start) < to && msOf(event.end) > from)
    return Response.json({ value })
  }

  const create = ({ start, end, ...body }: Body) => {
    if (!start || !end) return error(400, 'ErrorInvalidRequest')
    const id = `new-${++made}`
    const type = body.recurrence ? 'seriesMaster' : 'singleInstance'
    const event = stamped(item({ ...body, id, start, end, type, originalStartTimeZone: start.timeZone, originalEndTimeZone: end.timeZone }))
    events.set(id, event)
    return Response.json(event, { status: 201 })
  }

  const patch = (id: string, body: Body, etag: string | undefined) => {
    const event = events.get(id)
    if (!event) return error(404, 'ErrorItemNotFound')
    if (etag && etag !== event['@odata.etag']) return error(412, 'ErrorIrresolvableConflict')
    const next = stamped({ ...event, ...body, ...(event.type === 'occurrence' && { type: 'exception' as const }) })
    events.set(id, next)
    return Response.json(next)
  }

  const answer = (id: string, action: string) => {
    const event = events.get(id)
    const response = answers[action]
    if (!event || !response) return error(404, 'ErrorItemNotFound')
    events.set(id, stamped({ ...event, responseStatus: { response } }))
    return new Response(null, { status: 202 })
  }

  const route = (request: Request, parts: string[], query: Record<string, string>, body: Body | undefined, origin: string) => {
    const [me, collection, id, sub, leaf] = parts
    const method = request.method
    if (me !== 'me') return error(404, 'ResourceNotFound')
    if (collection === 'calendar' && !id && method === 'GET') return Response.json({ owner: { name: 'Me', address: 'me@contoso.com' } })
    if (collection === 'calendar' && id === 'getSchedule') return Response.json({ value: schedules })
    if (collection === 'calendars' && !id) return Response.json({ value: calendars })
    if (collection === 'calendars' && id && sub === 'calendarView' && leaf === 'delta') return delta(origin, id, query)
    if (collection === 'calendars' && sub === 'events' && method === 'POST' && body) return create(body)
    if (collection !== 'events' || !id) return error(404, 'ResourceNotFound')
    if (sub === 'instances') return instances(id, query)
    if (sub && method === 'POST') return answer(id, sub)
    if (method === 'GET') {
      const event = found(id)
      return event instanceof Response ? event : Response.json(event)
    }
    if (method === 'PATCH') return patch(id, body ?? {}, request.headers.get('if-match') ?? undefined)
    if (method === 'DELETE') return events.delete(id) ? new Response(null, { status: 204 }) : error(404, 'ErrorItemNotFound')
    return error(405, 'MethodNotAllowed')
  }

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      const text = await request.text()
      const body: Body | undefined = text ? JSON.parse(text) : undefined
      const query = Object.fromEntries(url.searchParams)
      const parts = url.pathname.replace(/^\/v1\.0\//, '').split('/').map(decodeURIComponent)
      requests.push({
        method: request.method,
        path: parts.join('/'),
        query,
        ...(body && { body }),
        ...(request.headers.get('prefer') && { prefer: request.headers.get('prefer') ?? '' }),
        ...(request.headers.get('if-match') && { etag: request.headers.get('if-match') ?? '' }),
      })
      return route(request, parts, query, body, url.origin)
    },
  })

  return {
    api: `http://127.0.0.1:${server.port}/v1.0`,
    requests,
    events,
    deltas,
    schedules,
    calendars,
    put(...items: Item[]) {
      for (const event of items) events.set(event.id, event)
    },
    seen: (method: string, path: string) => requests.filter(request => request.method === method && request.path === path),
    stop: () => server.stop(true),
  }
}

export type FakeGraph = ReturnType<typeof fakeGraph>

export const fakeConnections = (accounts: Account[]) => {
  const kinds: Kind[] = []
  const service: Connections = {
    kind(kind) {
      kinds.push(kind)
      return () => {}
    },
    accounts: kind => accounts.filter(account => !kind || account.kind === kind),
    fetch: (_account, url, init) => fetch(url, init),
    values: () => ({}),
    async disconnect() {},
  }
  return { service, kinds }
}
