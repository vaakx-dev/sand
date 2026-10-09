import type { Server } from './contract'
import { definePlugin } from 'drydock'
import { respond } from './http/listen'
import { createRoutes } from './http/routes'
import { createLiveTracker } from './live/track'
import { createRelay } from './relay/relay'
import { helloRequest } from './requests/hello'
import { loopRequests } from './requests/loop'
import { createRequests } from './requests/registry'
import { sessionRequests } from './requests/sessions'
import { forwardEvents } from './socket/forward'
import { createSockets } from './socket/sockets'

export default definePlugin({
  name: 'server',
  inject: ['cli', 'sessions', 'loop', 'runtime'],
  apply(ctx) {
    if (ctx.cli.mode !== 'serve') return
    const routes = createRoutes()
    const requests = createRequests()
    const relay = createRelay(ctx)
    const sockets = createSockets({
      join: relay.join,
      leave: relay.leave,
      answer: (socket, request) => relay.answer(socket, request, () => requests.answer(request)),
      malformed: error => ctx.report(error),
    })
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      websocket: sockets.websocket,
      fetch: respond({ access: request => ctx.runtime.access(request), caller: request => ctx.runtime.caller?.(request), routes }),
    })
    ctx.effect(() => () => void server.stop(true))

    forwardEvents(ctx, sockets.broadcast)
    const live = createLiveTracker(ctx)
    ctx.effect(() =>
      requests.register({
        hello: helloRequest(ctx),
        ...sessionRequests(ctx, live),
        ...loopRequests(ctx),
      }),
    )

    const service: Server = {
      route: routes.route,
      handle: requests.handle,
      broadcast: sockets.broadcast,
    }
    ctx.provide('server', service)
    ctx.provide('ui', relay.ui)
    ctx.runtime.listening(`http://127.0.0.1:${server.port}`)
    console.log(`runtime ${ctx.runtime.id} listening on 127.0.0.1:${server.port}`)
  },
})
