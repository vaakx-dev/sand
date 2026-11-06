import type { RemoteEvent } from '@sand/calendar/contract'
import { whenKey, type Event } from '@sand/ical'

export const nameOf = (href: URL) => decodeURIComponent(href.pathname.slice(href.pathname.lastIndexOf('/') + 1))

export const mine = (addresses: string[], email: string) => addresses.includes(email.toLowerCase())

export const remoteEvent =
  (name: string, tag: string | undefined, addresses: string[]) =>
  ({ id, series, etag, response, ...event }: Event & Partial<RemoteEvent>): RemoteEvent => {
    const own = event.organizer && !mine(addresses, event.organizer.email) ? event.attendees?.find(guest => mine(addresses, guest.email)) : undefined
    return {
      ...event,
      id: event.original ? `${name}~${whenKey(event.original)}` : name,
      ...(event.original && { series: name }),
      ...(tag && { etag: tag }),
      ...(own && { response: own.response }),
    }
  }
