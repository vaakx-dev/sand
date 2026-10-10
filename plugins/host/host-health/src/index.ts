import type { HostBuild } from '@sand/host-dist/contract'
import { definePlugin } from 'drydock'
import { createHealthCheck } from './check'
import { createPeerHealth } from './peer'
import { healthRequests } from './requests'

export default definePlugin({
  name: 'host-health',
  description: 'Checks that this PC runs sand properly and asks paired PCs how they are doing',
  inject: ['hostOptions', 'runtimes', 'hub'],
  uses: { hostBuild: 'health reports have no build info' },
  apply(ctx) {
    const { home, device } = ctx.hostOptions
    let hostBuild: HostBuild | undefined
    ctx.watch('hostBuild', impl => {
      hostBuild = impl
    })
    const check = createHealthCheck(ctx.runtimes, home, async () => hostBuild?.info())
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
