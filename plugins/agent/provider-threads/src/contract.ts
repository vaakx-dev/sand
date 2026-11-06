import type { Effort, LLMRequest, NativeRef, Speed, ToolSpec } from '@sand/accounts/contract'
import type { ChatKind, Message } from '@sand/chats/contract'
import type { Conversation, ConversationRef, Owner, Step, TurnInfo } from '@sand/engine/contract'
import { event, service, type Dispose } from 'drydock'

export type Segment = { entries: [from: string, to: string] } | { summary: string } | { handoff: string; to: string }

export type ThreadStatus = 'idle' | 'active' | 'uncertain' | 'retired'

export interface ProviderThreadInfo {
  id: string
  owner: Owner
  conversation: string
  source: string
  model: string
  generation: number
  native?: NativeRef
  status: ThreadStatus
  system: string
  seen: Segment[]
  effort?: Effort
  speed: Speed
  context: number
  used: number
  created: number
}

export type HandoffStrategy = 'full' | 'delta'

export type Transition =
  | { type: 'reuse' }
  | { type: 'reconfigure' }
  | { type: 'restart_and_resume' }
  | { type: 'handoff'; strategy: HandoffStrategy }
  | { type: 'reject'; reason: string }

export interface Brief {
  system(conversation: Conversation, model: string): Promise<string>
  tools(conversation: Conversation, messages: Message[]): ToolSpec[] | Promise<ToolSpec[]>
  kind?(conversation: Conversation): ChatKind
}

export interface ProviderThreads {
  brief(owner: Owner, brief: Brief): Dispose
  step(conversation: Conversation, turn: TurnInfo, signal: AbortSignal): Promise<Step>
  abandon(thread: string): void
  active(conversation: ConversationRef): ProviderThreadInfo | undefined
  view(conversation: Conversation): Promise<LLMRequest | undefined>
  release(conversation: ConversationRef): void
  forget(conversation: ConversationRef): void
}

export const providerThreads = service<ProviderThreads>('providerThreads')

export const stepPrepare = event<(request: LLMRequest, conversation: Conversation, turn: TurnInfo, signal: AbortSignal) => Promise<boolean | undefined>>(
  'step.prepare',
)
export const contextOverflow = event<(conversation: Conversation, turn: TurnInfo, error: unknown, signal: AbortSignal) => boolean | undefined>(
  'context.overflow',
)
