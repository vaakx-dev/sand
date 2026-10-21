import { hostEvent, hostRuntimes, runtimes } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { hub as hubService, hubOpen } from './contract'
import { createHub } from './hub'

export default definePlugin({
  name: 'host-hub',
  inject: { runtimes },
  apply(ctx) {
    const { hub, sync, dispose } = createHub(ctx.runtimes, device => ctx.emit(hubOpen, device))
    ctx.effect(() => dispose)
    ctx.on(hostRuntimes, sync)
    ctx.on(hostEvent, hub.broadcast)
    ctx.provide(hubService, hub)
  },
})
