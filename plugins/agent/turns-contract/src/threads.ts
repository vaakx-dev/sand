import type { Delivery, Effort, LLMRequest, NativeRef, Speed, ToolSpec, Usage } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { event, service } from 'drydock'
import type { TurnInfo } from './contract'

export type Segment = { entries: [from: string, to: string] } | { summary: string }

export type ThreadStatus = 'idle' | 'active' | 'uncertain' | 'retired'

export interface ProviderThreadInfo {
  id: string
  session: string
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

export interface StepPlan {
  request: LLMRequest & { model: string }
  thread: ProviderThreadInfo
  transition: Transition
  seen: Segment[]
  handoff?: string
}

export interface StepDone {
  native?: NativeRef
  delivered?: Delivery
  usage: Usage
  reply: string
}

export interface ProviderThreads {
  prepare(session: Session, turn: TurnInfo, signal: AbortSignal): Promise<StepPlan>
  settle(plan: StepPlan, done: StepDone): void
  lost(plan: StepPlan, error: unknown): boolean
  active(session: Session): ProviderThreadInfo | undefined
  view(session: Session): Promise<LLMRequest | undefined>
}

export const providerThreads = service<ProviderThreads>('providerThreads')

export const stepTools = event<(tools: ToolSpec[], session: Session) => ToolSpec[] | Promise<ToolSpec[]>>('step.tools')
export const stepPrepare = event<(request: LLMRequest, session: Session, signal: AbortSignal) => Promise<boolean | undefined>>('step.prepare')
