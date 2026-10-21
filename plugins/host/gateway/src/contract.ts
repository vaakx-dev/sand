import type { PairInvite } from '@sand/host-devices/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service, type Dispose } from 'drydock'
import { z } from 'zod'

export type DeviceKind = 'pc' | 'phone' | 'browser'

export type RouteKind = 'local' | 'lan' | 'tailscale'

export interface RouteCaller {
  device: string
  name: string
  kind: DeviceKind | 'admin'
}

export interface ServerInfo {
  url: string
  urls: string[]
  pid: number
  key: string
}

export interface NetworkState {
  lan: boolean
  urls: string[]
}

export interface HostRoute {
  url: string
  kind: RouteKind
}

export interface HttpCall {
  request: Request
  url: URL
  device?: string
  admin: boolean
  address?: string
}

export interface HttpRoute {
  method: 'GET' | 'POST'
  handle(call: HttpCall): Response | Promise<Response>
}

export interface HostHttp {
  route(path: string, route: HttpRoute): Dispose
  urls(): string[]
}

export const hostHttp = service<HostHttp>('hostHttp')

export const pairCreate = request('pair.create', { input: z.object({}), output: type<PairInvite>() })
export const networkGet = request('network.get', { input: z.object({}), output: type<NetworkState>() })
export const networkSet = request('network.set', { input: z.object({ lan: z.boolean() }), output: type<NetworkState>() })
export const hostRoutes = request('host.routes', { input: z.object({}), output: type<HostRoute[]>() })

export const networkChange = wireEvent<NetworkState>('network.change')
export const routesChange = wireEvent<HostRoute[]>('routes.change')
