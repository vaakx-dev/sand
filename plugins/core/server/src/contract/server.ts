import type { RouteCaller } from '@sand/host-gateway/contract'
import type { Caller, HelloField, Request as WireRequest, WireHost } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'

export type RouteHandler = (request: Request, caller?: RouteCaller) => Response | Promise<Response>

export interface RouteOptions {
  public?: boolean
}

export interface HelloOptions {
  fresh?: boolean
}

export type HelloValue<T> = () => T | undefined

export interface Server extends WireHost {
  route(path: string, handler: RouteHandler, options?: RouteOptions): Dispose
  hello<T>(field: HelloField<T>, value: HelloValue<T>, options?: HelloOptions): Dispose
  pages(): number
  ask<I, O>(request: WireRequest<I, O>, input: I, caller: Caller): Promise<O>
}
