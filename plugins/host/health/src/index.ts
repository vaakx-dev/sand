import { hostOptions } from '@sand/host-daemon/contract'
import { hostBuild } from '@sand/host-dist/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { createHealthCheck } from './check'
import { hostHealth } from './contract'
import { createPeerHealth } from './peer'
import { healthRequests } from './requests'

export default definePlugin({
  name: 'host-health',
  description: 'Checks that this PC runs sand properly and asks paired PCs how they are doing',
  inject: { hostOptions, runtimes, hub },
  apply(ctx) {
    const { home, device } = ctx.hostOptions
    const check = createHealthCheck(ctx.runtimes, home, async () => ctx.get(hostBuild)?.info())
    ctx.provide(hostHealth, check)
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
