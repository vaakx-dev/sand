import type { Server } from '@sand/protocol'
import { pageLink } from '@sand/kit'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { listener } from './http/listen'
import { createPairing } from './http/pairing'
import { createRoutes } from './http/routes'
import { loadToken } from './http/token'
import { createSharing } from './lan/sharing'
import { createRelay } from './relay/relay'
import { helloRequest } from './requests/hello'
import { loopRequests } from './requests/loop'
import { createRequests } from './requests/registry'
import { sessionRequests } from './requests/sessions'
import { forwardEvents } from './socket/forward'
import { createSockets } from './socket/sockets'

export default definePlugin({
  name: 'server',
  inject: ['cli', 'sessions', 'loop'],
  config: z.object({
    port: z.number().int().min(0).default(4317),
    hostname: z.string().default('127.0.0.1'),
  }),
  async apply(ctx, config) {
    if (ctx.cli.mode !== 'serve') return
    const token = await loadToken(ctx.cli.home)
    const routes = createRoutes()
    const requests = createRequests()
    const relay = createRelay(ctx)
    const sockets = createSockets({
      join: relay.join,
      leave: relay.leave,
      answer: (socket, request) => relay.answer(socket, request, () => requests.answer(request)),
      malformed: error => ctx.report(error),
    })
    const pairing = createPairing(token, code => sockets.broadcast('pair.used', [code]))
    const listen = listener({ token, routes, pairing, websocket: sockets.websocket })
    const hostname = ctx.cli.flags.lan ? '0.0.0.0' : config.hostname
    const server = listen(hostname, config.port)
    const sharing = createSharing({ home: ctx.cli.home, token, hostname, port: server.port ?? config.port, listen })
    ctx.effect(() => () => {
      sharing.stop()
      void server.stop(true)
    })

    forwardEvents(ctx, sockets.broadcast)
    ctx.effect(() =>
      requests.register({
        hello: helloRequest(ctx),
        ...sessionRequests(ctx),
        ...loopRequests(ctx),
        'server.urls': sharing.urls,
        'server.pair': pairing.issue,
        'server.lan': sharing.share,
      }),
    )
    await sharing.save()

    const service: Server = {
      url: sharing.url,
      get urls() {
        return sharing.urls()
      },
      token,
      route: routes.route,
      handle: requests.handle,
      broadcast: sockets.broadcast,
    }
    ctx.provide('server', service)
    ctx.provide('ui', relay.ui)
    console.log(['sand is serving at', ...sharing.urls().map(base => `  ${pageLink(base, token)}`)].join('\n'))
  },
})
