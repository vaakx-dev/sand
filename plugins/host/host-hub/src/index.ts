import { definePlugin } from 'drydock'
import { createHub } from './hub'

export default definePlugin({
  name: 'host-hub',
  inject: ['runtimes'],
  apply(ctx) {
    const { hub, sync, dispose } = createHub(ctx.runtimes, device => ctx.emit('hub.open', device))
    ctx.effect(() => dispose)
    ctx.on('host.runtimes', sync)
    ctx.on('host.event', hub.broadcast)
    ctx.provide('hub', hub)
  },
})
