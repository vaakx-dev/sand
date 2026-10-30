import { type ClientMessage, hello } from '@sand/host-hub/contract'
import { sessionUpdate } from '@sand/chats/contract'
import { createHandlers, parseInput } from '@sand/util/wire'
import { definePlugin } from 'drydock'
import { helloSafe, type Server, server as serverService, uiFocus } from './contract'
import { inject } from './context'
import { createHello } from './requests/hello'
import { pagingRequests } from './requests/paging'
import { sessionRequests } from './requests/sessions'
import { createRoutes } from './routes'
import { forwardEvents, type Send } from './socket/forward'
import { createSockets, eventFrame, everyone, type Socket } from './socket/sockets'
import { trimForPage } from './socket/trim'
import { createLiveTracker } from './stream/live'
import { createStream } from './stream/stream'

export default definePlugin({
  name: 'server',
  inject,
  apply(ctx) {
    const routes = createRoutes(ctx.runtime)
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
        return handlers.answer(request.type, request.input, socket.data).then(trimForPage)
      },
      settle: () => stream.flush(),
      malformed: error => ctx.report(error),
    })
    const stream = createStream(ctx, sockets.publish, live)
    const send: Send = (event, payload, to = everyone) => {
      stream.flush()
      sockets.publish(() => eventFrame(event.id, trimForPage(payload)), to)
    }
    const listener = Bun.serve({ hostname: '127.0.0.1', port: 0, websocket: sockets.websocket, fetch: routes.respond })
    ctx.effect(() => () => void listener.stop(true))

    forwardEvents(ctx, send, stream.sees)
    ctx.effect(() => handlers.handle(hello, hellos.answer))
    ctx.effect(() => hellos.register(helloSafe, () => ctx.cli.safe))
    ctx.effect(() => sessionRequests(ctx, handlers))
    ctx.effect(() => pagingRequests(ctx, handlers, live))

    const server: Server = {
      route: routes.route,
      handle: handlers.handle,
      broadcast: (event, payload) => send(event, payload),
      hello: hellos.register,
    }
    ctx.provide(serverService, server)
    ctx.runtime.listening(`http://127.0.0.1:${listener.port}`)
    console.log(`runtime ${ctx.runtime.id} listening on 127.0.0.1:${listener.port}`)
  },
})
