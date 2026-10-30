import {
  devicePaths,
  network,
  peers as peersService,
  peersChange,
  type PublishedRoute,
  registry as registryService,
  thisPc as thisPcService,
} from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hostHttp } from '@sand/host-gateway/contract'
import { hub as hubService } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { runtimeBridge } from './bridge'
import { forwardTarget } from './forward/target'
import { viaForwarder } from './forward'
import { viaHttpRoute } from './forward/http'
import { createPeerSet } from './peer-set'
import { peerRequests } from './requests'
import { fileRouteStore } from './store/file'
import { routeAnnouncer } from './sync/announce'
import { registrySync } from './sync/registry'

export default definePlugin({
  name: 'devices-peers',
  description: 'Keeps this PC connected to each of your other PCs, shares the device list with them and forwards connections through this PC',
  inject: { hostOptions, hostHttp, hub: hubService, registry: registryService, thisPc: thisPcService },
  async apply(ctx) {
    const { hub, registry, thisPc } = ctx
    const store = await fileRouteStore(ctx.hostOptions.home, error => ctx.report(error))
    const set = createPeerSet(thisPc.signer, store)
    const { links, peers } = set
    ctx.effect(() => links.close)

    const otherPcs = () => registry.list().filter(record => record.kind === 'pc' && record.id !== thisPc.id)
    const reconcile = () => {
      const pcs = otherPcs()
      store.keep(pcs.map(record => record.id))
      links.sync(pcs)
    }
    ctx.effect(() => registry.onChange(reconcile))
    reconcile()

    const announced = (pc: string, routes: PublishedRoute[]) => {
      if (links.get(pc)?.open() || !otherPcs().some(record => record.id === pc)) return
      store.publish(pc, routes)
      links.renew(pc)
    }

    const announcer = routeAnnouncer(peers, () => ctx.get(network))
    ctx.effect(() => peers.onOpen(announcer.tell))
    ctx.watch(network, found => found?.onChange(() => announcer.tellAll()))
    ctx.effect(() => peers.onChange(() => hub.broadcast(peersChange, peers.list(), 'user')))

    const target = forwardTarget(registry, thisPc, peers)
    const registrations = [
      ...registrySync(peers, registry),
      ...peerRequests(hub, { set, announced }),
      ...viaForwarder(hub, target),
      () => ctx.hostHttp.route(devicePaths.via, viaHttpRoute(target)),
      ...runtimeBridge(hub, peers, () => ctx.get(runtimes)),
    ]
    for (const register of registrations) ctx.effect(register)

    ctx.provide(peersService, peers)
  },
})
