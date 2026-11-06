import { calendars, type Calendar } from '@sand/calendar/contract'
import { ledger } from '@sand/ledger/contract'
import { readCalendar, writeCalendar } from '@sand/ical'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { calendarExport, calendarFeed, calendarImport, feedPath, localProvider } from './contract'
import { createFeeds } from './feeds'

export default definePlugin({
  name: 'calendar-local',
  description: "Sand's own calendar, kept in sand's database: used when no other calendar is connected, with .ics import, export and a feed other apps can subscribe to",
  inject: { calendars, ledger },
  apply(ctx) {
    const service = ctx.calendars
    const feeds = createFeeds(ctx.ledger)
    ctx.effect(() => service.provide({ id: localProvider, label: 'Sand' }))
    const own = () => service.list().filter(calendar => calendar.provider === localProvider)
    if (!own().length) service.add(localProvider, { name: 'Calendar', zone: Temporal.Now.timeZoneId() })

    const calendar = (id: string | undefined) => {
      const found = own().find(other => (id ? other.id === id : other.primary))
      if (!found) throw new Error(id ? `${id} is not one of sand's own calendars` : "Sand's own calendar is missing")
      return found
    }

    const file = (target: Calendar) => writeCalendar(service.events(target.id), { name: target.name, stamp: Date.now() })

    const feed = (request: Request) => {
      const token = new URL(request.url).pathname.slice(feedPath.length).replace(/\.ics$/, '')
      const id = feeds.calendar(token)
      const target = id && own().find(other => other.id === id)
      if (!target) return new Response('not found', { status: 404 })
      return new Response(file(target), { headers: { 'content-type': 'text/calendar; charset=utf-8' } })
    }

    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(calendarImport, ({ calendar: id, ics }) => {
          const target = calendar(id)
          const invites = readCalendar(ics, target.zone).map(event => (event.organizer ? { ...event, response: 'needs-action' as const } : event))
          return service.put(target.id, invites).changed.length
        }),
        found.handle(calendarExport, ({ calendar: id }) => {
          const target = service.list().find(other => other.id === id)
          if (!target) throw new Error(`No calendar ${id}`)
          return file(target)
        }),
        found.handle(calendarFeed, ({ calendar: id }) => `${feedPath}${feeds.token(calendar(id).id)}.ics`),
        found.route(feedPath, feed, { public: true }),
      )
    })
  },
})
