import type { CallerKind } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'

export interface RouteCaller {
  device: string
  name: string
  kind: CallerKind
}

export interface ServerInfo {
  url: string
  urls: string[]
  pid: number
}

export type ListenScope = 'local' | 'network'

export type AddressReach = 'loopback' | 'private' | 'tailscale' | 'public'

export interface HttpCall {
  request: Request
  url: URL
  caller?: RouteCaller
  address?: string
  reach: AddressReach
  local: boolean
}

export interface HttpRoute {
  method: 'GET' | 'POST'
  prefix?: boolean
  handle(call: HttpCall): Response | Promise<Response>
}

export interface HostHttp {
  route(path: string, route: HttpRoute): Dispose
  bind(scope: ListenScope): Promise<void>
  scope(): ListenScope
  port(): number
  addresses(): string[]
  urls(): string[]
}

export const hostHttp = service<HostHttp>('hostHttp')
