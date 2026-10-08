import type { AnyPlugin } from '../plugin/types'
import type { ServiceKey } from '../services/types'
import type { Source } from '../source/loader'

export type Status = 'pending' | 'starting' | 'active' | 'failed' | 'disposed'

export type Kind = 'root' | 'layer' | 'plugin'

export interface ScopeView {
  readonly id: number
  readonly name: string
  readonly kind: Kind
  readonly status: Status
  readonly error?: unknown
  readonly plugin?: AnyPlugin
  readonly source?: Source
  readonly parent?: ScopeView
  readonly children: ReadonlySet<ScopeView>
  missing(): ServiceKey[]
  quiet(): boolean
  idle(): Promise<void>
}

export interface Scope extends ScopeView {
  reload(): Promise<void>
  dispose(): Promise<void>
}
