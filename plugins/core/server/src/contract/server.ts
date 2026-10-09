import type { RequestHandler, RouteCaller, WireEventName, WireEvents, WireHandler, WireRequestType } from '@sand/protocol'
import type { Dispose } from 'drydock'

export type RouteHandler = (request: Request, caller?: RouteCaller) => Response | Promise<Response>

export interface RouteOptions {
  public?: boolean
}

export interface Server {
  route(path: string, handler: RouteHandler, options?: RouteOptions): Dispose
  handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
  handle(type: string, handler: RequestHandler): Dispose
  broadcast<K extends WireEventName>(name: K, args: WireEvents[K]): void
}
