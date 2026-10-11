import type { HostBuild } from '@sand/host-dist/contract'
import type { HostRemotes } from '@sand/host-remotes/contract'
import { routeKind } from '@sand/kit'
import { randomSecret } from '@sand/kit/fs'
import { definePlugin } from 'drydock'
import { createTickets } from './auth/tickets'
import { createHttpRegistry } from './http/registry'
import { createResponder } from './http/respond'
import { writeServerInfo } from './info'
import { createInviter } from './invite'
import { createListen } from './listen'
import { createListener } from './network/listener'
import { createRoutePublisher } from './network/publish'
import { hostRoutes } from './network/routes'
import { loadLan } from './network/settings'
import { createToggle } from './network/toggle'
import { createProxy } from './proxy'

export default definePlugin({
  name: 'host-gateway',
  inject: ['hostOptions', 'runtimes', 'hub', 'hostDevices'],
  uses: {
    hostBuild: 'the identity route has no build info',
    hostRemotes: 'PCs that pair with this one are not paired back',
    tailscale: 'Tailscale addresses are not offered as routes',
  },
  async apply(ctx) {
    const { home, port, device } = ctx.hostOptions
    const admin = randomSecret()
    const registry = createHttpRegistry()
    let hostBuild: HostBuild | undefined
    ctx.watch('hostBuild', impl => {
      hostBuild = impl
    })
    let remotes: HostRemotes | undefined
    ctx.watch('hostRemotes', impl => {
      remotes = impl
    })
    const routes = () =>
      hostRoutes({ urls: listener.urls(), lan: listener.state().lan, port: listener.port, tailscale: ctx.tailscale?.state() })
    const routeUrls = () => routes().map(route => route.url)
    const localUrls = () => listener.urls().filter(url => routeKind(url) === 'local')
    const reachUrls = () => [...new Set([...routeUrls(), ...localUrls()])]
    ctx.provide('hostHttp', { route: registry.route, urls: reachUrls })
    const invite = createInviter(ctx.hostDevices, reachUrls)
    const respond = createResponder({
      identity: device,
      devices: ctx.hostDevices,
      admin,
      tickets: createTickets(),
      build: async () => hostBuild?.info(),
      routeUrls,
      accept: async (back, address) => (remotes ? remotes.accept(back, address) : false),
      invite,
      status: () => ctx.runtimes.status(),
      stop: () => void setTimeout(() => ctx.emit('host.stop'), 100),
      proxy: createProxy(ctx.runtimes),
      registry,
    })
    const listener = createListener(createListen(respond, ctx.hub), await loadLan(home), port)
    const save = () => writeServerInfo(home, listener.urls(), admin)
    const publish = createRoutePublisher(routes, next => ctx.hub.broadcast({ name: 'routes.change', args: [next] }))

    const toggle = createToggle({
      home,
      listener,
      changed: async () => {
        await save()
        ctx.hub.broadcast({ name: 'network.change', args: [listener.state()] })
        publish(true)
      },
    })
    ctx.effect(() => () => {
      toggle.stop()
      void listener.stop()
    })

    ctx.on('host.tailscale', () => publish(false))
    ctx.effect(() => ctx.hub.handle('pair.create', invite))
    ctx.effect(() => ctx.hub.handle('host.routes', () => routes()))
    ctx.effect(() => ctx.hub.handle('network.get', () => listener.state()))
    ctx.effect(() =>
      ctx.hub.handle('network.set', ({ lan }) => {
        if (typeof lan !== 'boolean') throw new Error('network.set needs lan: true or false')
        return toggle.set(lan)
      }),
    )
    await save()

    console.log(['sand is serving at', ...listener.urls().map(url => `  ${url}`)].join('\n'))
  },
})
