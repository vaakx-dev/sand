import type { Dispose } from 'drydock'
import type { WireEventName, WireEvents, WireRequestOf, WireRequestType } from './wire'

export type RouteHandler = (request: Request) => Response | Promise<Response>

export interface RouteOptions {
  public?: boolean
}

export type RequestHandler = (request: { type: string } & Record<string, unknown>) => unknown

export type WireHandler<K extends WireRequestType> = (request: WireRequestOf<K>) => unknown

export interface ServerInfo {
  url: string
  urls: string[]
  token: string
  pid: number
}

export interface Pairing {
  code: string
  ttl: number
}

export interface Server {
  url: string
  urls: string[]
  token: string
  route(path: string, handler: RouteHandler, options?: RouteOptions): Dispose
  handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
  handle(type: string, handler: RequestHandler): Dispose
  broadcast<K extends WireEventName>(name: K, args: WireEvents[K]): void
}
