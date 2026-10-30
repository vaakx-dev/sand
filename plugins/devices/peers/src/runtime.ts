import { peers as peersService } from '@sand/devices-contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { createRemotePeers } from './remote/peers'

export default definePlugin({
  name: 'devices-peers',
  description: "Lets runtime plugins reach your other PCs through the host's connections to them",
  inject: { hostChannel },
  async apply(ctx) {
    const remote = createRemotePeers(ctx.hostChannel, error => ctx.report(error))
    ctx.effect(() => remote.close)
    await remote.start().catch(error => ctx.report(error))
    ctx.provide(peersService, remote.peers)
  },
})
