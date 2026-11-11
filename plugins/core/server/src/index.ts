import { sessions } from '@sand/chats/contract'
import { type ClientMessage, createHandlers, hello, parseInput } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { helloSafe, pageLeft, pagesChange, type Server, server as serverService, uiFocus, uiWatch } from './contract'
import { inject } from './context'
import { createHello } from './requests/hello'
import { createRoutes } from './routes'
import { forwardEvents, type Send } from './socket/forward'
import { createSockets, eventFrame, everyone, type Socket } from './socket/sockets'
import { trimForPage } from './socket/trim'
import { createLiveTracker } from './stream/live'
import { createStream } from './stream/stream'
import { markSeen, serveThreads } from './threads'

export default definePlugin({
  name: 'server',
  inject,
  apply(ctx) {
    const routes = createRoutes(ctx.runtime)
    const handlers = createHandlers()
    const hellos = createHello(ctx)
    const live = createLiveTracker(ctx)

    const focus = async (socket: Socket, request: ClientMessage) => {
      const { session } = await parseInput(uiFocus, request.input)
      stream.focus(socket, session)
      const found = ctx.get(sessions)
      if (session && found) markSeen(found, session)
      return true
    }

    const watch = async (socket: Socket, request: ClientMessage) => {
      const { sessions } = await parseInput(uiWatch, request.input)
      stream.watch(socket, sessions)
      return true
    }

    const sockets = createSockets({
      leave(socket) {
        stream.forget(socket)
        ctx.emit(pageLeft, socket.data)
      },
      counted: pages => ctx.emit(pagesChange, pages),
      answer(socket, request) {
        if (request.type === uiFocus.id) return focus(socket, request)
        if (request.type === uiWatch.id) return watch(socket, request)
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
    ctx.watch(sessions, found => found && serveThreads(ctx, found, handlers, stream))

    const server: Server = {
      route: routes.route,
      handle: handlers.handle,
      broadcast: (event, payload) => send(event, payload),
      hello: hellos.register,
      pages: sockets.pages,
      ask: handlers.ask,
      tell: (caller, event, payload) => send(event, payload, socket => socket.data === caller),
    }
    ctx.provide(serverService, server)
    ctx.runtime.listening(`http://127.0.0.1:${listener.port}`)
    console.log(`runtime ${ctx.runtime.id} listening on 127.0.0.1:${listener.port}`)
  },
})
