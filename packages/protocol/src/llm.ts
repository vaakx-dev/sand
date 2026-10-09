import type { Block, Message } from './message'

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

export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal' | (string & {})

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type LLMEvent =
  | { type: 'start'; model: string }
  | { type: 'text'; index: number; text: string }
  | { type: 'thinking'; index: number; text: string }
  | { type: 'tool_call'; index: number; id: string; name: string }
  | { type: 'tool_input'; index: number; json: string }
  | { type: 'block'; index: number; block: Block }
  | { type: 'done'; message: Message; stopReason: StopReason; usage: Usage }

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

export interface LLM {
  models?(): ModelInfo[]
  levels?(): EffortLevel[]
  stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent>
  provider?(model?: string): ProviderInfo
  limits?(): Limits | undefined
  refreshLimits?(): Promise<Limits | undefined>
  price?(model: string): ModelPrice | undefined
}
