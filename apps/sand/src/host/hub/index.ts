import { definePlugin } from 'drydock'
import { createHub } from './hub'

export const hubPlugin = definePlugin({
  name: 'hub',
  inject: ['runtimes'],
  apply(ctx) {
    const { hub, sync, dispose } = createHub(ctx.runtimes)
    ctx.effect(() => dispose)
    ctx.on('host.runtimes', sync)
    ctx.on('host.event', hub.broadcast)
    ctx.provide('hub', hub)
  },
})
