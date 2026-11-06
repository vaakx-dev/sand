import { calendars } from '@sand/calendar/contract'
import { connections, eachAccount } from '@sand/connections/contract'
import { definePlugin } from 'drydock'
import { kinds } from './kinds'
import { caldavSource } from './source'

export default definePlugin({
  name: 'calendar-caldav',
  description: 'Calendars on CalDAV servers, like iCloud with an app-specific password, Fastmail or any other: synced in the background, with edits and invitations',
  inject: { calendars, connections },
  apply(ctx) {
    for (const { kind, login } of kinds) {
      ctx.effect(() => ctx.connections.kind(kind))
      eachAccount(ctx, ctx.connections, kind.id, {
        start: account => ctx.calendars.provide({ id: account.id, label: account.name, source: caldavSource(login(ctx.connections.values(account.id))) }),
        removed: account => ctx.calendars.forget(account.id),
      })
    }
  },
})
