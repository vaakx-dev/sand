import { auth, helloSession, thisPc } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { createBearer } from './access/bearer'
import { createIdentityRoute } from './access/identity'
import { createNonces, createTickets } from './access/keys'
import { createSessions } from './access/sessions'
import { createSocketRoute } from './access/socket'
import { createTicketRoute } from './access/ticket'
import { hostHttp, type ListenScope } from './contract'
import { createHttpRegistry } from './http/registry'
import { createResponder } from './http/respond'
import { createRoutes } from './http/routes'
import { writeServerInfo } from './info'
import { createListen } from './listen'
import { createListener } from './listener/listener'
import { createProxy } from './proxy'

export default definePlugin({
  name: 'host-gateway',
  inject: { hostOptions, runtimes, hub, auth, thisPc },
  async apply(ctx) {
    const { home, port } = ctx.hostOptions
    const registry = createHttpRegistry()
    const nonces = createNonces()
    const tickets = createTickets()
    const sessions = createSessions()
    const caller = createBearer(sessions)
    const routes = createRoutes({
      identity: createIdentityRoute(ctx.thisPc, nonces),
      ticket: createTicketRoute({ thisPc: ctx.thisPc, auth: ctx.auth, nonces, tickets }),
      socket: createSocketRoute(tickets, sessions),
    })
    const respond = createResponder({ routes, registry, caller, proxy: createProxy(ctx.runtimes) })
    const listener = createListener(createListen({ respond, hub: ctx.hub, sessions }), port)
    ctx.effect(() => () => void listener.stop())

    const save = () => writeServerInfo(home, listener.urls())
    const bind = async (scope: ListenScope) => {
      if (await listener.bind(scope)) await save()
    }
    ctx.provide(hostHttp, {
      route: registry.route,
      bind,
      scope: listener.scope,
      port: listener.port,
      addresses: listener.addresses,
      urls: listener.urls,
    })

    ctx.effect(() => ctx.hub.greet(helloSession, (_, socket) => sessions.of(socket)))
    ctx.effect(() =>
      ctx.auth.onRevoke(device => {
        tickets.drop(ticket => ticket.device === device)
        sessions.drop(device)
        ctx.hub.disconnect(device)
      }),
    )
    await save()

    console.log(['sand is serving at', ...listener.urls().map(url => `  ${url}`)].join('\n'))
  },
})
