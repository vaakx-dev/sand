import type { ScopeView } from '../scope/view'

export interface Events {
  'drydock.status': (scope: ScopeView) => void
  'drydock.error': (scope: ScopeView, error: unknown) => void
}

export type EventName = keyof Events & string

type Fn<K extends EventName> = Events[K] extends (...args: any[]) => any ? Events[K] : never

export type Args<K extends EventName> = Parameters<Fn<K>>

export type Result<K extends EventName> = Awaited<ReturnType<Fn<K>>>

export type Handler<K extends EventName> = (...args: Args<K>) => Result<K> | void | Promise<Result<K> | void>

export interface HookOptions {
  priority?: number
  before?: string[]
  after?: string[]
}
