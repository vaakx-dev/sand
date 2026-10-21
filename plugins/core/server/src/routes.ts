import type { Caller } from '@sand/host-hub/contract'
import type { Runtime } from '@sand/host-runtimes/contract'
import { deviceOf } from '@sand/util/boot'
import type { RouteHandler, RouteOptions } from './contract'

interface Route {
  handler: RouteHandler
  public?: boolean
}

const upgrade = (request: Request, server: Bun.Server<Caller>) => {
  const device = deviceOf(new URL(request.url))
  if (!device) return new Response('the socket has no device', { status: 400 })
  return server.upgrade(request, { data: { device } }) ? undefined : new Response('expected a websocket', { status: 400 })
}

export const createRoutes = (runtime: Runtime) => {
  const routes = new Map<string, Route>()

  const route = (path: string, handler: RouteHandler, options?: RouteOptions) => {
    const entry = { handler, public: options?.public }
    routes.set(path, entry)
    return () => {
      if (routes.get(path) === entry) routes.delete(path)
    }
  }

  const respond = (request: Request, server: Bun.Server<Caller>) => {
    const access = runtime.access(request)
    if (access === 'denied') return new Response('forbidden', { status: 403 })
    const url = new URL(request.url)
    if (url.pathname === '/ws') return access === 'client' ? upgrade(request, server) : new Response('unauthorized', { status: 401 })
    const found = routes.get(url.pathname)
    if (!found) return new Response('not found', { status: 404 })
    if (!found.public && access !== 'client') return new Response('unauthorized', { status: 401 })
    return found.handler(request, runtime.caller(request))
  }

  return { route, respond }
}
