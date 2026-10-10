import type { Block, Message, StopReason, Usage } from '@sand/messages'
import type { AccountKind } from './login'

export interface ToolSpec {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type Speed = 'normal' | 'fast'

export interface EffortLevel {
  id: Effort
  label: string
}

export interface ModelInfo {
  id: string
  label: string
  source?: string
  name?: string
  provider?: string
  summary?: string
  efforts: Effort[]
  defaultEffort?: Effort
  context?: number
  fast?: boolean
  images?: boolean
  via?: string
  hidden?: boolean
  favourite?: number
  fresh?: boolean
  added?: boolean
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
  | { type: 'start'; model: string }
  | { type: 'text'; index: number; text: string }
  | { type: 'thinking'; index: number; text: string }
  | { type: 'tool_call'; index: number; id: string; name: string }
  | { type: 'tool_input'; index: number; json: string }
  | { type: 'block'; index: number; block: Block }
  | { type: 'done'; message: Message; stopReason: StopReason; usage: Usage; source?: SourceRef }

export interface SourceRef {
  source: string
  label: string
  provider: string
  billing: Billing
  plan?: string
  pc?: string
  pcName?: string
}

export interface LimitWindow {
  id: string
  label: string
  used: number
  resetsAt?: number
  duration?: number
  status?: string
}

export interface Limits {
  source?: string
  pc?: string
  pcName?: string
  windows: LimitWindow[]
  status?: string
  updated: number
}

export type ModelPrice = Record<keyof Usage, number>

export type Billing = 'plan' | 'api' | 'credits' | 'local'

export interface ProviderInfo {
  id: string
  label: string
  billing: Billing
  plan?: string
}

export type LiveBlock =
  | { type: 'text' | 'thinking'; index: number; text: string; done?: boolean }
  | { type: 'tool'; index: number; id: string; name: string; input: string }

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
