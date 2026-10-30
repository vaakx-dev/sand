import { errorMessage } from '@sand/util'
import { textReply } from '@sand/util/host'
import type { RouteCaller } from '../contract'
import { sourceOf } from '../listener/reach'
import type { Proxy } from '../proxy'
import { preflight, withCors } from './cors'
import type { Peer, Reply } from './peer'
import type { HttpRegistry } from './registry'
import type { Route } from './routes'

interface ResponderOptions {
  routes: Map<string, Route>
  registry: Pick<HttpRegistry, 'get'>
  caller(request: Request): RouteCaller | undefined
  proxy: Proxy
}

type Allowed = Pick<Route, 'method'>

const allows = (route: Allowed, method: string) => method === route.method || (route.method === 'GET' && method === 'HEAD')

const notAllowed = (routes: Allowed[]) => textReply('method not allowed', 405, { allow: [...routes.map(route => route.method), 'OPTIONS'].join(', ') })

const refused = () => textReply('sand only answers devices on your own networks', 403)

const failed = (error: unknown) => {
  console.error(`gateway request failed: ${errorMessage(error)}`)
  return textReply('sand could not answer this request', 500)
}

export const createResponder = ({ routes, registry, caller, proxy }: ResponderOptions) => {
  const respond = (request: Request, peer: Peer): Reply => {
    const source = sourceOf(request, peer.address)
    if (source.reach === 'public') return refused()
    if (request.method === 'OPTIONS') return preflight()
    const url = new URL(request.url)
    const route = routes.get(url.pathname)
    if (route) return allows(route, request.method) ? route.handle(request, { ...peer, source }) : notAllowed([route])
    const registered = registry.get(url.pathname)
    if (!registered) return proxy(request, caller(request))
    const match = registered.find(candidate => allows(candidate, request.method))
    if (!match) return notAllowed(registered)
    return match.handle({ request, url, caller: caller(request), ...source })
  }

  return (request: Request, peer: Peer): Reply => {
    try {
      const reply = respond(request, peer)
      if (reply instanceof Promise) return reply.catch(failed).then(withCors)
      return reply && withCors(reply)
    } catch (error) {
      return withCors(failed(error))
    }
  }
}

export type Respond = ReturnType<typeof createResponder>
