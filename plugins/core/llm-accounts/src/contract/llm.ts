import type { Block, Message, StopReason, Usage } from '@sand/messages'
import type { Billing, Effort, LimitWindow, LiveEvent, ModelInfo, ModelPrice, ProviderInfo, SourceRef } from '@sand/protocol'
import type { AccountKind } from './login'

export type { Billing, Effort, LimitWindow, LiveBlock, LiveEvent, ModelInfo, ModelPrice, ProviderInfo, SourceRef } from '@sand/protocol'

export interface ToolSpec {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export type Speed = 'normal' | 'fast'

export interface EffortLevel {
  id: Effort
  label: string
}

export type NewModels = 'show' | 'hide'

export interface SourceInfo {
  id: string
  kind: AccountKind
  label: string
  provider: string
  billing: Billing
  plan?: string
  via?: string
  online?: boolean
  shown: number
  total: number
  fresh: number
  newModels: NewModels
  search: boolean
  slugs: boolean
  checked?: number
  error?: string
}

export interface LLMRequest {
  system: string
  messages: Message[]
  tools: ToolSpec[]
  model?: string
  effort?: Effort
  speed?: Speed
}

export type LLMEvent =
  | Exclude<LiveEvent, { type: 'block' | 'done' }>
  | { type: 'block'; index: number; block: Block }
  | { type: 'done'; message: Message; stopReason: StopReason; usage: Usage; source?: SourceRef }

export interface Limits {
  source?: string
  pc?: string
  pcName?: string
  windows: LimitWindow[]
  status?: string
  updated: number
}

export interface LLM {
  models?(): ModelInfo[]
  find?(id: string): ModelInfo | undefined
  sources?(): SourceInfo[]
  levels?(): EffortLevel[]
  stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent>
  provider?(model?: string): ProviderInfo
  limits?(): Limits | undefined
  sourceLimits?(): Limits[]
  refreshLimits?(): Promise<Limits | undefined>
  price?(model: string): ModelPrice | undefined
}
