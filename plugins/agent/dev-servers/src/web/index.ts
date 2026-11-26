import { androidApp, pcHello, pcs, threadPcs, wire, type WireListen } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { toastsOf } from '@sand/toasts/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type DevServer, devServersChange, devServerStop, helloDevServers, sharedSiteEntry, sharedSiteSchema } from '../contract'
import { serversCard, sharedCard, type Shown, type Target } from './card'
import { appTab, browserTab, openServer } from './open'

const everyPc: WireListen = { from: 'all' }

export default definePlugin({
  name: 'dev-servers-web',
  description: 'Lists the web servers a thread started in its Details, and shows the websites agents share as cards in the chat, each with Open and Stop',
  inject: { wire, pcs, threadPcs, inspector, kit },
  apply(ctx) {
    const byPc = sig(new Map<string, Shown[]>())

    const keep = (device: string, servers: DevServer[]) => byPc.set(new Map(byPc.get()).set(device, servers.map(server => ({ ...server, device }))))

    const hello = (device: string) => keep(device, ctx.wire.hello(helloDevServers, device) ?? [])

    const shownIn = ({ session, device }: Pick<Subject, 'session' | 'device'>) => (byPc.get().get(device) ?? []).filter(server => server.session === session)

    const running = (target: Target) => () => shownIn(target).some(server => server.port === target.port)

    const pcOf = (conversation: string) => ctx.threadPcs.ofSession(conversation) ?? ctx.threadPcs.current() ?? ctx.pcs.here().id

    ctx.on(pcHello, hello)
    for (const pc of ctx.pcs.list()) if (ctx.wire.ready(pc.id)) hello(pc.id)
    ctx.effect(() => ctx.wire.on(devServersChange, (servers, device) => keep(device, servers), everyPc))

    const notices = toastsOf(ctx)
    const reach = { wire: ctx.wire, pcs: ctx.pcs, tab: () => (ctx.get(androidApp) ? appTab() : browserTab()) }
    const actions = {
      open: (server: Target) => void notices.attempt(`Couldn't open localhost:${server.port}`, () => openServer(reach, server)),
      stop: (server: Target) => void notices.attempt(`Couldn't stop localhost:${server.port}`, () => ctx.wire.call(devServerStop, { port: server.port, session: server.session }, server.device)),
    }

    const sharedSite = (data: unknown, conversation: string) => {
      const site = sharedSiteSchema().safeParse(data)
      if (!site.success) return undefined
      const target = { port: site.data.port, session: conversation, device: pcOf(conversation) }
      return sharedCard(ctx.kit, actions, target, site.data, running(target))
    }

    const card = serversCard(ctx.kit, { ...actions, servers: shownIn })
    ctx.effect(() => ctx.inspector.row({ id: 'dev-servers', group: 'helpers', order: 70, shows: subject => !subject.draft && shownIn(subject).length > 0, render: card }))
    ctx.watch(transcript, found => found?.entry(sharedSiteEntry, (entry, conversation) => sharedSite(entry.data, conversation)))
  },
})
