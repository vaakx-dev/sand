import type { TraceRecord } from '../events/bus'
import type { Kind, Status } from '../scope/view'

export interface ScopeNode {
  id: number
  name: string
  kind: Kind
  status: Status
  error?: string
  description?: string
  inject: string[]
  uses: Record<string, string>
  children: ScopeNode[]
}

export interface ServiceInfo {
  layer: number
  key: string
  provider: string
  active: boolean
}

export interface HookInfo {
  name: string
  handlers: { plugin: string; priority: number }[]
}

export interface Inspector {
  tree(): ScopeNode
  services(): ServiceInfo[]
  hooks(): HookInfo[]
  trace(): TraceRecord[]
}

declare module '../services/types' {
  interface Services {
    inspector: Inspector
  }
}
