import type { HostDevices } from '@sand/host-devices/contract'
import { errorMessage } from '@sand/kit'
import type { RouteCaller } from '@sand/protocol'
import { adminDevice, createCaller } from '../auth/caller'
import type { Proxy } from '../proxy'
import { preflight, withCors } from './cors'
import type { HttpRegistry } from './extra'
import { text } from './reply'
import { createRoutes, type Peer, type Reply, type Route, type RoutesOptions } from './routes'

export interface ResponderOptions extends Omit<RoutesOptions, 'caller' | 'devices'> {
  devices: Pick<HostDevices, 'verify' | 'get' | 'redeem' | 'remove'>
  admin: string
  proxy: Proxy
  extra: Pick<HttpRegistry, 'get'>
}

type Allowed = Pick<Route, 'method'>

const allows = (route: Allowed, method: string) => method === route.method || (route.method === 'GET' && method === 'HEAD')

const notAllowed = (route: Allowed) => text('method not allowed', 405, { allow: `${route.method}, OPTIONS` })

const failed = (error: unknown) => {
  console.error(`gateway request failed: ${errorMessage(error)}`)
  return text('sand could not answer this request', 500)
}

export const createResponder = (options: ResponderOptions) => {
  const caller = createCaller(options.admin, options.devices)
  const routes = createRoutes({ ...options, caller })

  const routeCaller = (device: string | undefined): RouteCaller | undefined => {
    if (!device) return
    if (device === adminDevice) return { device, name: 'sand', kind: 'admin' }
    const paired = options.devices.get(device)
    return paired && { device, name: paired.name, kind: paired.kind }
  }

  const respond = (request: Request, peer: Peer): Reply => {
    if (request.method === 'OPTIONS') return preflight()
    const url = new URL(request.url)
    const route = routes.get(url.pathname)
    if (route) return allows(route, request.method) ? route.handle(request, peer) : notAllowed(route)
    const extra = options.extra.get(url.pathname)
    if (!extra) return options.proxy(request, routeCaller(caller(request, peer.address)))
    if (!allows(extra, request.method)) return notAllowed(extra)
    const device = caller(request, peer.address)
    return extra.handle({ request, url, device, admin: device === adminDevice, address: peer.address })
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
