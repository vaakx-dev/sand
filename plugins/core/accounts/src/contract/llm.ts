import type { Block, ChatKind, Message, StopReason } from '@sand/chats/contract'
import type { LiveEvent } from './live'
import type { AccountKind } from './login'
import type { Billing, Effort, LimitWindow, ModelInfo, ModelPrice, ProviderInfo, SourceRef } from './models'
import type { Usage } from './usage'

export interface ToolSpec {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  deferred?: { found: boolean }
}

export type Speed = 'normal' | 'fast'

export interface EffortLevel {
  id: Effort
  label: string
}

export type NewModels = 'show' | 'hide'

export interface ProviderCapabilities {
  native: boolean
  resume: boolean
  inject: boolean
  steer: boolean
  reconfigure: ('effort' | 'speed')[]
  processScope: 'thread' | 'shared'
  cacheTtlMs: number
}

export interface NativeRef {
  id: string
  cwd: string
  pc?: string
  tools?: string
}

export interface ThreadRef {
  id: string
  generation: number
  fresh: boolean
  seenHead: string | null
  cwd: string
  native?: NativeRef
}

export interface HandoffItem {
  role: 'user' | 'assistant'
  text: string
}

export interface HandoffBlock {
  id: string
  context: string
  items: HandoffItem[]
  text: string
}

export type Delivery = 'injected' | 'inline'

export interface SourceInfo {
  id: string
  kind: AccountKind
  label: string
  provider: string
  billing: Billing
  plan?: string
  via?: string
  pc?: string
  online?: boolean
  shown: number
  total: number
  fresh: number
  newModels: NewModels
  search: boolean
  slugs: boolean
  checked?: number
  error?: string
  caps?: ProviderCapabilities
}

export interface LLMRequest {
  system: string
  messages: Message[]
  tools: ToolSpec[]
  model?: string
  effort?: Effort
  speed?: Speed
  session?: string
  sessionKind?: ChatKind
  thread?: ThreadRef
  delta?: Message[]
  handoff?: HandoffBlock
}

export type LLMEvent =
  | Exclude<LiveEvent, { type: 'block' | 'done' }>
  | { type: 'block'; index: number; block: Block }
  | { type: 'done'; message: Message; stopReason: StopReason; usage: Usage; cacheTtlMs?: number; source?: SourceRef; native?: NativeRef; delivered?: Delivery }

export interface Limits {
  source: string
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
  caps?(model: string): ProviderCapabilities
  release?(thread: string): void
}
