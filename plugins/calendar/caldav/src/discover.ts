import type { Capability, RemoteCalendar } from '@sand/calendar/contract'
import { validZone } from '@sand/ical'
import { DavError, type DavClient, type Member } from './dav'
import { apple, caldav, calendarserver, childOf, childrenOf, dav, type Element, textOf } from './xml'

export interface Principal {
  home: URL
  addresses: string[]
  schedule: boolean
}

export interface Collection {
  calendar: RemoteCalendar
  url: URL
  tag?: string
  sync: boolean
}

const hrefIn = (props: Element | undefined, name: string) => textOf(childOf(props, name), dav('href'))

const principalUrl = async (client: DavClient, server: URL, signal: AbortSignal) => {
  for (const start of [new URL('/.well-known/caldav', server), server]) {
    const found = await client.propfind(start, 0, '<d:current-user-principal/>', signal).catch((error: unknown) => {
      if (!(error instanceof DavError) || error.status === 401) throw error
    })
    const href = found && hrefIn(found.members[0]?.props, dav('current-user-principal'))
    if (found && href) return new URL(href, found.url)
  }
  throw new Error(`${server.host} doesn't offer CalDAV calendars`)
}

export const discover = async (client: DavClient, server: string, signal: AbortSignal): Promise<Principal> => {
  const principal = await principalUrl(client, new URL(server), signal)
  const { url, members } = await client.propfind(principal, 0, '<c:calendar-home-set/><c:calendar-user-address-set/>', signal)
  const props = members[0]?.props
  const home = hrefIn(props, caldav('calendar-home-set'))
  if (!home) throw new Error(`${principal.host} doesn't say where its calendars are`)
  const addresses = childrenOf(childOf(props, caldav('calendar-user-address-set')), dav('href')).flatMap(href => {
    const address = href.text.trim()
    return /^mailto:/i.test(address) ? [address.slice(7).toLowerCase()] : []
  })
  const homeUrl = new URL(home.endsWith('/') ? home : `${home}/`, url)
  const schedule = (await client.options(homeUrl, signal)).includes('calendar-auto-schedule')
  return { home: homeUrl, addresses, schedule }
}

const calendarProps = [
  '<d:resourcetype/>',
  '<d:displayname/>',
  '<a:calendar-color/>',
  '<c:calendar-timezone/>',
  '<c:supported-calendar-component-set/>',
  '<d:current-user-privilege-set/>',
  '<d:sync-token/>',
  '<cs:getctag/>',
].join('')

const writePrivileges = new Set([dav('write'), dav('write-content'), dav('all')])

const keyOf = (href: URL) => decodeURIComponent(href.pathname.replace(/\/$/, '').split('/').at(-1) ?? '')

const holdsEvents = ({ props }: Member) => {
  const components = childOf(props, caldav('supported-calendar-component-set'))
  return Boolean(childOf(childOf(props, dav('resourcetype')), caldav('calendar'))) && (!components || childrenOf(components, caldav('comp')).some(comp => comp.attributes.name === 'VEVENT'))
}

const writable = (props: Element) => {
  const privileges = childOf(props, dav('current-user-privilege-set'))
  return !privileges || childrenOf(privileges, dav('privilege')).some(privilege => privilege.children.some(child => writePrivileges.has(child.name)))
}

const zoneIn = (props: Element) => {
  const tzid = /^TZID[^:]*:(.+)$/m.exec(textOf(props, caldav('calendar-timezone')) ?? '')?.[1]
  return (tzid && validZone(tzid.trim())) || Temporal.Now.timeZoneId()
}

const colorIn = (props: Element) => /^#[\da-f]{6}/i.exec(textOf(props, apple('calendar-color')) ?? '')?.[0]

export const collections = async (client: DavClient, { home, addresses, schedule }: Principal, signal: AbortSignal): Promise<Collection[]> => {
  const { members } = await client.propfind(home, 1, calendarProps, signal)
  const found = members.filter(holdsEvents)
  const primary = found.find(member => writable(member.props))
  return found.map((member): Collection => {
    const { props, href } = member
    const key = keyOf(href)
    const color = colorIn(props)
    const write = writable(props)
    const capabilities: Capability[] = ['read', ...(write ? (['write'] as const) : []), ...(write && schedule ? (['invite'] as const) : [])]
    const syncToken = textOf(props, dav('sync-token'))
    const tag = syncToken ?? textOf(props, calendarserver('getctag'))
    return {
      calendar: {
        key,
        name: textOf(props, dav('displayname')) ?? key,
        zone: zoneIn(props),
        ...(color && { color }),
        ...(addresses[0] && { email: addresses[0] }),
        capabilities,
        primary: member === primary,
      },
      url: new URL(href.href.replace(/\/?$/, '/')),
      ...(tag && { tag }),
      sync: Boolean(syncToken),
    }
  })
}
