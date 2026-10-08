import type { WebSocketHandler } from 'bun'
import type { createPairing } from './pairing'
import type { Routes } from './routes'

export interface ListenOptions {
  token: string
  routes: Routes
  pairing: ReturnType<typeof createPairing>
  websocket: WebSocketHandler<unknown>
}

export const listener = ({ token, routes, pairing, websocket }: ListenOptions) => (hostname: string, port: number) =>
  Bun.serve({
    port,
    hostname,
    websocket,
    fetch(request, server) {
      const url = new URL(request.url)
      const paired = pairing.redeem(url)
      if (paired) return paired
      const route = routes.find(url.pathname)
      if (route && routes.isPublic(route)) return route(request)
      if (url.searchParams.get('token') !== token) return new Response('unauthorized', { status: 401 })
      if (url.pathname === '/ws') return server.upgrade(request, { data: undefined }) ? undefined : new Response('expected a websocket', { status: 400 })
      return route ? route(request) : new Response('not found', { status: 404 })
    },
  })
