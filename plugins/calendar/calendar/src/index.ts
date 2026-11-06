import { ledger } from '@sand/ledger/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { calendarChange, calendars, calendarsChange } from './contract'
import { serveCalendars } from './serve'
import { createCalendars } from './service'
import { createStore } from './store'
import { calendarTools, group } from './tools'

export default definePlugin({
  name: 'calendar',
  description: "Keeps the events of every connected calendar in one store, syncs remote ones in the background, and gives agents calendar tools",
  inject: { ledger },
  apply(ctx) {
    const service = createCalendars(createStore(ctx.ledger), {
      changed: change => ctx.emit(calendarChange, change),
      listed: list => ctx.emit(calendarsChange, list),
      report: error => ctx.report(error),
    })
    ctx.provide(calendars, service)
    serveCalendars(ctx, service)
    ctx.watch(tools, found => found && joinDisposers(found.group(group), ...calendarTools(service).map(tool => found.register(tool))))
  },
})
