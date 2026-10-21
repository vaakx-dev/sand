import { hostOptions, hostStop } from '@sand/host-daemon/contract'
import { hostDevices } from '@sand/host-devices/contract'
import { hostBuild } from '@sand/host-dist/contract'
import { hub } from '@sand/host-hub/contract'
import { hostRemotes } from '@sand/host-remotes/contract'
import { routeKind } from '@sand/host-remotes/pairing'
import { runtimes } from '@sand/host-runtimes/contract'
import { hostTailscale, tailscale } from '@sand/host-tailscale/contract'
import { randomSecret } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { createTickets } from './auth/tickets'
import { hostHttp, hostRoutes, networkChange, networkGet, networkSet, pairCreate, routesChange } from './contract'
import { createHttpRegistry } from './http/registry'
import { createResponder } from './http/respond'
import { writeServerInfo } from './info'
import { createInviter } from './invite'
import { createListen } from './listen'
import { createListener } from './network/listener'
import { createRoutePublisher } from './network/publish'
import { routesFor } from './network/routes'
import { loadLan } from './network/settings'
import { createToggle } from './network/toggle'
import { createProxy } from './proxy'

export default definePlugin({
  name: 'host-gateway',
  inject: { hostOptions, runtimes, hub, hostDevices },
  async apply(ctx) {
    const { home, port, device } = ctx.hostOptions
    const admin = randomSecret()
    const registry = createHttpRegistry()
    const routes = () =>
      routesFor({ urls: listener.urls(), lan: listener.state().lan, port: listener.port, tailscale: ctx.get(tailscale)?.state() })
    const routeUrls = () => routes().map(route => route.url)
    const localUrls = () => listener.urls().filter(url => routeKind(url) === 'local')
    const reachUrls = () => [...new Set([...routeUrls(), ...localUrls()])]
    ctx.provide(hostHttp, { route: registry.route, urls: reachUrls })
    const invite = createInviter(ctx.hostDevices, reachUrls)
    const respond = createResponder({
      identity: device,
      devices: ctx.hostDevices,
      admin,
      tickets: createTickets(),
      build: async () => ctx.get(hostBuild)?.info(),
      routeUrls,
      accept: async (back, address) => ctx.get(hostRemotes)?.accept(back, address) ?? false,
      invite,
      status: () => ctx.runtimes.status(),
      stop: () => void setTimeout(() => ctx.emit(hostStop), 100),
      proxy: createProxy(ctx.runtimes),
      registry,
    })
    const listener = createListener(createListen(respond, ctx.hub), await loadLan(home), port)
    const save = () => writeServerInfo(home, listener.urls(), admin)
    const publish = createRoutePublisher(routes, next => ctx.hub.broadcast(routesChange, next))

    const toggle = createToggle({
      home,
      listener,
      changed: async () => {
        await save()
        ctx.hub.broadcast(networkChange, listener.state())
        publish(true)
      },
    })
    ctx.effect(() => () => {
      toggle.stop()
      void listener.stop()
    })

    ctx.on(hostTailscale, () => publish(false))
    ctx.effect(() => ctx.hub.handle(pairCreate, invite))
    ctx.effect(() => ctx.hub.handle(hostRoutes, () => routes()))
    ctx.effect(() => ctx.hub.handle(networkGet, () => listener.state()))
    ctx.effect(() => ctx.hub.handle(networkSet, ({ lan }) => toggle.set(lan)))
    await save()

    console.log(['sand is serving at', ...listener.urls().map(url => `  ${url}`)].join('\n'))
  },
})
