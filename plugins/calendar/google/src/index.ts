import { calendars } from '@sand/calendar/contract'
import { connections, eachAccount } from '@sand/connections/contract'
import { definePlugin } from 'drydock'
import { google, kindId, kindOf, type Endpoints } from './kind'
import { createSource } from './source'

export const googleCalendar = (endpoints: Endpoints) =>
  definePlugin({
    name: 'calendar-google',
    description: "Google Calendar through the user's own Google Cloud OAuth client: incremental sync, edits, invitation answers and free/busy",
    inject: { connections, calendars },
    apply(ctx) {
      const { connections: accounts, calendars: service } = ctx
      ctx.effect(() => accounts.kind(kindOf(endpoints)))
      eachAccount(ctx, accounts, kindId, {
        start: account =>
          service.provide({
            id: account.id,
            label: account.name,
            source: createSource({ fetch: (url, init) => accounts.fetch(account.id, url, init), api: endpoints.api, readOnly: account.readOnly }),
          }),
        removed: account => service.forget(account.id),
      })
    },
  })

export default googleCalendar(google)
