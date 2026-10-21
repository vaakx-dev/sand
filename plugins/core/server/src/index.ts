import { type ClientMessage, hello } from '@sand/host-hub/contract'
import { sessionUpdate } from '@sand/chats/contract'
import { createHandlers, parseInput } from '@sand/util/wire'
import { definePlugin } from 'drydock'
import { createBlobs } from './blobs'
import { helloSafe, type Server, server as serverService, uiFocus } from './contract'
import { inject } from './context'
import { createHello } from './requests/hello'
import { pagingRequests } from './requests/paging'
import { sessionRequests } from './requests/sessions'
import { createRoutes } from './routes'
import { forwardEvents } from './socket/forward'
import { createSockets, type Socket } from './socket/sockets'
import { createLiveTracker } from './stream/live'
import { createStream } from './stream/stream'

export default definePlugin({
  name: 'server',
  inject,
  apply(ctx) {
    const routes = createRoutes(ctx.runtime)
    const blobs = createBlobs(ctx.cli.home, id => ctx.sessions.open(id)?.entries(), error => ctx.report(error))
    routes.route('/blob', blobs.route)
    ctx.effect(blobs.sweep)
    const handlers = createHandlers()
    const hellos = createHello(ctx)
    const live = createLiveTracker(ctx)

    const markSeen = (session: string) => {
      if (ctx.sessions.open(session)?.seen === false) ctx.sessions.update(session, { seen: true })
    }

    const focus = async (socket: Socket, request: ClientMessage) => {
      const { session } = await parseInput(uiFocus, request.input)
      stream.focus(socket, session)
      if (session) markSeen(session)
      return true
    }

    ctx.on(sessionUpdate, session => {
      if (!session.seen && stream.focused(session.id)) markSeen(session.id)
    })

    const sockets = createSockets({
      leave: socket => stream.forget(socket),
      answer(socket, request) {
        if (request.type === uiFocus.id) return focus(socket, request)
        return blobs.answer(request, input => handlers.answer(request.type, input, socket.data))
      },
      settle: () => stream.flush(),
      malformed: error => ctx.report(error),
    })
    const stream = createStream(ctx, sockets.publish, live)
    const broadcast = (name: string, payload: unknown) => {
      stream.flush()
      sockets.broadcast(name, blobs.outbound(payload))
    }
    const listener = Bun.serve({ hostname: '127.0.0.1', port: 0, websocket: sockets.websocket, fetch: routes.respond })
    ctx.effect(() => () => void listener.stop(true))

    forwardEvents(ctx, (event, payload) => broadcast(event.id, payload))
    ctx.effect(() => handlers.handle(hello, hellos.answer))
    ctx.effect(() => hellos.register(helloSafe, () => ctx.cli.safe))
    ctx.effect(() => sessionRequests(ctx, handlers))
    ctx.effect(() => pagingRequests(ctx, handlers, live))

    const server: Server = {
      route: routes.route,
      handle: handlers.handle,
      broadcast: (event, payload) => broadcast(event.id, payload),
      hello: hellos.register,
      inlineMedia: blobs.inline,
    }
    ctx.provide(serverService, server)
    ctx.runtime.listening(`http://127.0.0.1:${listener.port}`)
    console.log(`runtime ${ctx.runtime.id} listening on 127.0.0.1:${listener.port}`)
  },
})
