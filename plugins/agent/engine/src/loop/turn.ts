import type { Usage } from '@sand/accounts/contract'
import type { Message, StopReason, ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import type { Conversation, TurnInfo, TurnResult } from '../contract'
import type { PartialReply } from './partial'

export interface TurnRun<C extends Conversation> {
  info: TurnInfo
  conversation: C
  signal: AbortSignal
  partial: PartialReply
  usage: Usage
  reply: string
}

export interface StepDone {
  message: Message
  stopReason: StopReason
}

export interface TurnHooks {
  step(): Promise<StepDone>
  tools(calls: ToolCallBlock[]): Promise<void>
  answer(results: ToolResultBlock[]): void
  steer(): Promise<boolean>
  parked(): boolean
}

export interface Turn {
  signal: AbortSignal
  hooks: TurnHooks
}

export type TurnOutcome = Pick<TurnResult, 'stopReason'>
