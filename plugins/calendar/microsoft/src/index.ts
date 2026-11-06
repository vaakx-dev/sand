import { calendars } from '@sand/calendar/contract'
import { connections, eachAccount } from '@sand/connections/contract'
import { definePlugin } from 'drydock'
import { kindId, kindOf, microsoft, type Endpoints } from './kind'
import { createSource } from './source'

export const microsoftCalendar = (endpoints: Endpoints) =>
  definePlugin({
    name: 'calendar-microsoft',
    description: "Outlook and Microsoft 365 calendars through Microsoft Graph with the user's own app registration: delta sync, edits, invitation answers and free/busy",
    inject: { connections, calendars },
    apply(ctx) {
      const { connections: accounts, calendars: service } = ctx
      ctx.effect(() => accounts.kind(kindOf(endpoints)))
      const stored = (account: string, id: string) =>
        service
          .list()
          .filter(calendar => calendar.provider === account)
          .flatMap(calendar => service.get(calendar.id, id) ?? [])[0]
      eachAccount(ctx, accounts, kindId, {
        start: account =>
          service.provide({
            id: account.id,
            label: account.name,
            source: createSource({
              fetch: (url, init) => accounts.fetch(account.id, url, init),
              api: endpoints.api,
              readOnly: account.readOnly,
              stored: id => stored(account.id, id),
            }),
          }),
        removed: account => service.forget(account.id),
      })
    },
  })

export default microsoftCalendar(microsoft)
