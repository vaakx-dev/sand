import { runtimeDrain } from '@sand/host-runtimes/contract'
import { ledger } from '@sand/ledger/contract'
import { definePlugin } from 'drydock'
import { createBook } from './book'
import { schedules } from './contract'
import { createRunner, type Registry } from './runner'
import { createSchedules } from './schedules'
import { openStore } from './store'

export default definePlugin({
  name: 'schedules',
  description: 'Keeps durable schedules for other plugins, one-off or cron in a time zone, runs them when due even after a restart',
  inject: { ledger },
  apply(ctx) {
    const book = createBook(ctx, openStore(ctx.ledger))
    const registry: Registry = { handlers: new Map() }
    const runner = createRunner(book, registry)
    ctx.effect(() => runner.stop)
    ctx.on(runtimeDrain, runner.stop)
    ctx.provide(schedules, createSchedules(book, registry, runner.plan))
    void ctx.settled().then(runner.start)
  },
})
