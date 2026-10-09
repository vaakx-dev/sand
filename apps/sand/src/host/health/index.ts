import type { HostBuild } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { createHealthCheck } from './check'
import { logTail, serverLog } from './log'
import { createPeerHealth } from './peer'
import { healthRequests } from './requests'
import { probeWeb } from './web'

export const healthPlugin = definePlugin({
  name: 'health',
  description: 'Checks that this PC runs sand properly and asks paired PCs how they are doing',
  inject: ['hostOptions', 'runtimes', 'hub'],
  apply(ctx) {
    const { home, device } = ctx.hostOptions
    let hostBuild: HostBuild | undefined
    ctx.watch('hostBuild', impl => {
      hostBuild = impl
    })
    const check = createHealthCheck({
      runtimes: ctx.runtimes,
      probe: runtime => probeWeb(runtime),
      log: () => logTail(serverLog(home)),
      build: async () => hostBuild?.info(),
    })
    ctx.provide('hostHealth', check)
    const peers = createPeerHealth(home)
    ctx.effect(() => () => peers.stop())
    const requests = healthRequests(ctx.hub, {
      self: device.id,
      local: () => check.check(),
      peer: id => peers.health(id),
    })
    for (const setup of requests) ctx.effect(setup)
  },
})
