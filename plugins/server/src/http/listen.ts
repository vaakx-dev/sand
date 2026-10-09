import type { RouteCaller, RuntimeAccess } from '@sand/protocol'
import type { Routes } from './routes'

export interface RespondOptions {
  access(request: Request): RuntimeAccess
  caller(request: Request): RouteCaller | undefined
  routes: Routes
}

export interface Upgrader {
  upgrade(request: Request, options: { data: undefined }): boolean
}

export const respond = ({ access, caller, routes }: RespondOptions) => (request: Request, server: Upgrader) => {
  const allowed = access(request)
  if (allowed === 'denied') return new Response('forbidden', { status: 403 })
  const url = new URL(request.url)
  if (url.pathname === '/ws') {
    if (allowed !== 'client') return new Response('unauthorized', { status: 401 })
    return server.upgrade(request, { data: undefined }) ? undefined : new Response('expected a websocket', { status: 400 })
  }
  const route = routes.find(url.pathname)
  if (!route) return new Response('not found', { status: 404 })
  if (!routes.isPublic(route) && allowed !== 'client') return new Response('unauthorized', { status: 401 })
  return route(request, caller(request))
}
