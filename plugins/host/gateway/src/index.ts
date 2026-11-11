import { auth, helloProof, helloResume, helloSession, thisPc } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { definePlugin } from 'drydock'
import { createBearer } from './access/bearer'
import { createIdentityRoute } from './access/identity'
import { createAdmit } from './access/admit'
import { createNonces, createResumes, createTickets } from './access/keys'
import { createProofs } from './access/proofs'
import { createSessions } from './access/sessions'
import { createSocketRoute } from './access/socket'
import { createTicketRoute } from './access/ticket'
import { hostHttp, type ListenScope } from './contract'
import { createHttpRegistry } from './http/registry'
import { createResponder } from './http/respond'
import { createRoutes } from './http/routes'
import { removeServerInfo, writeServerInfo } from './info'
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
    const resumes = createResumes()
    const sessions = createSessions()
    const proofs = createProofs()
    const caller = createBearer(sessions)
    const admit = createAdmit({ thisPc: ctx.thisPc, auth: ctx.auth, nonces, resumes })
    const routes = createRoutes({
      identity: createIdentityRoute(ctx.thisPc, nonces),
      ticket: createTicketRoute(admit, tickets),
      socket: createSocketRoute({ thisPc: ctx.thisPc, admit, tickets, sessions }),
    })
    const respond = createResponder({ routes, registry, caller, proxy: createProxy(ctx.runtimes) })
    const listener = createListener(createListen({ respond, hub: ctx.hub, sessions, proofs }), port)
    ctx.effect(() => () => void listener.stop())
    ctx.effect(() => () => removeServerInfo(home))

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
    ctx.effect(() => ctx.hub.greet(helloResume, (caller, socket) => resumes.forSocket(socket, caller.device)))
    ctx.effect(() => ctx.hub.greet(helloProof, (_, socket) => proofs.of(socket)))
    ctx.effect(() =>
      ctx.auth.onRevoke(device => {
        tickets.drop(ticket => ticket.device === device)
        resumes.drop(device)
        sessions.drop(device)
        ctx.hub.disconnect(device)
      }),
    )
    await save()

    console.log(['sand is serving at', ...listener.urls().map(url => `  ${url}`)].join('\n'))
  },
})
