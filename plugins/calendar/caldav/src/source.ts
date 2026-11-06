import type { Response, Source } from '@sand/calendar/contract'
import { readCalendar, sameInstance, updateCalendar, writeCalendar, type Event } from '@sand/ical'
import { davClient, type Login } from './dav'
import { collections, discover, type Collection, type Principal } from './discover'
import { mine, remoteEvent } from './resource'
import { pullPage } from './sync'

interface Written {
  etag?: string
  events: Event[]
}

const timeout = () => AbortSignal.timeout(60_000)

const replaced = (event: Event) => (events: Event[]) => {
  const at = events.findIndex(other => sameInstance(other, event))
  return at < 0 ? [...events, event] : events.with(at, event)
}

const answered = (event: Event, addresses: string[], response: Response) => (events: Event[]) => {
  const current = events.find(other => sameInstance(other, event))
  if (!current) throw new Error(`${event.title} is gone from the server`)
  if (!current.attendees?.some(guest => mine(addresses, guest.email))) throw new Error(`You aren't on the guest list of ${event.title}`)
  const attendees = current.attendees.map(guest => (mine(addresses, guest.email) ? { ...guest, response } : guest))
  return replaced({ ...current, attendees })(events)
}

export const caldavSource = (login: Login): Source => {
  const client = davClient(login)
  const known = new Map<string, Collection>()
  let principal: Promise<Principal> | undefined

  const account = () =>
    (principal ??= discover(client, login.server, timeout()).catch((error: unknown) => {
      principal = undefined
      throw error
    }))

  const list = async (signal: AbortSignal) => {
    const found = await collections(client, await account(), signal)
    known.clear()
    for (const collection of found) known.set(collection.calendar.key, collection)
    return found
  }

  const collection = async (key: string) => {
    const found = known.get(key) ?? (await list(timeout())).find(other => other.calendar.key === key)
    if (!found) throw new Error(`The CalDAV calendar ${key} is gone`)
    return found
  }

  const rewrite = async (key: string, name: string, change: (events: Event[]) => Event[], notify: boolean): Promise<Written> => {
    const { url, calendar } = await collection(key)
    const href = new URL(encodeURIComponent(name), url)
    const signal = timeout()
    const { ics, etag } = await client.get(href, signal)
    const events = change(readCalendar(ics, calendar.zone))
    const headers: Record<string, string> = { ...(etag && { 'if-match': etag }), ...(!notify && { 'schedule-reply': 'F' }) }
    if (!events.length) {
      await client.delete(href, headers, signal)
      return { events }
    }
    return { etag: await client.put(href, updateCalendar(ics, events, { stamp: Date.now(), zone: calendar.zone }), headers, signal), events }
  }

  const saved = async (name: string, { etag, events }: Written, target: Event) =>
    remoteEvent(name, etag, (await account()).addresses)(events.find(other => sameInstance(other, target))!)

  return {
    poll: 5 * 60_000,
    calendars: async signal => (await list(signal)).map(found => found.calendar),
    sync: async (key, token, signal) => pullPage(client, await collection(key), (await account()).addresses, token, signal),
    async create(key, event, notify) {
      if (event.series) return saved(event.series, await rewrite(key, event.series, replaced(event), notify), event)
      const name = `${crypto.randomUUID()}.ics`
      const href = new URL(name, (await collection(key)).url)
      const etag = await client.put(href, writeCalendar([event], { stamp: Date.now() }), { 'if-none-match': '*' }, timeout())
      return saved(name, { etag, events: [event] }, event)
    },
    async update(key, event, notify) {
      const name = event.series ?? event.id
      return saved(name, await rewrite(key, name, replaced(event), notify), event)
    },
    async remove(key, event, notify) {
      if (event.series) await rewrite(key, event.series, events => events.filter(other => !sameInstance(other, event)), notify)
      else await rewrite(key, event.id, () => [], notify)
    },
    async respond(key, event, response, notify) {
      const name = event.series ?? event.id
      return saved(name, await rewrite(key, name, answered(event, (await account()).addresses, response), notify), event)
    },
  }
}
