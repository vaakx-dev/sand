import {
  type DiscoveredPc,
  discoverChange,
  helloRoutes,
  network,
  networkChange,
  networkGet,
  type NetworkScope,
  networkSet,
  type NetworkState,
  pcRoutes,
  pcsDiscover,
  type Registry,
  registry,
  routesChange,
  thisPc,
} from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hostHttp } from '@sand/host-gateway/contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { createDiscovery } from './discovery'
import { createListeners } from './listeners'
import { lanAddresses } from './routes/addresses'
import { createRoutePublisher } from './routes/publisher'
import { routesFor } from './routes/routes'
import { createScope } from './scope/scope'
import { startTailscale } from './tailscale'
import type { TailscaleRunner } from './tailscale/service'

const addressCheckEvery = 15_000
const beaconEvery = 30_000

export default definePlugin({
  name: 'devices-network',
  description: 'Who can reach this PC, the routes it publishes, Tailscale, and finding your other sand PCs',
  inject: { hostOptions, hub, hostHttp, thisPc },
  async apply(ctx) {
    const changes = createListeners<NetworkState>()
    const finds = createListeners<DiscoveredPc[]>()
    let runner: TailscaleRunner | undefined
    let devices: Registry | undefined

    const scope = await createScope({
      home: ctx.hostOptions.home,
      bind: next => ctx.hostHttp.bind(next),
      changed: () => {
        if (!routes.check()) emitState()
        discovery.announce()
      },
    })
    const routesIn = (current: NetworkScope = scope.current()) =>
      routesFor({ scope: current, port: ctx.hostHttp.port(), lan: lanAddresses(), tailscale: runner?.state() })
    const state = (): NetworkState => ({ scope: scope.current(), routes: routes.current() })
    const emitState = () => {
      const next = state()
      ctx.hub.broadcast(networkChange, next, 'user')
      changes.emit(next)
    }
    const routes = createRoutePublisher(routesIn, next => {
      ctx.hub.broadcast(routesChange, next)
      emitState()
    })

    runner = await startTailscale(ctx, () => routes.check())

    const paired = (id: string) => {
      const record = devices?.get(id)
      return record?.kind === 'pc' && !record.removed
    }
    const discovery = await createDiscovery({
      own: ctx.thisPc.id,
      port: () => ctx.hostHttp.port(),
      announcing: () => scope.current() === 'network',
      peers: async () => (await runner?.peers()) ?? [],
      paired,
      changed: found => {
        ctx.hub.broadcast(discoverChange, found, 'user')
        finds.emit(found)
      },
    })
    ctx.watch(registry, found => {
      devices = found
      discovery.recheck()
      return found?.onChange(() => discovery.recheck())
    })

    const setScope = async (next: NetworkScope): Promise<NetworkState> => {
      const wanted = await scope.set(next)
      return { scope: wanted, routes: routesIn(wanted) }
    }

    ctx.provide(network, {
      state,
      setScope,
      discovered: discovery.list,
      onChange: changes.add,
      onDiscover: finds.add,
    })
    ctx.effect(() => ctx.hub.handle(networkGet, () => state()))
    ctx.effect(() => ctx.hub.handle(networkSet, ({ scope: next }) => setScope(next)))
    ctx.effect(() => ctx.hub.handle(pcRoutes, () => routes.current()))
    ctx.effect(() => ctx.hub.greet(helloRoutes, () => routes.current()))
    ctx.effect(() => ctx.hub.handle(pcsDiscover, () => discovery.discover()))
    ctx.effect(() => {
      const addresses = setInterval(() => routes.check() && discovery.announce(), addressCheckEvery)
      const beacon = setInterval(discovery.tick, beaconEvery)
      return () => {
        clearInterval(addresses)
        clearInterval(beacon)
      }
    })
    ctx.effect(() => () => {
      scope.stop()
      discovery.close()
    })
    discovery.announce()
    void discovery.discover()
  },
})
