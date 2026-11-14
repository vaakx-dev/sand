import { pcHello, pcs, wire, type WireListen } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type DevServer, devServersChange, devServerStop, helloDevServers } from '../contract'
import { serversCard, type Shown } from './card'

const everyPc: WireListen = { from: 'all' }

export default definePlugin({
  name: 'dev-servers-web',
  description: 'Lists the web servers a thread started in its Details, each with Open and Stop',
  inject: { wire, pcs, inspector, kit },
  apply(ctx) {
    const byPc = sig(new Map<string, Shown[]>())

    const keep = (device: string, servers: DevServer[]) => byPc.set(new Map(byPc.get()).set(device, servers.map(server => ({ ...server, device }))))

    const hello = (device: string) => keep(device, ctx.wire.hello(helloDevServers, device) ?? [])

    const shownIn = ({ session, device }: Subject) => (byPc.get().get(device) ?? []).filter(server => server.session === session)

    ctx.on(pcHello, hello)
    for (const pc of ctx.pcs.list()) if (ctx.wire.ready(pc.id)) hello(pc.id)
    ctx.effect(() => ctx.wire.on(devServersChange, (servers, device) => keep(device, servers), everyPc))

    const card = serversCard(ctx.kit, {
      servers: shownIn,
      open: server => window.open(server.url, '_blank', 'noopener'),
      stop: server => void ctx.wire.call(devServerStop, { port: server.port, session: server.session }, server.device),
    })
    ctx.effect(() => ctx.inspector.row({ id: 'dev-servers', group: 'helpers', order: 70, shows: subject => !subject.draft && shownIn(subject).length > 0, render: card }))
  },
})
