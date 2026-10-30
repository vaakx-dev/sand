import { devicePaths, installPaths, installProgress, network, type Peers, peers, registry, thisPc } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hostHttp, type HttpRoute } from '@sand/host-gateway/contract'
import { hub } from '@sand/host-hub/contract'
import { hostPluginSync } from '@sand/host-plugin-sync/contract'
import { definePlugin } from 'drydock'
import { createGrants } from './grants/grants'
import { redeemRoute } from './grants/redeem'
import { createLink, grantRequests } from './grants/requests'
import { ownRoutes } from './grants/routes'
import { createInstalls } from './install/installs'
import { installRequests } from './install/requests'
import { doneRoute, failRoute, stepRoute } from './install/routes/finish'
import { pluginsRoute } from './install/routes/plugins'
import { createDecisions } from './joins/decisions'
import { createIncoming } from './joins/incoming'
import { joinRequests } from './joins/requests'
import { joinRoutes } from './joins/routes'
import { createOutgoing } from './outgoing/outgoing'
import { outgoingRequests } from './outgoing/requests'

const sweepEvery = 5000

export default definePlugin({
  name: 'devices-pairing',
  description: 'Pairing links, join requests with codes, approvals, handoff and install grants for new PCs',
  inject: { hostOptions, hub, hostHttp, registry, thisPc },
  apply(ctx) {
    const { hub, registry, thisPc } = ctx
    const routes = () => ownRoutes(ctx.hostHttp, ctx.get(network))
    let linked: Peers | undefined

    const grants = createGrants()
    const installs = createInstalls(progress => hub.broadcast(installProgress, progress, 'user'))
    const incoming = createIncoming(() => ({ id: thisPc.id, name: thisPc.name() }))
    const decisions = createDecisions({ hub, registry, thisPc, incoming, peers: () => linked })
    const outgoing = createOutgoing({ hub, registry, thisPc, peers: () => linked })
    const join = joinRoutes({ registry, thisPc, incoming, decisions, routes })

    ctx.watch(peers, found => {
      linked = found
      return found?.onOpen(pc => decisions.shareWith(pc))
    })

    const http: [string, HttpRoute][] = [
      [devicePaths.pair, redeemRoute({ hub, registry, thisPc, grants, installs })],
      [devicePaths.joinRequest, join.ask],
      [devicePaths.joinRequest, join.poll],
      [devicePaths.joinCancel, join.cancel],
      [installPaths.plugins, pluginsRoute({ home: ctx.hostOptions.home, installs, shared: async () => (await ctx.get(hostPluginSync)?.shared()) ?? [] })],
      [installPaths.step, stepRoute(installs)],
      [installPaths.done, doneRoute(installs)],
      [installPaths.fail, failRoute(installs)],
    ]
    for (const [path, route] of http) ctx.effect(() => ctx.hostHttp.route(path, route))

    const requests = [
      ...grantRequests(hub, registry, grants, createLink({ grants, routes })),
      ...joinRequests(hub, decisions),
      ...outgoingRequests(hub, outgoing),
      ...installRequests(hub, grants, installs),
    ]
    for (const register of requests) ctx.effect(register)

    ctx.effect(() => registry.onChange(decisions.settlePaired))
    ctx.effect(() => {
      const timer = setInterval(decisions.sweep, sweepEvery)
      return () => clearInterval(timer)
    })
    ctx.effect(() => outgoing.stop)
  },
})
