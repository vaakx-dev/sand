import type { BuildInfo } from '@sand/protocol'
import type { Dispose } from 'drydock'

export interface Ticket {
  ticket: string
  expires: number
}

export interface NetworkState {
  lan: boolean
  urls: string[]
}

export type RouteKind = 'local' | 'lan' | 'tailscale'

export interface HostRoute {
  url: string
  kind: RouteKind
}

export interface HostIdentity {
  deviceId: string
  name: string
  version: string
  build?: BuildInfo
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

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'pair.create': {}
    'network.get': {}
    'network.set': { lan: boolean }
    'host.routes': {}
  }

  interface WireEvents {
    'network.change': [network: NetworkState]
    'routes.change': [routes: HostRoute[]]
  }
}

declare module 'drydock' {
  interface Services {
    hostHttp: HostHttp
  }
}
