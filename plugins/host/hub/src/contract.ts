import { type Dispose, event, service, type StandardSchemaV1 } from 'drydock'
import { z } from 'zod'

declare const phantom: unique symbol

type InferInput<S extends StandardSchemaV1> = NonNullable<S['~standard']['types']>['input']

export type CallerKind = 'pc' | 'phone' | 'browser' | 'cli' | 'runtime'

export type RequestCallers = 'user' | 'pc' | 'runtime' | 'any'

export type RequestPlace = 'home' | 'thread'

export interface Request<I, O> {
  readonly kind: 'request'
  readonly id: string
  readonly input: StandardSchemaV1<I, unknown>
  readonly callers: RequestCallers
  readonly place: RequestPlace
  readonly [phantom]?: O
}

export interface RequestSpec<S extends StandardSchemaV1, O> {
  input: S
  output: O
  callers?: RequestCallers
  place?: RequestPlace
}

export interface WireEvent<P> {
  readonly kind: 'wireEvent'
  readonly id: string
  readonly [phantom]?: P
}

export interface HelloField<T> {
  readonly kind: 'helloField'
  readonly id: string
  readonly [phantom]?: T
}

export type InputOf<R> = R extends Request<infer I, any> ? I : never
export type OutputOf<R> = R extends Request<any, infer O> ? O : never
export type PayloadOf<E> = E extends WireEvent<infer P> ? P : never
export type ValueOf<F> = F extends HelloField<infer T> ? T : never

export const type = <T>() => undefined as unknown as T

export const request = <S extends StandardSchemaV1, O>(id: string, spec: RequestSpec<S, O>): Request<InferInput<S>, O> =>
  Object.freeze({ kind: 'request', id, input: spec.input, callers: spec.callers ?? 'user', place: spec.place ?? 'home' })

export const wireEvent = <P>(id: string): WireEvent<P> => Object.freeze({ kind: 'wireEvent', id })

export const helloField = <T>(id: string): HelloField<T> => Object.freeze({ kind: 'helloField', id })

export interface Caller {
  device: string
  kind: CallerKind
}

export type RequestHandler<I, O> = (input: I, caller: Caller) => O | Promise<O>

export interface WireHost {
  handle<I, O>(request: Request<I, O>, handler: RequestHandler<I, O>): Dispose
  broadcast<P>(event: WireEvent<P>, payload: P): void
}

export type HelloValues = Record<string, unknown>

export interface Hello {
  tag: string
  fresh: HelloValues
  shared?: HelloValues
}

export type ClientMessage = { type: string; id: number; input: unknown }

export type ServerMessage =
  | { type: 'result'; id: number; result?: unknown; error?: string }
  | { type: 'event'; name: string; payload: unknown }

export const hello = request('hello', {
  input: z.object({ since: z.string().nullable(), known: z.string().optional() }),
  output: type<Hello>(),
  callers: 'any',
})

export const helloActive = helloField<string[]>('active')

export interface HubSocket {
  send(data: string): number
  close(): void
  terminate(): void
}

export type HelloSource<T> = (caller: Caller, socket: HubSocket) => T | undefined

export interface Hub extends WireHost {
  open(socket: HubSocket, caller: Caller): void
  message(socket: HubSocket, raw: string): void
  close(socket: HubSocket): void
  disconnect(device: string): void
  devices(): string[]
  broadcast<P>(event: WireEvent<P>, payload: P, to?: RequestCallers): void
  answer(type: string, input: unknown, caller: Caller): Promise<unknown>
  tell<P>(caller: Caller, event: WireEvent<P>, payload: P): void
  onLeave(listener: (caller: Caller) => void): Dispose
  greet<T>(field: HelloField<T>, value: HelloSource<T>): Dispose
}

export const hub = service<Hub>('hub')

export const hubOpen = event<(device: string) => void>('hub.open')
