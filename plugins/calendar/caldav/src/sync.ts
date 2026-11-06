import type { RemoteEvent, SyncPage } from '@sand/calendar/contract'
import { readCalendar } from '@sand/ical'
import { DavError, type DavClient } from './dav'
import type { Collection } from './discover'
import { nameOf, remoteEvent } from './resource'
import { caldav, dav, escapeXml, namespaces, textOf } from './xml'

interface Delta {
  changed: URL[]
  gone: string[]
  token: string
  more?: boolean
  reset?: boolean
}

interface Seen {
  tag?: string
  etags: Record<string, string>
}

const batch = 100

const unchanged = (token: string): Delta => ({ changed: [], gone: [], token })

const bySyncToken = async (client: DavClient, collection: Collection, token: string | undefined, signal: AbortSignal): Promise<Delta> => {
  const body = `<d:sync-collection ${namespaces}><d:sync-token>${escapeXml(token ?? '')}</d:sync-token><d:sync-level>1</d:sync-level><d:prop><d:getetag/></d:prop></d:sync-collection>`
  const { root, members } = await client.report(collection.url, body, signal)
  const resources = members.filter(member => nameOf(member.href))
  return {
    changed: resources.filter(member => member.status !== 404).map(member => member.href),
    gone: resources.filter(member => member.status === 404).map(member => nameOf(member.href)),
    token: textOf(root, dav('sync-token')) ?? '',
    ...(members.some(member => member.status === 507) && { more: true }),
    ...(!token && { reset: true }),
  }
}

const tokenGone = (error: unknown) => error instanceof DavError && error.condition === dav('valid-sync-token')

const syncCollection = async (client: DavClient, collection: Collection, token: string | undefined, signal: AbortSignal) => {
  if (token && token === collection.tag) return unchanged(token)
  return bySyncToken(client, collection, token, signal).catch((error: unknown) => {
    if (!token || !tokenGone(error)) throw error
    return bySyncToken(client, collection, undefined, signal)
  })
}

const etagListing = `<c:calendar-query ${namespaces}><d:prop><d:getetag/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter></c:calendar-query>`

const hashOf = (etag: string) => Bun.hash(etag).toString(36)

const byEtags = async (client: DavClient, collection: Collection, token: string | undefined, signal: AbortSignal): Promise<Delta> => {
  const seen: Seen | undefined = token?.startsWith('{') ? JSON.parse(token) : undefined
  if (token && seen?.tag && seen.tag === collection.tag) return unchanged(token)
  const { members } = await client.report(collection.url, etagListing, signal)
  const listed = members.flatMap(member => {
    const etag = textOf(member.props, dav('getetag'))
    return nameOf(member.href) && etag ? [{ href: member.href, name: nameOf(member.href), hash: hashOf(etag) }] : []
  })
  const etags = Object.fromEntries(listed.map(({ name, hash }) => [name, hash]))
  const next: Seen = { ...(collection.tag && { tag: collection.tag }), etags }
  return {
    changed: listed.filter(({ name, hash }) => seen?.etags[name] !== hash).map(({ href }) => href),
    gone: Object.keys(seen?.etags ?? {}).filter(name => !(name in etags)),
    token: JSON.stringify(next),
    ...(!seen && { reset: true }),
  }
}

const multiget = async (client: DavClient, collection: Collection, hrefs: URL[], addresses: string[], signal: AbortSignal) => {
  const events: RemoteEvent[] = []
  for (let at = 0; at < hrefs.length; at += batch) {
    const listed = hrefs.slice(at, at + batch).map(href => `<d:href>${escapeXml(href.pathname)}</d:href>`)
    const body = `<c:calendar-multiget ${namespaces}><d:prop><d:getetag/><c:calendar-data/></d:prop>${listed.join('')}</c:calendar-multiget>`
    const { members } = await client.report(collection.url, body, signal)
    for (const { href, props } of members) {
      const ics = textOf(props, caldav('calendar-data'))
      if (ics) events.push(...readCalendar(ics, collection.calendar.zone).map(remoteEvent(nameOf(href), textOf(props, dav('getetag')), addresses)))
    }
  }
  return events
}

export const pullPage = async (client: DavClient, collection: Collection, addresses: string[], token: string | undefined, signal: AbortSignal): Promise<SyncPage> => {
  const delta = await (collection.sync ? syncCollection : byEtags)(client, collection, token, signal)
  return {
    events: await multiget(client, collection, delta.changed, addresses, signal),
    removed: [...delta.changed.map(nameOf), ...delta.gone],
    token: delta.token,
    ...(delta.more && { more: true }),
    ...(delta.reset && { reset: true }),
  }
}
