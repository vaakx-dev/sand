import type { Events } from 'drydock'
import type {} from '@sand/loops/contract'

export type HookName =
  | 'turn.prompt'
  | 'turn.start'
  | 'model.choose'
  | 'context.build'
  | 'llm.response'
  | 'tool.before'
  | 'tool.result'
  | 'turn.stop'
  | 'context.overflow'
  | 'turn.end'

export interface HookOptions {
  priority?: number
  timeout?: number
  before?: string[]
  after?: string[]
}

export type Hook = <K extends HookName>(name: K, handler: Events[K], options?: HookOptions) => void

export type HookFile = (hook: Hook) => void | Promise<void>

export type HookScope = 'home' | 'project'

export type HookOutcome = 'changed' | 'decided' | 'allowed' | 'denied' | 'asked' | 'rewritten' | 'skipped' | 'failed'

export interface HookRecord {
  hook: HookName
  source: string
  outcome: HookOutcome
  detail?: string
  ms: number
}

export interface HookTrace {
  turn: string | null
  records: HookRecord[]
}

export type HookFileStatus = 'active' | 'untrusted' | 'failed' | 'off'

export interface HookFileState {
  path: string
  scope: HookScope
  folder: string
  status: HookFileStatus
  error?: string
  hooks: { name: HookName; off?: string }[]
}

export interface Hooks {
  files(): HookFileState[]
  trusted(folder: string): boolean
}

declare module 'drydock' {
  interface Services {
    hooks: Hooks
  }
}
