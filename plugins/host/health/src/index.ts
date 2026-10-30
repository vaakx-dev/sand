import { peers, thisPc } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hostBuild } from '@sand/host-dist/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { createHealthCheck } from './check'
import { hostHealth } from './contract'
import { peerHealth } from './peer'
import { healthRequests } from './requests'

export default definePlugin({
  name: 'host-health',
  description: 'Checks that this PC runs sand properly and asks paired PCs how they are doing',
  inject: { hostOptions, runtimes, hub },
  apply(ctx) {
    const check = createHealthCheck(ctx.runtimes, ctx.hostOptions.home, async () => ctx.get(hostBuild)?.info())
    ctx.provide(hostHealth, check)
    const requests = healthRequests(ctx.hub, {
      self: () => ctx.get(thisPc)?.id,
      local: () => check.check(),
      peer: id => peerHealth(ctx.get(peers), id),
    })
    for (const setup of requests) ctx.effect(setup)
  },
})
