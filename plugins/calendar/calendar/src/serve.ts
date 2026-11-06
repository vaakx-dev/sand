import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import {
  calendarAgenda,
  calendarChange,
  calendarChangeWire,
  calendarCreate,
  calendarList,
  calendarRemove,
  calendarRespond,
  type Calendars,
  calendarsChange,
  calendarsChangeWire,
  calendarUpdate,
} from './contract'

export const serveCalendars = (ctx: Context, service: Calendars) =>
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.handle(calendarList, () => service.list()),
      found.handle(calendarAgenda, query => service.agenda(query)),
      found.handle(calendarCreate, ({ calendar, event }) => service.create(calendar, event)),
      found.handle(calendarUpdate, ({ target, patch, scope }) => service.update(target, patch, scope)),
      found.handle(calendarRemove, ({ target, scope }) => service.remove(target, scope).then(() => true)),
      found.handle(calendarRespond, ({ target, response }) => service.respond(target, response)),
      ctx.on(calendarChange, change => found.broadcast(calendarChangeWire, change)),
      ctx.on(calendarsChange, list => found.broadcast(calendarsChangeWire, list)),
    )
  })
