import type { Dispose } from 'drydock'
import type { DeviceKind } from './devices'
import type { WireEventName, WireEvents, WireRequestOf, WireRequestType } from './wire'

export interface RouteCaller {
  device: string
  name: string
  kind: DeviceKind | 'admin'
}

export type RouteHandler = (request: Request, caller?: RouteCaller) => Response | Promise<Response>

export interface RouteOptions {
  public?: boolean
}

export type RequestHandler = (request: { type: string } & Record<string, unknown>) => unknown

export type WireHandler<K extends WireRequestType> = (request: WireRequestOf<K>) => unknown

export interface ServerInfo {
  url: string
  urls: string[]
  pid: number
  key: string
}

export interface Server {
  route(path: string, handler: RouteHandler, options?: RouteOptions): Dispose
  handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
  handle(type: string, handler: RequestHandler): Dispose
  broadcast<K extends WireEventName>(name: K, args: WireEvents[K]): void
}
