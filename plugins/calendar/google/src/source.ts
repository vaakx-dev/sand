import type { Capability, RemoteCalendar, Source, SyncPage, When } from '@sand/calendar/contract'
import type { Authorized } from '@sand/connections/contract'
import { zoneOf } from '@sand/ical'
import { answers, bodyOf, eventOf, startOf } from './events'
import { call, statusOf, type Entries, type Entry, type Events, type FreeBusy, type Item } from './google'

const poll = 5 * 60_000

const history = 365 * 24 * 3_600_000

const writers = new Set<Entry['accessRole']>(['owner', 'writer'])

const capabilitiesOf = (entry: Entry, readOnly: boolean): Capability[] => {
  if (entry.accessRole === 'freeBusyReader') return ['freebusy']
  if (readOnly || !writers.has(entry.accessRole)) return ['read', 'freebusy']
  return ['read', 'write', 'invite', 'freebusy']
}

const calendarOf = (entry: Entry, readOnly: boolean): RemoteCalendar => ({
  key: entry.id,
  name: entry.summaryOverride ?? entry.summary,
  zone: entry.timeZone,
  ...(entry.backgroundColor && { color: entry.backgroundColor }),
  ...((entry.primary || entry.accessRole === 'owner') && { email: entry.id }),
  capabilities: capabilitiesOf(entry, readOnly),
  primary: Boolean(entry.primary),
})

const fullSync = () => new URLSearchParams({ timeMin: new Date(Date.now() - history).toISOString() })

const nextQuery = (list: Events, query: URLSearchParams) => {
  if (list.nextPageToken) {
    const next = new URLSearchParams(query)
    next.set('pageToken', list.nextPageToken)
    return next
  }
  if (!list.nextSyncToken) throw new Error('Google Calendar ended a sync without a sync token')
  return new URLSearchParams({ syncToken: list.nextSyncToken })
}

const pageOf = (list: Events, query: URLSearchParams): SyncPage => {
  const gone = (item: Item) => item.status === 'cancelled' && !item.recurringEventId
  const removed = new Set(list.items.filter(gone).map(item => item.id))
  const kept = list.items.filter(item => !gone(item) && !(item.recurringEventId && removed.has(item.recurringEventId)))
  return {
    events: kept.map(item => eventOf(item, list.timeZone)),
    removed: [...removed],
    token: nextQuery(list, query).toString(),
    ...(list.nextPageToken && { more: true }),
    ...(!query.has('syncToken') && !query.has('pageToken') && { reset: true }),
  }
}

const sendUpdates = (notify: boolean) => ({ sendUpdates: notify ? 'all' : 'none' })

export interface Account {
  fetch: Authorized
  api: string
  readOnly: boolean
}

export const createSource = ({ fetch, api, readOnly }: Account): Source => {
  const url = (path: string, params: Record<string, string> = {}) => {
    const found = new URL(`${api}/${path}`)
    for (const [key, value] of Object.entries(params)) found.searchParams.set(key, value)
    return found
  }

  const events = (calendar: string, ...path: string[]) => ['calendars', calendar, 'events', ...path].map(encodeURIComponent).join('/')

  const entries = async (signal: AbortSignal) => {
    const all: Entry[] = []
    let pageToken: string | undefined
    do {
      const page = await call<Entries>(fetch, url('users/me/calendarList', pageToken ? { pageToken } : {}), { signal })
      all.push(...page.items)
      pageToken = page.nextPageToken
    } while (pageToken)
    return all
  }

  const list = (calendar: string, query: URLSearchParams, signal: AbortSignal) =>
    call<Events>(fetch, url(events(calendar), { singleEvents: 'false', showDeleted: 'true', maxResults: '2500', ...Object.fromEntries(query) }), { signal })

  const sync = async (calendar: string, token: string | undefined, signal: AbortSignal): Promise<SyncPage> => {
    const query = token ? new URLSearchParams(token) : fullSync()
    try {
      return pageOf(await list(calendar, query, signal), query)
    } catch (error) {
      if (!token || statusOf(error) !== 410) throw error
      return sync(calendar, undefined, signal)
    }
  }

  const patch = async (calendar: string, id: string, body: object, notify: boolean, zone: string, etag?: string) =>
    eventOf(await call<Item>(fetch, url(events(calendar, id), sendUpdates(notify)), { method: 'PATCH', body, etag }), zone)

  const instance = async (calendar: string, series: string, original: When) => {
    const found = await call<Events>(fetch, url(events(calendar, series, 'instances'), { originalStart: startOf(original), showDeleted: 'true' }))
    const [first] = found.items
    if (!first) throw new Error('That occurrence is not in Google Calendar any more')
    return first
  }

  return {
    poll,
    calendars: async signal => (await entries(signal)).filter(entry => !entry.deleted && !entry.hidden).map(entry => calendarOf(entry, readOnly)),
    sync,
    async create(calendar, event, notify) {
      const zone = zoneOf(event.start, 'UTC')
      if (event.series && event.original) {
        const found = await instance(calendar, event.series, event.original)
        return patch(calendar, found.id, bodyOf(event), notify, zone, found.etag)
      }
      return eventOf(await call<Item>(fetch, url(events(calendar), sendUpdates(notify)), { method: 'POST', body: bodyOf(event) }), zone)
    },
    update: (calendar, event, notify) => patch(calendar, event.id, bodyOf(event), notify, zoneOf(event.start, 'UTC'), event.etag),
    async remove(calendar, event, notify) {
      await call(fetch, url(events(calendar, event.id), sendUpdates(notify)), { method: 'DELETE', etag: event.etag }).catch((error: unknown) => {
        if (statusOf(error) !== 410) throw error
      })
    },
    respond: (calendar, event, response, notify) =>
      patch(calendar, event.id, { attendeesOmitted: true, attendees: [{ email: calendar, responseStatus: answers[response] }] }, notify, zoneOf(event.start, 'UTC')),
    async freeBusy(people, { from, to }, signal) {
      const body = { timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), items: people.map(id => ({ id })) }
      const { calendars } = await call<FreeBusy>(fetch, url('freeBusy'), { method: 'POST', body, signal })
      return Object.fromEntries(people.map(person => [person, (calendars[person]?.busy ?? []).map(({ start, end }) => ({ from: Date.parse(start), to: Date.parse(end) }))]))
    },
  }
}
