import type { Hello } from '@sand/protocol'
import type { Server } from './contract'
import { createBlobs } from './blobs'
import { definePlugin } from 'drydock'
import { respond } from './http/listen'
import { createRoutes } from './http/routes'
import { createLiveTracker } from './live/track'
import { createRelay } from './relay/relay'
import { helloRequest } from './requests/hello'
import { loopRequests } from './requests/loop'
import { pagingRequests } from './requests/paging'
import { createRequests } from './requests/registry'
import { sessionRequests } from './requests/sessions'
import { trimHello } from './requests/trim'
import { forwardEvents } from './socket/forward'
import { createSockets } from './socket/sockets'
import { createStream } from './stream/stream'

export default definePlugin({
  name: 'server',
  inject: ['cli', 'sessions', 'loop', 'runtime'],
  apply(ctx) {
    if (ctx.cli.mode !== 'serve') return
    const routes = createRoutes()
    const blobs = createBlobs(ctx.cli.home, id => ctx.sessions.open(id)?.entries(), error => ctx.report(error))
    routes.route(blobs.path, blobs.route)
    ctx.effect(blobs.sweep)
    const requests = createRequests()
    const relay = createRelay(ctx)
    const live = createLiveTracker(ctx)
    const sockets = createSockets({
      join: relay.join,
      leave(socket) {
        relay.leave(socket)
        stream.forget(socket)
      },
      answer(socket, request) {
        if (request.type === 'ui.focus') stream.focus(socket, request.session)
        const answered = blobs.answer(request, resolved => relay.answer(socket, resolved, () => requests.answer(resolved)))
        return request.type === 'hello' ? answered.then(hello => trimHello(hello as Hello, request.known)) : answered
      },
      settle: () => stream.flush(),
      malformed: error => ctx.report(error),
    })
    const stream = createStream(ctx, sockets.publish, live)
    const broadcast = (name: string, args: unknown[]) => {
      stream.flush()
      sockets.broadcast(name, blobs.outbound(args) as unknown[])
    }
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      websocket: sockets.websocket,
      fetch: respond({ access: request => ctx.runtime.access(request), caller: request => ctx.runtime.caller?.(request), routes }),
    })
    ctx.effect(() => () => void server.stop(true))

    forwardEvents(ctx, broadcast)
    ctx.effect(() =>
      requests.register({
        hello: helloRequest(ctx),
        ...sessionRequests(ctx),
        ...pagingRequests(ctx, live),
        ...loopRequests(ctx),
      }),
    )

    const service: Server = {
      route: routes.route,
      handle: requests.handle,
      broadcast,
      inlineMedia: blobs.inline,
    }
    ctx.provide('server', service)
    ctx.provide('ui', relay.ui)
    ctx.runtime.listening(`http://127.0.0.1:${server.port}`)
    console.log(`runtime ${ctx.runtime.id} listening on 127.0.0.1:${server.port}`)
  },
})
