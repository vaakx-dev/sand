import type { Args, EventName, Handler, HookOptions, Result } from '../events/types'
import type { AnyPlugin } from '../plugin/types'
import type { Scope, ScopeView } from '../scope/view'
import type { ServiceKey, Services } from '../services/types'

export type Dispose = () => void | Promise<void>

export interface ContextCore {
  readonly scope: ScopeView
  readonly hot: { data: Record<string, unknown> }
  provide<K extends ServiceKey>(key: K, impl: Services[K]): Dispose
  watch<K extends ServiceKey>(key: K, use: (impl: Services[K] | undefined) => Dispose | void): Dispose
  plugin(plugin: AnyPlugin, config?: unknown): Scope
  load(path: string, config?: unknown): Scope
  layer(): Context
  on<K extends EventName>(name: K, handler: Handler<K>, options?: HookOptions): Dispose
  emit<K extends EventName>(name: K, ...args: Args<K>): void
  waterfall<K extends EventName>(name: K, ...args: Args<K>): Promise<Result<K>>
  bail<K extends EventName>(name: K, ...args: Args<K>): Promise<Result<K> | undefined>
  effect(setup: () => Dispose | void): Dispose
  busy(): Dispose
  report(error: unknown): void
  scopes(): ScopeView[]
  reload(target?: ScopeView): Promise<void>
  settled(): Promise<void>
  dispose(): Promise<void>
}

type Free<Taken extends never> = Taken

export type ServiceNamesAvoidCore = Free<Extract<ServiceKey, keyof ContextCore>>

export type Context<I extends ServiceKey = never> = ContextCore & {
  readonly [K in I]: Services[K]
} & {
  readonly [K in Exclude<ServiceKey, I>]?: Services[K]
}
