import type { Block, Message, StopReason, Usage } from '@sand/messages'

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
  provider?: string
  summary?: string
  efforts: Effort[]
  defaultEffort?: Effort
  context?: number
  fast?: boolean
  via?: string
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
  | { type: 'done'; message: Message; stopReason: StopReason; usage: Usage }

export type LiveEvent = Exclude<LLMEvent, { type: 'block' | 'done' }> | { type: 'block'; index: number } | { type: 'done' }

export interface LimitWindow {
  id: string
  label: string
  used: number
  resetsAt?: number
  duration?: number
  status?: string
}

export interface Limits {
  provider?: string
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
  levels?(): EffortLevel[]
  stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent>
  provider?(model?: string): ProviderInfo
  limits?(): Limits | undefined
  refreshLimits?(): Promise<Limits | undefined>
  price?(model: string): ModelPrice | undefined
}
