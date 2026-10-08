import type { Context } from '../context/types'
import type { StandardSchemaV1 } from '../schema/standard'
import type { ServiceKey } from '../services/types'

export interface Plugin<C = undefined, I extends ServiceKey = never> {
  name: string
  description?: string
  inject?: readonly I[]
  uses?: Readonly<Record<string, string>>
  config?: StandardSchemaV1<unknown, C>
  apply(ctx: Context<I>, config: C): void | Promise<void>
}

export type AnyPlugin = Plugin<any, any>
