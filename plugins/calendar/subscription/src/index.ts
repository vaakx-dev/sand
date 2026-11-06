import { calendars } from '@sand/calendar/contract'
import { connections, eachAccount } from '@sand/connections/contract'
import { definePlugin } from 'drydock'
import { feedSource, linkName, linkOf } from './feed'

const kind = 'calendar-link'

export default definePlugin({
  name: 'calendar-subscription',
  description: 'Read-only calendars from an .ics link, refreshed every half hour',
  inject: { calendars, connections },
  apply(ctx) {
    ctx.effect(() =>
      ctx.connections.kind({
        id: kind,
        label: 'Calendar link (.ics)',
        form: {
          fields: [{ key: 'url', label: 'Calendar link', placeholder: 'https://… or webcal://…' }],
          check: (values, signal) => linkName(linkOf(values.url), signal),
        },
      }),
    )
    eachAccount(ctx, ctx.connections, kind, {
      start: account => ctx.calendars.provide({ id: account.id, label: account.name, source: feedSource(linkOf(ctx.connections.values(account.id).url), account.name) }),
      removed: account => ctx.calendars.forget(account.id),
    })
  },
})
