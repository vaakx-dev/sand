import { definePlugin } from 'drydock'
import { createSupervisor } from './supervisor'

export const runtimesPlugin = definePlugin({
  name: 'runtimes',
  description: 'Starts sand runtimes, swaps in fresh ones and restarts them when they crash',
  inject: ['hostOptions', 'hostApp'],
  apply(ctx) {
    const supervisor = createSupervisor(ctx.hostOptions, () => ctx.hostApp.main(), {
      runtimes: () => ctx.emit('host.runtimes'),
      event: event => ctx.emit('host.event', event),
    })
    ctx.provide('runtimes', supervisor.runtimes)
    ctx.effect(() => {
      supervisor.start()
      return supervisor.stop
    })
  },
})
