import { definePlugin } from 'drydock'
import { createBlobs } from './blobs'
import type { Server } from './contract'
import { createRelay } from './relay/relay'
import { helloRequest } from './requests/hello'
import { pagingRequests } from './requests/paging'
import { createRequests } from './requests/registry'
import { sessionRequests } from './requests/sessions'
import { createRoutes } from './routes'
import { forwardEvents } from './socket/forward'
import { createSockets } from './socket/sockets'
import { createLiveTracker } from './stream/live'
import { createStream } from './stream/stream'

export default definePlugin({
  name: 'server',
  inject: ['cli', 'sessions', 'loop', 'runtime'],
  apply(ctx) {
    if (ctx.cli.mode !== 'serve') return
    const routes = createRoutes(ctx.runtime)
    const blobs = createBlobs(ctx.cli.home, id => ctx.sessions.open(id)?.entries(), error => ctx.report(error))
    routes.route('/blob', blobs.route)
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
        return blobs.answer(request, resolved => relay.answer(socket, resolved, () => requests.answer(resolved)))
      },
      settle: () => stream.flush(),
      malformed: error => ctx.report(error),
    })
    const stream = createStream(ctx, sockets.publish, live)
    const broadcast = (name: string, args: unknown[]) => {
      stream.flush()
      sockets.broadcast(name, blobs.outbound(args) as unknown[])
    }
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, websocket: sockets.websocket, fetch: routes.respond })
    ctx.effect(() => () => void server.stop(true))

    forwardEvents(ctx, broadcast)
    ctx.effect(() => requests.handle({ hello: helloRequest(ctx), ...sessionRequests(ctx), ...pagingRequests(ctx, live) }))

    const service: Server = { route: routes.route, handle: requests.handle, broadcast, inlineMedia: blobs.inline }
    ctx.provide('server', service)
    ctx.provide('ui', relay.ui)
    ctx.runtime.listening(`http://127.0.0.1:${server.port}`)
    console.log(`runtime ${ctx.runtime.id} listening on 127.0.0.1:${server.port}`)
  },
})
