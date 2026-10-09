import type { Effort, LLM, LLMRequest, Speed } from '@sand/llm-accounts/contract'
import type { Entry, Message, Prompt, StopReason, ToolCallBlock, ToolResultBlock, Usage, UserContent } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Tools } from '@sand/tools/contract'
import type { Dispose } from 'drydock'
import type { TurnResult } from './turn'

export interface LoopInfo {
  name: string
  label: string
  description: string
  plugin?: string
  quarantined?: string
}

export interface Turn {
  session: Session
  user: Message
  signal: AbortSignal
  hooks: TurnHooks
}

export interface StreamDone {
  message: Message
  usage: Usage
  stopReason: StopReason
}

export interface TurnHooks {
  build(): Promise<LLMRequest>
  stream(request: LLMRequest): Promise<StreamDone>
  send(): Promise<StreamDone>
  respond(message: Message): Promise<Message>
  tools(calls: ToolCallBlock[]): Promise<ToolResultBlock[]>
  inbox(): Promise<UserContent[]>
  stop(outcome: TurnOutcome): Promise<UserContent[] | undefined>
  overflow(error: unknown): Promise<boolean>
  append(message: Message): Entry
}

export interface TurnOutcome {
  stopReason: TurnResult['stopReason']
  text: string
}

export interface LoopImpl extends LoopInfo {
  run(turn: Turn): Promise<TurnOutcome>
}

export interface RunOverrides {
  signal?: AbortSignal
  llm?: LLM
  tools?: Tools
}

export interface LoopChoice {
  name: string | null
  reason?: string
}

export interface LoopState {
  name: string
  label: string
  chosen: string | null
  fallback?: string
}

export interface Loops {
  register(loop: LoopImpl): Dispose
  list(): LoopInfo[]
  get(name: string): LoopImpl | undefined
  state(session: Session): LoopState
  choose(session: Session, name: string | null, reason?: string): void
  defaultName(): string
  setDefault(name: string): Promise<void>
  runWith(loop: LoopImpl, session: Session, prompt: Prompt, overrides?: RunOverrides): Promise<TurnResult>
}

export interface ModelChoice {
  model?: string
  effort?: Effort
  speed?: Speed
}

export interface ToolAsk {
  action: 'ask'
  question?: string
  reason?: string
}

export type ToolDecision =
  | { action: 'allow'; reason?: string }
  | { action: 'deny'; reason: string }
  | ToolAsk
  | { action: 'rewrite'; input: unknown; reason?: string }
