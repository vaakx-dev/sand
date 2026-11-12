import { peersList, peers as peersService } from '@sand/devices-contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { createRemotePeers } from './remote/peers'

export default definePlugin({
  name: 'devices-peers',
  description: "Lets runtime plugins and agents reach your other PCs through the host's connections to them",
  inject: { hostChannel },
  async apply(ctx) {
    const remote = createRemotePeers(ctx.hostChannel, error => ctx.report(error))
    ctx.effect(() => remote.close)
    await remote.start().catch(error => ctx.report(error))
    ctx.provide(peersService, remote.peers)
    ctx.watch(server, found => found?.handle(peersList, () => remote.peers.list()))
  },
})
