import type { RemoteEvent, Source, SyncPage } from '@sand/calendar/contract'
import { calendarName, readCalendar, whenKey, type Event } from '@sand/ical'

interface Seen {
  etag?: string
  hash: string
}

export const linkOf = (value: string | undefined) => {
  const link = (value ?? '').replace(/^webcals?:\/\//i, 'https://')
  if (!URL.canParse(link) || !/^https?:$/.test(new URL(link).protocol)) throw new Error('Enter a calendar link starting with https:// or webcal://')
  return new URL(link)
}

const download = (url: URL, etag: string | undefined, signal: AbortSignal) =>
  fetch(url, { headers: { accept: 'text/calendar', ...(etag && { 'if-none-match': etag }) }, signal })

const calendarText = async (url: URL, response: Response) => {
  if (!response.ok) throw new Error(`The calendar link at ${url.host} answered ${response.status}`)
  const ics = await response.text()
  if (!/^BEGIN:VCALENDAR/im.test(ics)) throw new Error(`The link at ${url.host} doesn't lead to a calendar`)
  return ics
}

export const linkName = async (url: URL, signal: AbortSignal) => {
  const ics = await calendarText(url, await download(url, undefined, signal))
  readCalendar(ics, 'UTC')
  return calendarName(ics) ?? url.host
}

const remoteEvent = (event: Event): RemoteEvent => ({
  ...event,
  id: event.original ? `${event.uid}~${whenKey(event.original)}` : event.uid,
  ...(event.original && { series: event.uid }),
})

const unchanged = (token: string): SyncPage => ({ events: [], removed: [], token })

export const feedSource = (url: URL, name: string): Source => {
  const zone = Temporal.Now.timeZoneId()
  return {
    poll: 30 * 60_000,
    calendars: async () => [{ key: 'link', name, zone, capabilities: ['read'], primary: false }],
    async sync(_calendar, token, signal) {
      const seen: Seen | undefined = token ? JSON.parse(token) : undefined
      const response = await download(url, seen?.etag, signal)
      if (token && response.status === 304) return unchanged(token)
      const ics = await calendarText(url, response)
      const etag = response.headers.get('etag')
      const next: Seen = { ...(etag && { etag }), hash: Bun.hash(ics).toString(36) }
      if (next.hash === seen?.hash) return unchanged(JSON.stringify(next))
      return { events: readCalendar(ics, zone).map(remoteEvent), removed: [], token: JSON.stringify(next), reset: true }
    },
  }
}
