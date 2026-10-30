import type { RouteCaller } from '@sand/host-gateway/contract'
import type { HelloField, WireHost } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'

export type RouteHandler = (request: Request, caller?: RouteCaller) => Response | Promise<Response>

export interface RouteOptions {
  public?: boolean
}

export interface HelloOptions {
  fresh?: boolean
}

export type HelloValue<T> = () => T | undefined | Promise<T | undefined>

export interface Server extends WireHost {
  route(path: string, handler: RouteHandler, options?: RouteOptions): Dispose
  hello<T>(field: HelloField<T>, value: HelloValue<T>, options?: HelloOptions): Dispose
}
